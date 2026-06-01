import crypto from 'node:crypto';

import { NotificationType as PrismaNotificationType, Prisma, type PrismaClient, WalletTransactionCategory, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { deleteCache, getCachedJson, setCachedJson } from '../../lib/cache.js';
import {
  createCustomer,
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

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [firstName = 'Percel', ...rest] = parts;
  return {
    firstName,
    lastName: rest.join(' ') || 'User',
  };
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
    if (wallet.nuban && wallet.bankName) {
      return { ...wallet, kycComplete: true };
    }

    const kycComplete = isKycComplete(user);
    if (!kycComplete) {
      return { ...wallet, kycComplete: false };
    }

    try {
      const { firstName, lastName } = splitFullName(user.fullName);
      const customer = await createCustomer({
        email: user.email,
        firstName,
        lastName,
        phone: user.phone,
      });
      const preferredBank = 'wema-bank';
      const account = await createDedicatedNUBAN(customer.customer_code, preferredBank);
      const bankName = account.bank?.name ?? 'Percel Wallet';
      const bankCode = account.bank?.slug ?? preferredBank;

      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          nuban: account.account_number,
          bankName,
          bankCode,
        },
      });

      return {
        id: wallet.id,
        nuban: account.account_number,
        bankName,
        bankCode,
        kycComplete: true,
      };
    } catch (error) {
      this.logger.warn({ walletId: wallet.id, error }, 'wallet.deposit_account.ensure_failed');
      return { ...wallet, kycComplete: kycComplete };
    }
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

  async handlePaystackWebhook(payload: Record<string, unknown>, signature?: string) {
    const secret = env.PAYSTACK_SECRET_KEY;
    const computed = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    if (!signature || signature !== computed) {
      throw new PaymentError('Invalid Paystack signature');
    }

    const event = String(payload.event ?? '');
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const reference = String(data.reference ?? '');

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
      select: { id: true, fullName: true, phone: true, wallet: { select: { id: true } } },
    });

    if (!recipient?.wallet) throw new NotFoundError('Recipient not found');

    return {
      phone: recipient.phone,
      fullName: recipient.fullName,
      walletId: recipient.wallet.id,
    };
  }

  async resolveBankAccount(bankCode: string, accountNumber: string) {
    const [bank, account] = await Promise.all([getBank(bankCode), resolveAccountNumber(accountNumber, bankCode)]);
    return {
      bankCode,
      bankName: bank?.name ?? bank?.slug ?? bankCode,
      accountNumber: account.account_number,
      accountName: account.account_name,
    };
  }

  async listBanks() {
    const banks = await listBanks('nigeria');
    return banks
      .filter((bank) => Boolean(bank?.name && bank?.code))
      .map((bank) => ({
        name: String(bank.name),
        code: String(bank.code),
        slug: bank.slug ?? null,
        longcode: bank.longcode ?? null,
        currency: bank.currency ?? null,
        type: bank.type ?? null,
      }));
  }

  async getProviderServices(identifier: 'airtime' | 'data' | 'tv-subscription' | 'electricity-bill') {
    return listServices(identifier);
  }

  async getProviderVariations(serviceID: string) {
    return listVariations(serviceID);
  }

  async validateProviderAccount(
    serviceID: string,
    billersCode: string,
    type?: 'prepaid' | 'postpaid',
  ) {
    return validateBillersCode(serviceID, billersCode, type);
  }

  async transferToBank(
    userId: string,
    payload: { bankCode: string; accountNumber: string; amount: number; description?: string; pin: string },
  ) {
    const normalizedPin = normalizePin(payload.pin);
    assertPinFormat(normalizedPin);

    const [wallet, sender, profile] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { walletPinHash: true, fullName: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true, phone: true, dateOfBirth: true, address: true, ninVerified: true, bvnVerified: true, kycMethod: true } }),
    ]);

    if (!wallet) throw new NotFoundError('Sender wallet not found');
    if (!sender?.walletPinHash) throw new ValidationError('Set a transfer PIN before sending money');
    if (!profile || !isKycComplete(profile)) throw new ValidationError('Complete KYC before sending money to a bank account');

    const pinMatches = await bcrypt.compare(normalizedPin, sender.walletPinHash);
    if (!pinMatches) throw new UnauthorizedError('Invalid transfer PIN');

    const bal = await this.getBalance(wallet.id);
    if (bal.realBalance < payload.amount) throw new PaymentError('Insufficient balance');

    const resolved = await this.resolveBankAccount(payload.bankCode, payload.accountNumber);
    const reference = `BNK_${Date.now()}_${userId.slice(0, 6)}`;
    const safeDescription = cleanText(payload.description) ?? `Transfer to ${resolved.accountName}`;
    const recipient = await createTransferRecipient({
      name: resolved.accountName,
      accountNumber: resolved.accountNumber,
      bankCode: payload.bankCode,
    });

    try {
      await this.prisma.$transaction(async (trx) => {
        const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
        const after = before - payload.amount;

        await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
        await trx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: payload.amount,
            type: WalletTransactionType.DEBIT,
            category: WalletTransactionCategory.TRANSFER_OUT,
            status: WalletTransactionStatus.PENDING,
            reference,
            description: safeDescription,
            metadata: {
              bankCode: payload.bankCode,
              bankName: resolved.bankName,
              accountNumber: resolved.accountNumber,
              accountName: resolved.accountName,
              recipientCode: recipient.recipient_code,
            } as Prisma.JsonObject,
            balanceBefore: before,
            balanceAfter: after,
          },
        });
      });

      const transfer = await initiateTransfer({
        recipient: recipient.recipient_code,
        amount: payload.amount,
        reference,
        reason: safeDescription,
      });
      const status = String(transfer.status ?? '').toLowerCase() === 'success'
        ? WalletTransactionStatus.COMPLETED
        : WalletTransactionStatus.PENDING;

      await this.prisma.walletTransaction.update({
        where: { reference },
        data: {
          status,
          paystackReference: transfer.transfer_code ?? transfer.reference ?? reference,
        },
      });

      await this.createNotification(
        userId,
        PrismaNotificationType.PAYMENT,
        'Bank transfer sent',
        `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(payload.amount)} sent to ${resolved.accountName}.`,
        {
          amount: payload.amount,
          reference,
          accountName: resolved.accountName,
          bankName: resolved.bankName,
          status,
          kind: 'bank_transfer',
        },
      );

      await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
      return {
        reference,
        amount: payload.amount,
        bankName: resolved.bankName,
        accountName: resolved.accountName,
        accountNumber: resolved.accountNumber,
        recipientCode: recipient.recipient_code,
        status,
      };
    } catch (error) {
      await this.prisma.$transaction(async (trx) => {
        const tx = await trx.walletTransaction.findUnique({ where: { reference } });
        const current = await trx.wallet.findUnique({ where: { id: wallet.id } });
        if (!tx || !current) return;

        const afterReverse = Number(current.balance) + payload.amount;
        await trx.wallet.update({ where: { id: wallet.id }, data: { balance: afterReverse, ledgerBalance: afterReverse } });
        await trx.walletTransaction.update({ where: { id: tx.id }, data: { status: WalletTransactionStatus.FAILED } });
      });

      await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
      throw error;
    }
  }

  async buyAirtime(userId: string, phone: string, amount: number, network: string) {
    return this.buyUtilityFlow(userId, WalletTransactionCategory.AIRTIME, amount, {
      serviceID: this.resolveAirtimeServiceId(network),
      billersCode: phone,
      phone,
      providerLabel: `Airtime • ${network}`,
      successTitle: 'Airtime bought',
      successBody: `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)} airtime sent to ${phone}.`,
      metadata: { phone, network },
    });
  }

  async buyData(userId: string, phone: string, plan: string, network: string, amount: number, variationCode?: string, serviceID?: string) {
    const resolvedServiceID = serviceID ?? this.resolveDataServiceId(network);
    if (!variationCode) throw new ValidationError('Select a live data plan before payment');
    return this.buyUtilityFlow(userId, WalletTransactionCategory.DATA, amount, {
      serviceID: resolvedServiceID,
      billersCode: phone,
      phone,
      variation_code: variationCode,
      providerLabel: `Data • ${network}`,
      successTitle: 'Data purchased',
      successBody: `${plan} bought for ${phone}.`,
      metadata: { phone, plan, network, serviceID: resolvedServiceID, variationCode },
    });
  }

  async buyElectricity(userId: string, meterNumber: string, amount: number, disco: string, type: 'prepaid' | 'postpaid' = 'prepaid') {
    return this.buyUtilityFlow(userId, WalletTransactionCategory.ELECTRICITY, amount, {
      serviceID: this.resolveElectricityServiceId(disco),
      billersCode: meterNumber,
      phone: meterNumber,
      type,
      providerLabel: `Electricity • ${disco}`,
      successTitle: 'Electricity paid',
      successBody: `Electricity payment of ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)} sent for ${meterNumber}.`,
      metadata: { meterNumber, disco, type },
    });
  }

  async buyTv(
    userId: string,
    smartcardNumber: string,
    amount: number,
    provider: string,
    variationCode: string,
    phone?: string,
  ) {
    return this.buyUtilityFlow(userId, WalletTransactionCategory.TV, amount, {
      serviceID: this.resolveTvServiceId(provider),
      billersCode: smartcardNumber,
      phone: phone ?? '',
      variation_code: variationCode,
      providerLabel: `TV • ${provider}`,
      successTitle: 'TV subscription paid',
      successBody: `${provider} subscription renewed successfully.`,
      metadata: { smartcardNumber, provider, variationCode },
    });
  }

  private resolveAirtimeServiceId(network: string) {
    const normalized = network.toLowerCase();
    if (normalized.includes('mtn')) return 'mtn';
    if (normalized.includes('airtel')) return 'airtel';
    if (normalized.includes('glo')) return 'glo';
    return 'etisalat';
  }

  private resolveDataServiceId(network: string) {
    const normalized = network.toLowerCase();
    if (normalized.includes('mtn')) return 'mtn-data';
    if (normalized.includes('airtel')) return 'airtel-data';
    if (normalized.includes('glo')) return 'glo-data';
    return 'etisalat-data';
  }

  private resolveElectricityServiceId(disco: string) {
    const normalized = disco.toLowerCase();
    if (normalized.includes('ikeja') || normalized.includes('ikedc')) return 'ikeja-electric';
    if (normalized.includes('eko') || normalized.includes('ekedc')) return 'eko-electric';
    if (normalized.includes('abuja') || normalized.includes('aedc')) return 'abuja-electric';
    if (normalized.includes('phed') || normalized.includes('port harcourt')) return 'phed';
    if (normalized.includes('jos') || normalized.includes('jed')) return 'jos-electric';
    if (normalized.includes('kano') || normalized.includes('kedco')) return 'kano-electric';
    if (normalized.includes('kaduna') || normalized.includes('kaedco')) return 'kaedco-electric';
    return 'ikeja-electric';
  }

  private resolveTvServiceId(provider: string) {
    const normalized = provider.toLowerCase();
    if (normalized.includes('dstv')) return 'dstv';
    if (normalized.includes('gotv')) return 'gotv';
    return 'startimes';
  }

  private async buyUtilityFlow(
    userId: string,
    category: WalletTransactionCategory,
    amount: number,
    payload: {
      serviceID: string;
      billersCode: string;
      phone: string;
      variation_code?: string;
      type?: 'prepaid' | 'postpaid';
      providerLabel: string;
      successTitle: string;
      successBody: string;
      metadata: Record<string, unknown>;
    },
  ) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const bal = await this.getBalance(wallet.id);
    if (bal.realBalance < amount) throw new PaymentError('Insufficient balance');

    const reference = `BILL_${category}_${Date.now()}`;

    try {
      await this.prisma.$transaction(async (trx) => {
        const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
        const after = before - amount;

        await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
        await trx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: WalletTransactionType.DEBIT,
            category,
            status: WalletTransactionStatus.PENDING,
            reference,
            description: `Bill payment: ${payload.providerLabel}`,
            metadata: payload.metadata as Prisma.JsonObject,
            balanceBefore: before,
            balanceAfter: after,
          },
        });
      });

      const result = await payUtility({
        serviceID: payload.serviceID,
        billersCode: payload.billersCode,
        variation_code: payload.variation_code,
        amount,
        phone: payload.phone || user.phone,
        type: payload.type,
      });

      const providerStatus = String(result.code ?? result.response_description ?? '').trim();
      if (providerStatus && providerStatus !== '000') {
        throw new PaymentError(String(result.response_description ?? result.code ?? 'Utility payment failed'));
      }

      await this.prisma.walletTransaction.update({ where: { reference }, data: { status: WalletTransactionStatus.COMPLETED } });
      await this.createNotification(
        userId,
        PrismaNotificationType.PAYMENT,
        payload.successTitle,
        payload.successBody,
        { amount, reference, category, provider: payload.providerLabel, kind: 'bill_payment' },
      );
      await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
      return { reference, status: 'COMPLETED' };
    } catch (error) {
      await this.prisma.$transaction(async (trx) => {
        const tx = await trx.walletTransaction.findUnique({ where: { reference } });
        const current = await trx.wallet.findUnique({ where: { id: wallet.id } });
        if (!tx || !current) return;

        const afterReverse = Number(current.balance) + amount;
        await trx.wallet.update({ where: { id: wallet.id }, data: { balance: afterReverse, ledgerBalance: afterReverse } });
        await trx.walletTransaction.update({ where: { id: tx.id }, data: { status: WalletTransactionStatus.REVERSED } });
      });

      await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
      throw error;
    }
  }

  async deductForOrder(
    userId: string,
    orderId: string,
    amount: number,
    client?: PrismaClient | Prisma.TransactionClient,
  ) {
    const prisma = this.getClient(client);
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const bal = await this.getBalance(wallet.id);
    if (bal.realBalance < amount) throw new PaymentError('Insufficient balance');

    const reference = `ORDER_${orderId}_${Date.now()}`;

    const execute = async (trx: PrismaClient | Prisma.TransactionClient) => {
      const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
      const after = before - amount;
      await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
      await trx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: WalletTransactionType.DEBIT,
          category: WalletTransactionCategory.TV,
          status: WalletTransactionStatus.COMPLETED,
          reference,
          description: 'Order payment deduction',
          metadata: { orderId },
          orderId,
          balanceBefore: before,
          balanceAfter: after,
        },
      });
    };

    if (client) {
      await execute(prisma);
      await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
      return { reference };
    }

    await this.prisma.$transaction(async (trx) => {
      await execute(trx);
    });

    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    this.logger.info({ userId, amount, reference, category: 'ORDER_REFUND', result: 'completed' }, 'wallet.refund');
    return { reference };
  }

  async creditDriverEarning(
    driverId: string,
    orderId: string,
    grossAmount: number,
    client?: PrismaClient | Prisma.TransactionClient,
  ) {
    const prisma = this.getClient(client);
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundError('Driver not found');

    const wallet = await prisma.wallet.findUnique({ where: { userId: driver.userId } });
    if (!wallet) throw new NotFoundError('Driver wallet not found');

    const commission = (grossAmount * env.PLATFORM_COMMISSION_PERCENT) / 100;
    const net = grossAmount - commission;
    const reference = `EARN_${orderId}_${Date.now()}`;

    const execute = async (trx: PrismaClient | Prisma.TransactionClient) => {
      const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
      const after = before + net;

      await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
      await trx.driverEarning.create({
        data: {
          driverId,
          orderId,
          grossAmount,
          commissionAmount: commission,
          netAmount: net,
          status: 'PENDING',
        },
      });

      await trx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: net,
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.ORDER_EARNING,
          status: WalletTransactionStatus.COMPLETED,
          reference,
          description: 'Driver earning credit',
          metadata: { orderId, grossAmount, commission },
          orderId,
          balanceBefore: before,
          balanceAfter: after,
        },
      });

      await trx.ledgerEntry.create({
        data: {
          debitWalletId: PLATFORM_WALLET_ID,
          creditWalletId: wallet.id,
          amount: net,
          reference: `LEDGER_${reference}`,
          description: 'Driver earning settlement',
        },
      });
    };

    if (client) {
      await execute(prisma);
      await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
      return { netAmount: net, commissionAmount: commission };
    }

    await this.prisma.$transaction(async (trx) => {
      await execute(trx);
    });

    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    this.logger.info({ driverId, orderId, grossAmount, commission, net, result: 'completed' }, 'wallet.driver_earning');
    return { netAmount: net, commissionAmount: commission };
  }

  async refundOrderPayment(
    userId: string,
    orderId: string,
    amount: number,
    reason?: string,
    client?: PrismaClient | Prisma.TransactionClient,
  ) {
    const prisma = this.getClient(client);
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const reference = `REFUND_${orderId}_${Date.now()}`;

    const execute = async (trx: PrismaClient | Prisma.TransactionClient) => {
      const before = Number((await trx.wallet.findUnique({ where: { id: wallet.id } }))?.balance ?? 0);
      const after = before + amount;
      await trx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });
      await trx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: WalletTransactionType.CREDIT,
          category: WalletTransactionCategory.REFUND,
          status: WalletTransactionStatus.COMPLETED,
          reference,
          description: reason ?? 'Order refund',
          metadata: { orderId, reason },
          orderId,
          balanceBefore: before,
          balanceAfter: after,
        },
      });
    };

    if (client) {
      await execute(prisma);
      await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
      return { reference };
    }

    await this.prisma.$transaction(async (trx) => {
      await execute(trx);
    });

    await deleteCache(this.app.redis, `cache:wallet:balance:${wallet.id}`);
    this.logger.info({ userId, amount, reference, category: 'BILL_PAYMENT', result: 'completed' }, 'wallet.bill_payment');
    return { reference };
  }
}
