import crypto from 'node:crypto';

import { NotificationType as PrismaNotificationType, Prisma, type PrismaClient, WalletTransactionCategory, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { deleteCache, getCachedJson, setCachedJson } from '../../lib/cache.js';
import {
  createDedicatedNUBAN,
  createTransferRecipient,
  getBank,
  initializeTransaction,
  initiateTransfer,
  listBanks,
  resolveAccountNumber,
} from '../../lib/paystack.js';
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
    wallet: { id: string; nuban: string | null; bankName: string | null; bankCode: string | null },
    user: { email: string; fullName: string; phone: string; dateOfBirth: Date | null; address: string | null; ninVerified: boolean; bvnVerified: boolean; kycMethod: 'NIN' | 'BVN' | null },
  ) {
    const kycComplete = isKycComplete(user);
    return { ...wallet, kycComplete };

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
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true, phone: true, dateOfBirth: true, address: true, ninVerified: true, bvnVerified: true, kycMethod: true } }),
    ]);

    if (!wallet) throw new NotFoundError('Wallet not found');
    const depositAccount = await this.ensureDepositAccount(wallet, profile ?? { email: '', fullName: 'Percel User', phone: '', dateOfBirth: null, address: null, ninVerified: false, bvnVerified: false, kycMethod: null });
    return {
      ...wallet,
      ...depositAccount,
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

    const [completedCredits, completedDebits, pendingCredits, pendingDebits] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { walletId, status: WalletTransactionStatus.COMPLETED, type: WalletTransactionType.CREDIT },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletId, status: WalletTransactionStatus.COMPLETED, type: WalletTransactionType.DEBIT },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletId, status: { in: [WalletTransactionStatus.PENDING, WalletTransactionStatus.COMPLETED] }, type: WalletTransactionType.CREDIT },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletId, status: { in: [WalletTransactionStatus.PENDING, WalletTransactionStatus.COMPLETED] }, type: WalletTransactionType.DEBIT },
        _sum: { amount: true },
      }),
    ]);

    const real = Number(completedCredits._sum.amount ?? 0) - Number(completedDebits._sum.amount ?? 0);
    const ledger = Number(pendingCredits._sum.amount ?? 0) - Number(pendingDebits._sum.amount ?? 0);

    const result = { realBalance: real, ledgerBalance: ledger };
    await setCachedJson(this.app.redis, cacheKey, result, 10);
    return result;
  }

  async initializeTopUp(userId: string, amount: number, callbackUrl?: string) {
    if (amount < 100 || amount > 1000000) throw new ValidationError('Amount out of allowed range');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!user || !wallet) throw new NotFoundError('User wallet not found');

    const reference = `TOPUP_${Date.now()}_${userId.slice(0, 6)}`;

    const init = await initializeTransaction(user.email, Math.round(amount * 100), reference, { userId, walletId: wallet.id }, callbackUrl);

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
        metadata: { gateway: 'paystack', authorizationUrl: init.authorization_url },
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
      select: { id: true, fullName: true, wallet: { select: { id: true, nuban: true, bankName: true, bankCode: true } } },
    });

    const wallet = customer?.wallet;
    if (!wallet) return;
    if (wallet.nuban && wallet.bankName) {
      await this.prisma.user.update({ where: { id: customer.id }, data: { status: 'ACTIVE', bvnVerified: true } });
      return;
    }

    const account = await createDedicatedNUBAN(customerCode);
    const bankName = account.bank?.name ?? 'Percel Wallet';
    const bankCode = account.bank?.slug ?? null;

    await this.prisma.$transaction(async (trx) => {
      await trx.wallet.update({
        where: { id: wallet.id },
        data: {
          nuban: account.account_number,
          bankName,
          bankCode,
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

      let walletUserId: string | null = null;

      await this.prisma.$transaction(async (trx) => {
        await this.ensurePlatformWallet(trx);
        const wallet = await trx.wallet.findUnique({ where: { id: tx.walletId } });
        if (!wallet) throw new NotFoundError('Wallet not found');
        walletUserId = wallet.userId;

        const before = Number(wallet.balance);
        const after = before + Number(tx.amount);

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
            amount: tx.amount,
            reference: `LEDGER_${reference}`,
            description: 'Top up settlement',
          },
        });
      });

      await deleteCache(this.app.redis, `cache:wallet:balance:${tx.walletId}`);
      if (walletUserId) {
        try {
          emitToUser(this.app, walletUserId, 'wallet_updated', { walletId: tx.walletId });
        } catch (err) {
          this.logger.warn({ err, walletUserId }, 'Failed to emit wallet_updated socket event');
        }

        await addNotificationJob(this.app, walletUserId, 'PAYMENT_RECEIVED', {
          amount: Number(tx.amount),
          reference,
        });
        await this.createNotification(
          walletUserId,
          PrismaNotificationType.PAYMENT,
          'Wallet funded',
          `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(tx.amount))} added to your wallet.`,
          { amount: Number(tx.amount), reference, kind: 'wallet_topup' },
        );
      }
    }

    if (event === 'refund.processed') {
      const tx = await this.prisma.walletTransaction.findUnique({ where: { reference } });
      if (!tx) return { acknowledged: true };
      await this.prisma.walletTransaction.update({ where: { id: tx.id }, data: { status: WalletTransactionStatus.REVERSED } });
      await deleteCache(this.app.redis, `cache:wallet:balance:${tx.walletId}`);
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
    if (!sender?.walletPinHash) throw new ValidationError('Set a transfer PIN before sending money');

    const pinMatches = await bcrypt.compare(normalizedPin, sender.walletPinHash);
    if (!pinMatches) throw new UnauthorizedError('Invalid transfer PIN');

    const bal = await this.getBalance(fromWallet.id);
    if (bal.realBalance < amount) throw new PaymentError('Insufficient balance');

    const reference = `TRF_${Date.now()}_${fromUserId.slice(0, 6)}`;
    const safeDescription = cleanText(description) ?? 'Wallet transfer';

    await this.prisma.$transaction(async (trx) => {
      const senderBefore = Number((await trx.wallet.findUnique({ where: { id: fromWallet.id } }))?.balance ?? 0);
      const recipientBefore = Number((await trx.wallet.findUnique({ where: { id: recipient.wallet!.id } }))?.balance ?? 0);
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
    const normalizedPhone = normalizeNigerianPhone(phone);
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
    const [account, bank] = await Promise.all([resolveAccountNumber(accountNumber, bankCode), getBank(bankCode)]);
    return {
      accountName: account.account_name,
      accountNumber: account.account_number,
      bankCode,
      bankName: bank?.name ?? bankCode,
    };
  }

  async resolveAirtimeProvider(phone: string) {
    const normalizedPhone = normalizeNigerianPhone(phone);
    const digits = normalizedPhone.replace(/\D/g, '');
    const services = await listServices('airtime');
    const providerName = digits.startsWith('2348') || digits.startsWith('080') ? 'MTN' : digits.startsWith('2347') || digits.startsWith('070') ? 'Airtel' : digits.startsWith('2349') || digits.startsWith('090') ? '9mobile' : digits.startsWith('2345') || digits.startsWith('050') ? 'Glo' : services[0]?.name ?? 'Network';
    const service = services.find((item) => item.name.toLowerCase().includes(providerName.toLowerCase())) ?? services[0];
    return {
      phone: normalizedPhone,
      serviceID: service?.serviceID ?? 'airtime',
      providerName,
      confidence: service ? 'high' : 'low',
    };
  }

  async listBanks() {
    return listBanks();
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
    const transferRecipient = await createTransferRecipient({
      name: recipient.accountName,
      accountNumber: recipient.accountNumber,
      bankCode: data.bankCode,
    });

    const reference = `BANK_${Date.now()}_${userId.slice(0, 6)}`;
    const reason = cleanText(data.description) ?? 'Bank transfer';
    await initiateTransfer({
      recipient: transferRecipient.recipient_code,
      amount: data.amount,
      reference,
      reason,
    });

    await this.prisma.$transaction(async (trx) => {
      const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
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
            transferRecipientCode: transferRecipient.recipient_code,
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
    return this.buyUtility(userId, {
      serviceID: 'airtime',
      billersCode: normalizeNigerianPhone(phone),
      amount,
      phone,
      description: `${network} airtime`,
      category: WalletTransactionCategory.AIRTIME,
    });
  }

  async buyData(userId: string, phone: string, plan: string, network: string, amount: number) {
    return this.buyUtility(userId, {
      serviceID: 'data',
      billersCode: normalizeNigerianPhone(phone),
      amount,
      phone,
      description: `${network} data plan: ${plan}`,
      category: WalletTransactionCategory.DATA,
    });
  }

  async buyElectricity(userId: string, meterNumber: string, amount: number, disco: string, type?: 'prepaid' | 'postpaid') {
    return this.buyUtility(userId, {
      serviceID: 'electricity-bill',
      billersCode: meterNumber,
      amount,
      phone: meterNumber,
      type,
      description: `${disco} electricity`,
      category: WalletTransactionCategory.ELECTRICITY,
    });
  }

  async buyTv(userId: string, smartcardNumber: string, amount: number, provider: string, variationCode: string, phone?: string) {
    return this.buyUtility(userId, {
      serviceID: 'tv-subscription',
      billersCode: smartcardNumber,
      amount,
      phone: phone ?? smartcardNumber,
      description: `${provider} ${variationCode}`,
      category: WalletTransactionCategory.TV,
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
    });

    const reference = `${input.category}_${Date.now()}_${userId.slice(0, 6)}`;
    await this.prisma.$transaction(async (trx) => {
      const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
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
    const wallet = await client.wallet.findUnique({ where: { userId: driver.userId } });
    if (!wallet) throw new NotFoundError('Driver wallet not found');

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
        reference: `EARNING_ORDER_${orderId}`,
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
