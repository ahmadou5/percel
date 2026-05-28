import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { Prisma, type PrismaClient, WalletTransactionCategory, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';

import { env } from '../../config/env';
import { deleteCache, getCachedJson, setCachedJson } from '../../lib/cache';
import { cleanText } from '../../utils/sanitize';
import { addNotificationJob } from '../../queues';
import {
  initializeTransaction,
  initiateBillsCharge,
} from '../../lib/paystack';
import { NotFoundError, PaymentError, UnauthorizedError, ValidationError } from '../../utils/errors';

const PLATFORM_WALLET_ID = '00000000-0000-0000-0000-000000000001';

function normalizePin(pin: string) {
  return pin.trim();
}

function assertPinFormat(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new ValidationError('Transfer PIN must be 4 to 6 digits');
  }
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

  async getWallet(userId: string) {
    const [wallet, user] = await Promise.all([
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
    ]);

    if (!wallet) throw new NotFoundError('Wallet not found');
    return {
      ...wallet,
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
        await addNotificationJob(this.app, walletUserId, 'PAYMENT_RECEIVED', {
          amount: Number(tx.amount),
          reference,
        });
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
    assertPinFormat(normalizedPin);

    const [fromWallet, recipient, sender] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId: fromUserId } }),
      this.prisma.user.findUnique({ where: { phone: toPhone }, include: { wallet: true } }),
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
            metadata: { toPhone },
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

    await deleteCache(this.app.redis, [`cache:wallet:balance:${fromWallet.id}`, `cache:wallet:balance:${recipient.wallet!.id}`]);
    this.logger.info({ userId: fromUserId, amount, reference, category: 'TRANSFER_OUT', result: 'completed' }, 'wallet.transfer');
    return { reference, amount, toPhone };
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
          category: WalletTransactionCategory.ORDER_PAYMENT,
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

  async buyAirtime(userId: string, phone: string, amount: number, network: string) {
    return this.buyBillFlow(userId, amount, WalletTransactionCategory.AIRTIME, { phone, network }, 'airtime');
  }

  async buyData(userId: string, phone: string, plan: string, network: string, amount: number) {
    return this.buyBillFlow(userId, amount, WalletTransactionCategory.DATA, { phone, plan, network }, 'data');
  }

  async buyElectricity(userId: string, meterNumber: string, amount: number, disco: string) {
    return this.buyBillFlow(userId, amount, WalletTransactionCategory.ELECTRICITY, { meterNumber, disco }, 'electricity');
  }

  private async buyBillFlow(
    userId: string,
    amount: number,
    category: WalletTransactionCategory,
    metadata: Record<string, unknown>,
    paystackType: 'airtime' | 'data' | 'electricity',
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
            description: `Bill payment: ${category}`,
            metadata: metadata as Prisma.JsonObject,
            balanceBefore: before,
            balanceAfter: after,
          },
        });
      });

      await initiateBillsCharge(paystackType, user.email, Math.round(amount * 100), 'N/A');

      await this.prisma.walletTransaction.update({ where: { reference }, data: { status: WalletTransactionStatus.COMPLETED } });
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
}
