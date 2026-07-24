import crypto from 'node:crypto';

import { NotificationType as PrismaNotificationType, PaymentProvider, Prisma, type PrismaClient, WalletTransactionCategory, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { deleteCache, getCachedJson, setCachedJson } from '../../lib/cache.js';
import { verifyMonnifyWebhookSignature } from '../../lib/monnify.js';
import { verifySquadWebhookSignature } from '../../lib/squad.js';
import { PaymentProviderService } from '../payment/payment.service.js';
import { emitToUser } from '../../lib/realtime.js';
import { listServices, listVariations, payUtility, validateBillersCode } from '../../lib/vtpass.js';
import { addNotificationJob } from '../../queues/index.js';
import { NotFoundError, PaymentError, UnauthorizedError, ValidationError } from '../../utils/errors.js';
import { cleanText } from '../../utils/sanitize.js';

const PLATFORM_WALLET_ID = '00000000-0000-0000-0000-000000000001';

function normalizePin(pin: string) {
  return pin.trim();
}

function assertPinFormat(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new ValidationError('Transfer PIN must be 4 to 6 digits');
  }
}

function normalizeNigerianPhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  return trimmed;
}


function assertNigerianPhone(phone: string) {
  const normalized = normalizeNigerianPhone(phone);
  if (!/^\+234[789]\d{9}$/.test(normalized)) {
    throw new ValidationError('Enter a valid Nigerian phone number');
  }
  return normalized;
}

function resolveNigerianNetwork(phone: string) {
  const normalized = assertNigerianPhone(phone);
  const localPrefix = `0${normalized.slice(4, 7)}`;
  const networks: Record<string, string> = {
    '0701': 'Airtel', '0702': 'Airtel', '0703': 'MTN', '0704': 'MTN', '0705': 'Glo', '0706': 'MTN', '0707': 'Glo', '0708': 'Airtel', '0709': '9mobile',
    '0802': 'Airtel', '0803': 'MTN', '0804': 'MTN', '0805': 'Glo', '0806': 'MTN', '0807': 'Glo', '0808': 'Airtel', '0809': '9mobile',
    '0810': 'MTN', '0811': 'Glo', '0812': 'Airtel', '0813': 'MTN', '0814': 'MTN', '0815': 'Glo', '0816': 'MTN', '0817': '9mobile', '0818': '9mobile',
    '0901': 'Airtel', '0902': 'Airtel', '0903': 'MTN', '0904': 'Airtel', '0905': 'Glo', '0906': 'MTN', '0907': 'Airtel', '0908': '9mobile', '0909': '9mobile',
    '0912': 'Airtel', '0913': 'MTN', '0915': 'Glo', '0916': 'MTN', '0917': '9mobile', '0918': '9mobile',
  };

  return { normalized, network: networks[localPrefix] ?? null };
}

function isKycComplete(user: {
  dateOfBirth: Date | null;
  address: string | null;
  kycMethod: 'NIN' | 'BVN' | null;
  ninVerified: boolean;
  bvnVerified: boolean;
}) {
  if (!user.dateOfBirth || !user.address || !user.kycMethod) return false;
  return user.kycMethod === 'BVN' ? user.bvnVerified : user.ninVerified;
}

export class WalletService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger,
    private readonly app: FastifyInstance,
  ) {}

  private getClient(client?: PrismaClient | Prisma.TransactionClient) {
    return client ?? this.prisma;
  }

  private paymentProviders() {
    return new PaymentProviderService(this.prisma);
  }

  private async enforceTransferLimit(trx: any, walletId: string, userId: string, amount: number) {
    const user = await trx.user.findUnique({ where: { id: userId } });
    const wallet = await trx.wallet.findUnique({ where: { id: walletId } });

    if (!user || !wallet) throw new PaymentError('User or wallet not found');

    const isTier3 = user.bvnVerified && user.ninVerified;
    const isTier2 = user.bvnVerified || user.ninVerified;
    const dailyLimit = isTier3 ? 5000000 : (isTier2 ? 200000 : 50000);

    const now = new Date();
    
    let currentUsage = Number(wallet.dailyTransferUsage ?? 0);
    const lastDate = wallet.lastTransferDate;

    if (!lastDate || lastDate.getUTCFullYear() !== now.getUTCFullYear() || lastDate.getUTCMonth() !== now.getUTCMonth() || lastDate.getUTCDate() !== now.getUTCDate()) {
      currentUsage = 0;
    }

    if (currentUsage + amount > dailyLimit) {
      throw new PaymentError(`Daily transfer limit of ₦${(dailyLimit).toLocaleString()} exceeded. Remaining: ₦${(Math.max(0, dailyLimit - currentUsage)).toLocaleString()}`);
    }

    await trx.wallet.update({
      where: { id: wallet.id },
      data: {
        dailyTransferUsage: currentUsage + amount,
        lastTransferDate: now,
      }
    });
  }

  private async createNotification(
    userId: string,
    type: PrismaNotificationType,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as Prisma.InputJsonValue,
        read: false,
      },
    });
  }

  private async ensurePlatformWallet(trx: Prisma.TransactionClient) {
    const platformUserId = '00000000-0000-0000-0000-000000000000';
    const platformWalletId = '00000000-0000-0000-0000-000000000001';

    let systemUser = await trx.user.findUnique({ where: { id: platformUserId } });
    if (!systemUser) {
      systemUser = await trx.user.create({
        data: {
          id: platformUserId,
          email: 'system@percel.app',
          phone: '+2348000000009',
          passwordHash: '$2a$12$systemuserpasswordplaceholderhashed',
          fullName: 'Percel System Platform',
        },
      });
    }

    let platformWallet = await trx.wallet.findUnique({ where: { id: platformWalletId } });
    if (!platformWallet) {
      platformWallet = await trx.wallet.create({
        data: {
          id: platformWalletId,
          userId: platformUserId,
          balance: 9999999999.99,
          ledgerBalance: 9999999999.99,
        },
      });
    }
  }

  private async ensureDepositAccount(
    wallet: { id: string; nuban: string | null; bankName: string | null; bankCode: string | null; paymentProvider?: PaymentProvider | null },
    user: { id: string; email: string; fullName: string; phone: string; paystackCustomerCode?: string | null; dateOfBirth: Date | null; address: string | null; ninNumber?: string | null; bvnNumber?: string | null; ninVerified: boolean; bvnVerified: boolean; kycMethod: 'NIN' | 'BVN' | null },
  ) {
    const kycComplete = isKycComplete(user);
    const providers = this.paymentProviders();
    const provider = await providers.getActiveProvider();
    if (!kycComplete) return { ...wallet, kycComplete, paymentProvider: provider };
    if (wallet.nuban && wallet.bankName && wallet.paymentProvider === provider) return { ...wallet, kycComplete };

    const account = await providers.createVirtualAccountWithFallback(provider, {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      bvn: user.bvnVerified ? user.bvnNumber : null,
      nin: user.ninVerified ? user.ninNumber : null,
      providerCustomerCode: user.paystackCustomerCode,
    });
    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        nuban: account.accountNumber,
        bankName: account.bankName,
        bankCode: account.bankCode,
        paymentProvider: account.provider,
      },
    });
    return { ...updatedWallet, kycComplete };

  }
  async getWallet(userId: string) {
    const [wallet, user, profile] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: { userId },
        include: {
          transactions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { walletPinHash: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true, phone: true, paystackCustomerCode: true, dateOfBirth: true, address: true, ninNumber: true, bvnNumber: true, ninVerified: true, bvnVerified: true, kycMethod: true } }),
    ]);

    if (!wallet) throw new NotFoundError('Wallet not found');
    const depositAccount = await this.ensureDepositAccount(wallet, profile ?? { id: userId, email: '', fullName: 'Percel User', phone: '', paystackCustomerCode: null, dateOfBirth: null, address: null, ninNumber: null, bvnNumber: null, ninVerified: false, bvnVerified: false, kycMethod: null });
    
    const isTier3 = profile?.bvnVerified && profile?.ninVerified;
    const isTier2 = profile?.bvnVerified || profile?.ninVerified;
    const dailyLimit = isTier3 ? 5000000 : (isTier2 ? 200000 : 50000);

    const now = new Date();
    let currentUsage = Number(wallet.dailyTransferUsage ?? 0);
    const lastDate = wallet.lastTransferDate;

    if (!lastDate || lastDate.getUTCFullYear() !== now.getUTCFullYear() || lastDate.getUTCMonth() !== now.getUTCMonth() || lastDate.getUTCDate() !== now.getUTCDate()) {
      currentUsage = 0;
    }
    
    return {
      ...wallet,
      ...depositAccount,
      dailyTransferUsage: currentUsage,
      dailyLimit,
      walletPinSet: Boolean(user?.walletPinHash),
    };
  }

  async getTransactions(walletId: string, query: { page?: number; limit?: number; category?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.WalletTransactionWhereInput = {
      walletId,
      ...(query.category ? { category: query.category as WalletTransactionCategory } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBalance(walletId: string) {
    const cacheKey = `cache:wallet:balance:${walletId}`;
    const cached = await getCachedJson<{ realBalance: number; ledgerBalance: number }>(this.app.redis, cacheKey);
    if (cached) return cached;

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { balance: true, ledgerBalance: true },
    });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const result = {
      realBalance: Number(wallet.balance ?? 0),
      ledgerBalance: Number(wallet.ledgerBalance ?? wallet.balance ?? 0),
    };
    await setCachedJson(this.app.redis, cacheKey, result, 10);
    return result;
  }

  async initializeTopUp(userId: string, amount: number, callbackUrl?: string) {
    if (amount < 100 || amount > 1000000) throw new ValidationError('Amount out of allowed range');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!user || !wallet) throw new NotFoundError('User wallet not found');

    const reference = `TOPUP_${Date.now()}_${userId.slice(0, 6)}`;

    const providers = this.paymentProviders();
    const provider = await providers.getActiveProvider();
    const init = await providers.initializeTopUp(provider, {
      email: user.email,
      amount,
      amountKobo: Math.round(amount * 100),
      reference,
      customerName: user.fullName,
      metadata: { userId, walletId: wallet.id, provider },
      callbackUrl,
    });

    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: WalletTransactionType.CREDIT,
        category: WalletTransactionCategory.TOP_UP,
        status: WalletTransactionStatus.PENDING,
        reference,
        paystackReference: reference,
        description: 'Wallet top up initialization',
        metadata: { gateway: provider.toLowerCase(), authorizationUrl: init.authorization_url },
        balanceBefore: 0,
        balanceAfter: 0,
      },
    });

    this.logger.info({ userId, amount, reference, category: 'TOP_UP', result: 'initialized' }, 'wallet.topup.init');

    return { authorizationUrl: init.authorization_url, reference: init.reference };
  }

  async setTransferPin(userId: string, newPin: string, currentPin?: string) {
    const normalizedNewPin = normalizePin(newPin);
    assertPinFormat(normalizedNewPin);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { walletPinHash: true } });
    if (!user) throw new NotFoundError('User not found');

    if (user.walletPinHash) {
      if (!currentPin) throw new ValidationError('Current transfer PIN is required');
      const normalizedCurrentPin = normalizePin(currentPin);
      assertPinFormat(normalizedCurrentPin);
      const matches = await bcrypt.compare(normalizedCurrentPin, user.walletPinHash);
      if (!matches) throw new UnauthorizedError('Invalid transfer PIN');
    }

    const walletPinHash = await bcrypt.hash(normalizedNewPin, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { walletPinHash },
    });

    return { updated: true };
  }

  async resetTransferPin(userId: string, currentPin: string) {
    const normalizedCurrentPin = normalizePin(currentPin);
    assertPinFormat(normalizedCurrentPin);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { walletPinHash: true } });
    if (!user) throw new NotFoundError('User not found');
    if (!user.walletPinHash) throw new ValidationError('No transfer PIN is set');

    const matches = await bcrypt.compare(normalizedCurrentPin, user.walletPinHash);
    if (!matches) throw new UnauthorizedError('Invalid transfer PIN');

    await this.prisma.user.update({
      where: { id: userId },
      data: { walletPinHash: null },
    });

    return { updated: true };
  }

  async verifyTransferPin(userId: string, pin: string) {
    const normalizedPin = normalizePin(pin);
    assertPinFormat(normalizedPin);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { walletPinHash: true } });
    if (!user) throw new NotFoundError('User not found');
    if (!user.walletPinHash) throw new ValidationError('No transfer PIN is set');

    const matches = await bcrypt.compare(normalizedPin, user.walletPinHash);
    if (!matches) throw new UnauthorizedError('Invalid transfer PIN');

    return { verified: true };
  }

  private async createDedicatedVirtualAccount(customerCode: string) {
    const customer = await this.prisma.user.findUnique({
      where: { paystackCustomerCode: customerCode },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        bvnNumber: true,
        ninNumber: true,
        wallet: { select: { id: true, nuban: true, bankName: true, bankCode: true, paymentProvider: true } }
      },
    });

    const wallet = customer?.wallet;
    if (!wallet) return;

    const providers = this.paymentProviders();
    const provider = await providers.getActiveProvider();

    if (wallet.nuban && wallet.bankName && wallet.paymentProvider === provider) {
      await this.prisma.user.update({ where: { id: customer.id }, data: { status: 'ACTIVE', bvnVerified: true } });
      return;
    }

    const account = await providers.createVirtualAccountWithFallback(provider, {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      phone: customer.phone,
      bvn: customer.bvnNumber,
      nin: customer.ninNumber,
      providerCustomerCode: customerCode,
    });
    const bankName = account.bankName;
    const bankCode = account.bankCode ?? null;

    await this.prisma.$transaction(async (trx) => {
      await trx.wallet.update({
        where: { id: wallet.id },
        data: {
          nuban: account.accountNumber,
          bankName,
          bankCode,
          paymentProvider: account.provider,
        },
      });

      await trx.user.update({
        where: { id: customer.id },
        data: { status: 'ACTIVE', bvnVerified: true },
      });
    });

    await deleteCache(this.app.redis, 'cache:wallet:balance:' + wallet.id);

    try {
      emitToUser(this.app, customer.id, 'wallet_updated', { walletId: wallet.id });
    } catch (err) {
      this.logger.warn({ err, userId: customer.id }, 'Failed to emit wallet_updated socket event');
    }

    await this.createNotification(
      customer.id,
      PrismaNotificationType.SYSTEM,
      'Verification approved',
      'Your bank verification is complete. Your dedicated account is ready.',
      { customerCode },
    );
  }

  private async notifyCustomerVerificationFailed(customerCode: string, reason: string) {
    const customer = await this.prisma.user.findUnique({
      where: { paystackCustomerCode: customerCode },
      select: { id: true },
    });

    if (!customer) return;

    await this.prisma.user.update({
      where: { id: customer.id },
      data: { status: 'PENDING_VERIFICATION', bvnVerified: false },
    });

    await this.createNotification(
      customer.id,
      PrismaNotificationType.SYSTEM,
      'Verification failed',
      reason,
      { customerCode, reason },
    );
  }

  async completeTopUpTransaction(txId: string, reference: string, amount: number, walletId: string) {
    const tx = await this.prisma.walletTransaction.findUnique({ where: { id: txId } });
    if (!tx || tx.status === WalletTransactionStatus.COMPLETED) return;

    let walletUserId: string | null = null;

    await this.prisma.$transaction(async (trx) => {
      await this.ensurePlatformWallet(trx);
      const wallet = await trx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundError('Wallet not found');
      walletUserId = wallet.userId;

      const before = Number(wallet.balance);
      const after = before + Number(amount);

      await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
      await trx.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: WalletTransactionStatus.COMPLETED,
          balanceBefore: before,
          balanceAfter: after,
        },
      });

      await trx.ledgerEntry.create({
        data: {
          debitWalletId: PLATFORM_WALLET_ID,
          creditWalletId: wallet.id,
          amount: amount,
          reference: `LEDGER_${reference}`,
          description: 'Top up settlement',
        },
      });
    });

    await deleteCache(this.app.redis, `cache:wallet:balance:${walletId}`);
    if (walletUserId) {
      try {
        emitToUser(this.app, walletUserId, 'wallet_updated', { walletId });
      } catch (err) {
        this.logger.warn({ err, walletUserId }, 'Failed to emit wallet_updated socket event');
      }

      await addNotificationJob(this.app, walletUserId, 'PAYMENT_RECEIVED', {
        amount: Number(amount),
        reference,
        kind: 'wallet_topup',
      });
      await this.createNotification(
        walletUserId,
        PrismaNotificationType.PAYMENT,
        'Wallet funded',
        `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(amount))} added to your wallet.`,
        { amount: Number(amount), reference, kind: 'wallet_topup' },
      );
    }
  }

  async verifyTopUp(userId: string, reference: string) {
    const tx = await this.prisma.walletTransaction.findUnique({ where: { reference } });
    if (!tx) throw new NotFoundError('Transaction not found');

    const wallet = await this.prisma.wallet.findUnique({ where: { id: tx.walletId } });
    if (!wallet || wallet.userId !== userId) {
      throw new UnauthorizedError('Unauthorized transaction');
    }

    if (tx.status === WalletTransactionStatus.COMPLETED) {
      return { status: 'success', amount: tx.amount, reference };
    }

    const providers = this.paymentProviders();
    const provider = await providers.getActiveProvider();
    const paystackTx = await providers.verifyTopUp(provider, reference);
    if (paystackTx && providers.isSuccessfulTopUp(provider, paystackTx as Record<string, unknown>)) {
      await this.completeTopUpTransaction(tx.id, reference, Number(tx.amount), tx.walletId);
      return { status: 'success', amount: tx.amount, reference };
    }

    if (paystackTx && providers.isFailedTopUp(provider, paystackTx as Record<string, unknown>)) {
      await this.prisma.walletTransaction.update({
        where: { id: tx.id },
        data: { status: WalletTransactionStatus.FAILED },
      });
      return { status: 'failed', amount: tx.amount, reference };
    }

    return { status: 'pending', amount: tx.amount, reference };
  }


  async completeExternalWalletFunding(provider: PaymentProvider, data: { reference: string; amount: number; walletId?: string; accountNumber?: string; customerIdentifier?: string }) {
    const existing = await this.prisma.walletTransaction.findUnique({ where: { reference: data.reference } });
    if (existing) {
      if (existing.status !== WalletTransactionStatus.COMPLETED) {
        await this.completeTopUpTransaction(existing.id, data.reference, Number(existing.amount), existing.walletId);
      }
      return;
    }

    let wallet = data.walletId ? await this.prisma.wallet.findUnique({ where: { id: data.walletId } }) : null;
    if (!wallet && data.accountNumber) {
      wallet = await this.prisma.wallet.findFirst({ where: { nuban: data.accountNumber, paymentProvider: provider } });
    }
    if (!wallet && data.customerIdentifier?.startsWith('PERCEL_')) {
      wallet = await this.prisma.wallet.findUnique({ where: { userId: data.customerIdentifier.replace(/^PERCEL_/, '') } });
    }
    if (!wallet) throw new NotFoundError('Wallet not found for payment notification');

    const tx = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: data.amount,
        type: WalletTransactionType.CREDIT,
        category: WalletTransactionCategory.TOP_UP,
        status: WalletTransactionStatus.PENDING,
        reference: data.reference,
        description: `${provider.toLowerCase()} wallet funding`,
        metadata: { gateway: provider.toLowerCase(), accountNumber: data.accountNumber ?? null, customerIdentifier: data.customerIdentifier ?? null },
        balanceBefore: 0,
        balanceAfter: 0,
      },
    });
    await this.completeTopUpTransaction(tx.id, data.reference, data.amount, wallet.id);
  }

  async handlePaystackWebhook(payload: Record<string, unknown>, signature?: string) {
    const secret = env.PAYSTACK_SECRET_KEY;
    const computed = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    if (!signature || signature !== computed) {
      throw new PaymentError('Invalid Paystack signature');
    }

    const event = String(payload.event ?? '');
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const reference = String(data.reference ?? '');

    if (event === 'customeridentification.success') {
      const customerCode = String(data.customer_code ?? '');
      if (customerCode) {
        await this.createDedicatedVirtualAccount(customerCode);
      }
      return { acknowledged: true };
    }

    if (event === 'customeridentification.failed') {
      const customerCode = String(data.customer_code ?? '');
      const reason = String(data.reason ?? 'Account could not be resolved. Please try again.');
      if (customerCode) {
        await this.notifyCustomerVerificationFailed(customerCode, reason);
      }
      return { acknowledged: true };
    }

    if (!reference) return { acknowledged: true };

    if (event === 'charge.success') {
      const tx = await this.prisma.walletTransaction.findUnique({ where: { reference } });
      if (!tx || tx.status === WalletTransactionStatus.COMPLETED) return { acknowledged: true };

      await this.completeTopUpTransaction(tx.id, reference, Number(tx.amount), tx.walletId);
    }

    if (event === 'refund.processed') {
      const tx = await this.prisma.walletTransaction.findUnique({ where: { reference } });
      if (!tx) return { acknowledged: true };
      await this.prisma.walletTransaction.update({ where: { id: tx.id }, data: { status: WalletTransactionStatus.REVERSED } });
      await deleteCache(this.app.redis, `cache:wallet:balance:${tx.walletId}`);
    }

    return { acknowledged: true };
  }


  async handleMonnifyWebhook(payload: Record<string, unknown>, signature?: string) {
    if (!verifyMonnifyWebhookSignature(payload, signature)) throw new PaymentError('Invalid Monnify signature');
    const eventType = String(payload.eventType ?? payload.event ?? '');
    const data = (payload.eventData ?? payload.data ?? payload) as Record<string, unknown>;
    const reference = String(data.paymentReference ?? data.transactionReference ?? data.reference ?? '');
    // destinationAccountNumber = the reserved NUBAN the customer paid into
    const accountNumber = String(data.destinationAccountNumber ?? '');
    const amount = Number(data.amountPaid ?? data.settlementAmount ?? data.amount ?? 0);
    const status = String(data.paymentStatus ?? data.status ?? '').toUpperCase();
    // product.reference = the accountReference we set when creating the reserved account ("PERCEL_<userId>")
    const product = data.product as Record<string, unknown> | undefined;
    const customerIdentifier = String(product?.reference ?? data.accountReference ?? '');

    if ((eventType.includes('SUCCESS') || status === 'PAID' || status === 'SUCCESS' || status === 'SUCCESSFUL') && reference && amount > 0) {
      await this.completeExternalWalletFunding(PaymentProvider.MONNIFY, { reference, amount, accountNumber, customerIdentifier });
    }
    return { acknowledged: true };
  }

  async handleSquadWebhook(payload: Record<string, unknown>, signature?: string) {
    if (!verifySquadWebhookSignature(payload, signature)) throw new PaymentError('Invalid Squad signature');
    const body = (payload.Body ?? payload.body ?? payload) as Record<string, unknown>;
    const reference = String(payload.TransactionRef ?? body.transaction_ref ?? payload.transaction_reference ?? '');
    const status = String(body.transaction_status ?? '').toLowerCase();
    const amountKobo = Number(body.amount ?? payload.principal_amount ?? payload.settled_amount ?? 0);
    const isVirtualAccount = String(payload.channel ?? '').toLowerCase() === 'virtual-account' || Boolean(payload.virtual_account_number);

    if ((status === 'success' || isVirtualAccount) && reference && amountKobo > 0) {
      await this.completeExternalWalletFunding(PaymentProvider.SQUAD, {
        reference,
        amount: isVirtualAccount ? Number(amountKobo) : amountKobo / 100,
        accountNumber: typeof payload.virtual_account_number === 'string' ? payload.virtual_account_number : undefined,
        customerIdentifier: typeof payload.customer_identifier === 'string' ? payload.customer_identifier : undefined,
      });
    }
    return { acknowledged: true };
  }

  async transfer(fromUserId: string, toPhone: string, amount: number, description: string | undefined, pin: string) {
    const normalizedPin = normalizePin(pin);
    const normalizedPhone = normalizeNigerianPhone(toPhone);
    assertPinFormat(normalizedPin);

    const [fromWallet, recipient, sender] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId: fromUserId } }),
      this.prisma.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true, fullName: true, wallet: true } }),
      this.prisma.user.findUnique({ where: { id: fromUserId }, select: { walletPinHash: true, fullName: true } }),
    ]);

    if (!fromWallet) throw new NotFoundError('Sender wallet not found');
    if (!recipient?.wallet) throw new NotFoundError('Recipient not found');
    if (recipient.id === fromUserId) throw new ValidationError('You cannot send money to yourself');
    if (!sender?.walletPinHash) throw new ValidationError('Set a transfer PIN before sending money');

    const pinMatches = await bcrypt.compare(normalizedPin, sender.walletPinHash);
    if (!pinMatches) throw new UnauthorizedError('Invalid transfer PIN');

    const bal = await this.getBalance(fromWallet.id);
    if (bal.realBalance < amount) throw new PaymentError('Insufficient balance');

    const reference = `TRF_${Date.now()}_${fromUserId.slice(0, 6)}`;
    const safeDescription = cleanText(description) ?? 'Wallet transfer';

    await this.prisma.$transaction(async (trx) => {
      await this.enforceTransferLimit(trx, fromWallet.id, fromUserId, amount);
      const senderBefore = Number((await trx.wallet.findUnique({ where: { id: fromWallet.id } }))?.balance ?? 0);
      const recipientBefore = Number((await trx.wallet.findUnique({ where: { id: recipient.wallet!.id } }))?.balance ?? 0);
      if (senderBefore < amount) throw new PaymentError('Insufficient balance');
      const senderAfter = senderBefore - amount;
      const recipientAfter = recipientBefore + amount;

      await trx.wallet.update({ where: { id: fromWallet.id }, data: { balance: senderAfter, ledgerBalance: senderAfter } });
      await trx.wallet.update({ where: { id: recipient.wallet!.id }, data: { balance: recipientAfter, ledgerBalance: recipientAfter } });

      await trx.ledgerEntry.create({
        data: {
          debitWalletId: fromWallet.id,
          creditWalletId: recipient.wallet!.id,
          amount,
          reference,
          description: safeDescription,
        },
      });

      await trx.walletTransaction.createMany({
        data: [
          {
            walletId: fromWallet.id,
            amount,
            type: WalletTransactionType.DEBIT,
            category: WalletTransactionCategory.TRANSFER_OUT,
            status: WalletTransactionStatus.COMPLETED,
            reference: `${reference}_OUT`,
            description: safeDescription,
            metadata: { toPhone: normalizedPhone },
            balanceBefore: senderBefore,
            balanceAfter: senderAfter,
          },
          {
            walletId: recipient.wallet!.id,
            amount,
            type: WalletTransactionType.CREDIT,
            category: WalletTransactionCategory.TRANSFER_IN,
            status: WalletTransactionStatus.COMPLETED,
            reference: `${reference}_IN`,
            description: safeDescription,
            metadata: { fromUserId },
            balanceBefore: recipientBefore,
            balanceAfter: recipientAfter,
          },
        ],
      });
    });

    await addNotificationJob(this.app, recipient.id, 'TRANSFER_RECEIVED', {
      amount,
      reference,
      senderName: sender?.fullName ?? 'another user',
      kind: 'wallet_transfer_in',
    });
    await this.createNotification(
      recipient.id,
      PrismaNotificationType.PAYMENT,
      'Money received',
      `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)} received from ${sender?.fullName ?? 'another user'}.`,
      { amount, reference, senderName: sender?.fullName ?? 'another user', kind: 'wallet_transfer_in' },
    );
    await this.createNotification(
      fromUserId,
      PrismaNotificationType.PAYMENT,
      'Transfer sent',
      `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)} sent to ${recipient.fullName}.`,
      { amount, reference, recipientName: recipient.fullName, kind: 'wallet_transfer_out' },
    );

    await deleteCache(this.app.redis, [`cache:wallet:balance:${fromWallet.id}`, `cache:wallet:balance:${recipient.wallet!.id}`]);
    this.logger.info({ userId: fromUserId, amount, reference, category: 'TRANSFER_OUT', result: 'completed' }, 'wallet.transfer');
    return { reference, amount, toPhone: normalizedPhone };
  }

  async resolveTransferRecipient(phone: string) {
    const normalizedPhone = assertNigerianPhone(phone);
    const recipient = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: { id: true, fullName: true, phone: true, avatarUrl: true, wallet: { select: { id: true } } },
    });

    if (!recipient?.wallet) throw new NotFoundError('Recipient not found');

    return {
      phone: recipient.phone,
      fullName: recipient.fullName,
      walletId: recipient.wallet.id,
      avatarUrl: recipient.avatarUrl,
    };
  }

  async resolveBankAccount(bankCode: string, accountNumber: string) {
    const providers = this.paymentProviders();
    const provider = await providers.getActiveProvider();
    return providers.resolveBankAccount(provider, accountNumber, bankCode);
  }

  async resolveAirtimeProvider(phone: string) {
    const { normalized: normalizedPhone, network } = resolveNigerianNetwork(phone);
    const services = await listServices('airtime');
    const providerName = network ?? services[0]?.name ?? 'Network';
    const service = network ? services.find((item) => item.name.toLowerCase().includes(network.toLowerCase())) : undefined;
    return {
      phone: normalizedPhone,
      serviceID: service?.serviceID ?? services[0]?.serviceID ?? 'airtime',
      providerName,
      confidence: service && network ? 'high' : 'low',
    };
  }

  async listBanks(providerName?: string) {
    const providers = this.paymentProviders();
    let provider: PaymentProvider;
    if (providerName) {
      const val = providerName.trim().toUpperCase();
      if (val === PaymentProvider.PAYSTACK || val === PaymentProvider.MONNIFY || val === PaymentProvider.SQUAD) {
        provider = val as PaymentProvider;
      } else {
        throw new ValidationError('Unsupported payment provider');
      }
    } else {
      provider = await providers.getActiveProvider();
    }
    return providers.listBanks(provider);
  }

  async getProviderServices(identifier: 'airtime' | 'data' | 'tv-subscription' | 'electricity-bill') {
    const services = await listServices(identifier);
    return services.map((service) => ({
      ...service,
      logoUrl: service.logoUrl ?? service.image ?? null,
    }));
  }

  async getProviderVariations(serviceID: string) {
    return listVariations(serviceID);
  }

  async validateProviderAccount(serviceID: string, billersCode: string, type?: 'prepaid' | 'postpaid') {
    return validateBillersCode(serviceID, billersCode, type);
  }

  async transferToBank(
    userId: string,
    data: {
      bankCode: string;
      accountNumber: string;
      amount: number;
      description?: string;
      pin: string;
    },
  ) {
    const normalizedPin = normalizePin(data.pin);
    assertPinFormat(normalizedPin);

    const [wallet, sender] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { walletPinHash: true, fullName: true } }),
    ]);

    if (!wallet) throw new NotFoundError('Wallet not found');
    if (!sender?.walletPinHash) throw new ValidationError('Set a transfer PIN before sending money');

    const pinMatches = await bcrypt.compare(normalizedPin, sender.walletPinHash);
    if (!pinMatches) throw new UnauthorizedError('Invalid transfer PIN');

    const balance = await this.getBalance(wallet.id);
    if (balance.realBalance < data.amount) throw new PaymentError('Insufficient balance');

    const recipient = await this.resolveBankAccount(data.bankCode, data.accountNumber);
    const providers = this.paymentProviders();
    const provider = await providers.getActiveProvider();
    const reference = `BANK_${Date.now()}_${userId.slice(0, 6)}`;
    const reason = cleanText(data.description) ?? 'Bank transfer';
    const transfer = await providers.initiateBankTransfer(provider, {
      name: recipient.accountName,
      accountNumber: recipient.accountNumber,
      bankCode: data.bankCode,
      amount: data.amount,
      reference,
      reason,
    });

    await this.prisma.$transaction(async (trx) => {
      await this.enforceTransferLimit(trx, wallet.id, userId, data.amount);
      const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
      if (before < data.amount) throw new PaymentError('Insufficient balance');
      const after = before - data.amount;

      await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
      await trx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: data.amount,
          type: WalletTransactionType.DEBIT,
          category: WalletTransactionCategory.TRANSFER_OUT,
          status: WalletTransactionStatus.COMPLETED,
          reference,
          description: reason,
          metadata: {
            bankCode: data.bankCode,
            accountNumber: data.accountNumber,
            accountName: recipient.accountName,
            transferRecipientCode: transfer.recipientCode,
          },
          balanceBefore: before,
          balanceAfter: after,
        },
      });
    });

    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    return { reference, amount: data.amount, bankName: recipient.bankName, accountName: recipient.accountName, accountNumber: recipient.accountNumber };
  }

  async buyAirtime(userId: string, phone: string, amount: number, network: string) {
    let resolvedServiceId = 'mtn-airtime';
    const lower = network.toLowerCase();
    if (lower.includes('mtn')) resolvedServiceId = 'mtn-airtime';
    else if (lower.includes('glo')) resolvedServiceId = 'glo-airtime';
    else if (lower.includes('airtel')) resolvedServiceId = 'airtel-airtime';
    else if (lower.includes('9mobile') || lower.includes('etisalat')) resolvedServiceId = '9mobile-airtime';
    else resolvedServiceId = lower.endsWith('-airtime') ? lower : `${lower}-airtime`;

    return this.buyUtility(userId, {
      serviceID: resolvedServiceId,
      billersCode: normalizeNigerianPhone(phone),
      amount,
      phone,
      description: `${network} airtime`,
      category: WalletTransactionCategory.AIRTIME,
    });
  }

  async buyData(userId: string, phone: string, plan: string, network: string, amount: number, variationCode?: string, serviceID?: string) {
    let resolvedServiceId = serviceID;
    if (!resolvedServiceId) {
      const lower = network.toLowerCase();
      if (lower.includes('mtn')) resolvedServiceId = 'mtn-data';
      else if (lower.includes('glo')) resolvedServiceId = 'glo-data';
      else if (lower.includes('airtel')) resolvedServiceId = 'airtel-data';
      else if (lower.includes('9mobile') || lower.includes('etisalat')) resolvedServiceId = '9mobile-data';
      else resolvedServiceId = lower.endsWith('-data') ? lower : `${lower}-data`;
    }

    return this.buyUtility(userId, {
      serviceID: resolvedServiceId,
      billersCode: normalizeNigerianPhone(phone),
      amount,
      phone,
      description: `${network} data plan: ${plan}`,
      category: WalletTransactionCategory.DATA,
      variation_code: variationCode,
    });
  }

  async buyElectricity(userId: string, meterNumber: string, amount: number, disco: string, type?: 'prepaid' | 'postpaid') {
    return this.buyUtility(userId, {
      serviceID: disco,
      billersCode: meterNumber,
      amount,
      phone: meterNumber,
      type,
      description: `${disco} electricity`,
      category: WalletTransactionCategory.ELECTRICITY,
    });
  }

  async buyTv(userId: string, smartcardNumber: string, amount: number, provider: string, variationCode: string, phone?: string) {
    let resolvedServiceId = provider;
    if (!resolvedServiceId.match(/^[a-z0-9-]+$/) || resolvedServiceId.includes(' ')) {
      const lower = provider.toLowerCase();
      if (lower.includes('dstv')) resolvedServiceId = 'dstv';
      else if (lower.includes('gotv')) resolvedServiceId = 'gotv';
      else if (lower.includes('startimes')) resolvedServiceId = 'startimes';
      else if (lower.includes('showmax')) resolvedServiceId = 'showmax';
    }

    return this.buyUtility(userId, {
      serviceID: resolvedServiceId,
      billersCode: smartcardNumber,
      amount,
      phone: phone ?? smartcardNumber,
      description: `${provider} ${variationCode}`,
      category: WalletTransactionCategory.TV,
      variation_code: variationCode,
    });
  }

  private async buyUtility(
    userId: string,
    input: {
      serviceID: string;
      billersCode: string;
      amount: number;
      phone: string;
      description: string;
      category: WalletTransactionCategory;
      type?: 'prepaid' | 'postpaid';
      variation_code?: string;
    },
  ) {
    const [wallet, sender] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
    ]);

    if (!wallet) throw new NotFoundError('Wallet not found');
    const balance = await this.getBalance(wallet.id);
    if (balance.realBalance < input.amount) throw new PaymentError('Insufficient balance');

    await payUtility({
      serviceID: input.serviceID,
      billersCode: input.billersCode,
      amount: input.amount,
      phone: normalizeNigerianPhone(input.phone),
      type: input.type,
      variation_code: input.variation_code,
    });

    const reference = `${input.category}_${Date.now()}_${userId.slice(0, 6)}`;
    await this.prisma.$transaction(async (trx) => {
      const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
      if (before < input.amount) throw new PaymentError('Insufficient balance');
      const after = before - input.amount;
      await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
      await trx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: input.amount,
          type: WalletTransactionType.DEBIT,
          category: input.category,
          status: WalletTransactionStatus.COMPLETED,
          reference,
          description: input.description,
          metadata: { billersCode: input.billersCode, serviceID: input.serviceID, customerName: sender?.fullName ?? null },
          balanceBefore: before,
          balanceAfter: after,
        },
      });
    });

    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    return { reference, amount: input.amount };
  }

  async deductForOrder(userId: string, orderId: string, amount: number, tx: Prisma.TransactionClient | PrismaClient) {
    const client = this.getClient(tx);
    const wallet = await client.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const before = Number(wallet.balance ?? 0);
    if (before < amount) throw new PaymentError('Insufficient balance');
    const after = before - amount;

    await client.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
    await client.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: WalletTransactionType.DEBIT,
        category: WalletTransactionCategory.ORDER_PAYMENT,
        status: WalletTransactionStatus.COMPLETED,
        reference: `ORDER_${orderId}`,
        description: 'Order payment',
        metadata: { orderId },
        balanceBefore: before,
        balanceAfter: after,
      },
    });
    await client.ledgerEntry.create({
      data: {
        debitWalletId: wallet.id,
        creditWalletId: PLATFORM_WALLET_ID,
        amount,
        reference: `LEDGER_ORDER_${orderId}`,
        description: 'Order payment',
      },
    });
    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    return { updated: true };
  }

  async refundOrderPayment(userId: string, orderId: string, amount: number, reason: string, tx: Prisma.TransactionClient | PrismaClient) {
    const client = this.getClient(tx);
    const wallet = await client.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const before = Number(wallet.balance ?? 0);
    const after = before + amount;

    await client.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
    await client.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: WalletTransactionType.CREDIT,
        category: WalletTransactionCategory.REFUND,
        status: WalletTransactionStatus.COMPLETED,
        reference: `REFUND_ORDER_${orderId}`,
        description: cleanText(reason) ?? 'Order refund',
        metadata: { orderId, reason },
        balanceBefore: before,
        balanceAfter: after,
      },
    });
    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    return { updated: true };
  }

  async creditDriverEarning(driverId: string, orderId: string, amount: number, tx: Prisma.TransactionClient | PrismaClient) {
    const client = this.getClient(tx);
    const driver = await client.driver.findUnique({ where: { id: driverId }, select: { userId: true } });
    if (!driver) throw new NotFoundError('Driver not found');

    // Ensure driver wallet exists — create it if missing rather than throwing
    let wallet = await client.wallet.findUnique({ where: { userId: driver.userId } });
    if (!wallet) {
      wallet = await client.wallet.create({
        data: { userId: driver.userId, balance: 0, ledgerBalance: 0 },
      });
      this.logger.warn({ driverId, userId: driver.userId }, 'creditDriverEarning: driver wallet was missing — created automatically');
    }

    // Idempotency: skip if this earning was already recorded
    const reference = `EARNING_ORDER_${orderId}`;
    const existing = await client.walletTransaction.findUnique({ where: { reference } });
    if (existing) {
      this.logger.warn({ driverId, orderId, reference }, 'creditDriverEarning: earning already recorded, skipping duplicate');
      return { updated: false, skipped: true };
    }

    const before = Number(wallet.balance ?? 0);
    const after = before + amount;

    await client.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
    await client.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: WalletTransactionType.CREDIT,
        category: WalletTransactionCategory.ORDER_EARNING,
        status: WalletTransactionStatus.COMPLETED,
        reference,
        description: 'Driver order earning',
        metadata: { orderId, driverId },
        balanceBefore: before,
        balanceAfter: after,
      },
    });
    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    return { updated: true };
  }
}
