import crypto from 'node:crypto';

import { PaymentProvider, Prisma, WalletTransactionCategory, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { deleteCache } from '../../lib/cache.js';
import { createTransferRecipient, initiateTransfer as initiatePaystackTransfer } from '../../lib/paystack.js';
import { initiateMonnifyTransfer } from '../../lib/monnify.js';
import { initiateSquadTransfer, listSquadBanks } from '../../lib/squad.js';
import { addNotificationJob } from '../../queues/index.js';
import { ConflictError, NotFoundError, PaymentError, ValidationError } from '../../utils/errors.js';
import { cleanText } from '../../utils/sanitize.js';

const PLATFORM_USER_ID = '00000000-0000-0000-0000-000000000000';
const PLATFORM_WALLET_ID = '00000000-0000-0000-0000-000000000001';

export const MIN_PAYOUT_AMOUNT = 1000;

export type PayoutRequestInput = {
  amount: number;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
};

function newReference(prefix: string) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function resolveBankCode(bankName?: string | null): Promise<string | null> {
  const needle = bankName?.trim().toLowerCase();
  if (!needle) return null;
  const banks = await listSquadBanks();
  const match = banks.find((bank) => {
    const name = bank.name.toLowerCase();
    return name === needle || name.includes(needle) || needle.includes(name);
  });
  return match?.code ?? null;
}

type DisbursementResult = {
  provider: PaymentProvider;
  providerReference: string;
};

async function ensurePlatformWallet(tx: Prisma.TransactionClient) {
  let systemUser = await tx.user.findUnique({ where: { id: PLATFORM_USER_ID } });
  if (!systemUser) {
    systemUser = await tx.user.create({
      data: {
        id: PLATFORM_USER_ID,
        email: 'system@percel.app',
        phone: '+2348000000009',
        passwordHash: '$2a$12$systemuserpasswordplaceholderhashed',
        fullName: 'Percel System Platform',
      },
    });
  }

  const existing = await tx.wallet.findUnique({ where: { id: PLATFORM_WALLET_ID } });
  if (!existing) {
    await tx.wallet.create({
      data: {
        id: PLATFORM_WALLET_ID,
        userId: PLATFORM_USER_ID,
        balance: 0,
        ledgerBalance: 0,
      },
    });
  }
}

async function disburse(params: {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  reference: string;
}): Promise<DisbursementResult> {
  const errors: string[] = [];

  const monnifyConfigured = Boolean(env.MONNIFY_API_KEY && env.MONNIFY_SECRET_KEY && env.MONNIFY_CONTRACT_CODE);
  if (monnifyConfigured) {
    try {
      const res = await initiateMonnifyTransfer({
        reference: params.reference,
        amount: params.amount,
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        accountName: params.accountName,
        reason: 'Percel driver payout',
      });
      if (res?.recipientCode) {
        return { provider: PaymentProvider.MONNIFY, providerReference: res.recipientCode };
      }
      errors.push('Monnify returned no transfer reference');
    } catch (err) {
      errors.push(`Monnify: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    const recipient = await createTransferRecipient({
      name: params.accountName,
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
    });
    if (recipient?.recipient_code) {
      const res = await initiatePaystackTransfer({
        recipient: recipient.recipient_code,
        amount: params.amount,
        reference: params.reference,
        reason: 'Percel driver payout',
      });
      if (res?.reference || res?.transfer_code) {
        return {
          provider: PaymentProvider.PAYSTACK,
          providerReference: res.reference ?? res.transfer_code ?? params.reference,
        };
      }
      errors.push('Paystack returned no transfer reference');
    } else {
      errors.push('Paystack returned no recipient code');
    }
  } catch (err) {
    errors.push(`Paystack: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (env.SQUAD_SECRET_KEY) {
    try {
      const res = await initiateSquadTransfer({
        reference: params.reference,
        amountKobo: Math.round(params.amount * 100),
        accountNumber: params.accountNumber,
        bankCode: params.bankCode,
        accountName: params.accountName,
        reason: 'Percel driver payout',
      });
      if (res?.recipientCode) {
        return { provider: PaymentProvider.SQUAD, providerReference: res.recipientCode };
      }
      errors.push('Squad returned no transfer reference');
    } catch (err) {
      errors.push(`Squad: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(errors.join(' | ') || 'No payment provider configured for payouts');
}

export async function requestDriverPayout(app: FastifyInstance, userId: string, input: PayoutRequestInput) {
  if (!Number.isFinite(input.amount)) throw new ValidationError('Invalid payout amount');
  const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
  if (amount.lte(0)) throw new ValidationError('Payout amount must be greater than zero');
  if (amount.lt(MIN_PAYOUT_AMOUNT)) {
    throw new ValidationError(`Minimum payout amount is ₦${MIN_PAYOUT_AMOUNT.toLocaleString()}`);
  }

  const driver = await app.prisma.driver.findFirst({
    where: { userId },
    select: { id: true, status: true, user: { select: { fullName: true } } },
  });
  if (!driver) throw new NotFoundError('Driver profile not found');
  if (driver.status === 'SUSPENDED') throw new PaymentError('Suspended drivers cannot request payouts');

  const wallet = await app.prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new NotFoundError('Wallet not found');
  if (!wallet.isActive) throw new PaymentError('Wallet is not active');

  const bankName = cleanText(input.bankName ?? wallet.bankName ?? '') ?? '';
  const accountNumber = (input.accountNumber ?? wallet.nuban ?? '').replace(/\s/g, '');
  const bankCode = (input.bankCode ?? wallet.bankCode ?? '').trim();
  const accountName = cleanText(input.accountName ?? driver.user.fullName ?? '')?.toUpperCase() ?? '';

  if (!bankName || !accountNumber) {
    throw new ValidationError('Bank name and account number are required for payout');
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new ValidationError('A valid 10-digit Nigerian bank account number is required');
  }

  const reference = newReference('PO_REQ');

  const payout = await app.prisma.$transaction(async (tx) => {
    const held = await tx.wallet.updateMany({
      where: { id: wallet.id, isActive: true, balance: { gte: amount } },
      data: { balance: { decrement: amount }, ledgerBalance: { decrement: amount } },
    });
    if (held.count === 0) {
      throw new PaymentError('Insufficient wallet balance for this payout');
    }

    const before = Number(wallet.balance);
    const after = before - Number(amount);

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: WalletTransactionType.DEBIT,
        category: WalletTransactionCategory.PAYOUT,
        status: WalletTransactionStatus.PENDING,
        reference,
        description: `Driver payout request to ${bankName} • ${accountNumber}`,
        metadata: { payoutRequest: true, bankName, bankCode: bankCode || null, accountNumber, accountName },
        balanceBefore: before,
        balanceAfter: after,
      },
    });

    return tx.payout.create({
      data: {
        driverId: driver.id,
        walletTransactionId: transaction.id,
        amount,
        status: 'PENDING',
        bankName,
        bankCode: bankCode || null,
        accountNumber,
        accountName,
      },
    });
  });

  await deleteCache(app.redis, `cache:wallet:balance:${wallet.id}`);

  await addNotificationJob(app, userId, 'PAYMENT_RECEIVED', {
    kind: 'payout_requested',
    payoutId: payout.id,
    amount: Number(amount),
    bankName,
  });

  return payout;
}

export async function approveDriverPayout(app: FastifyInstance, payoutId: string) {
  const payout = await app.prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      walletTransaction: true,
      driver: { select: { userId: true, user: { select: { fullName: true } } } },
    },
  });
  if (!payout) throw new NotFoundError('Payout not found');
  if (payout.status !== 'PENDING') throw new ConflictError(`Payout has already been ${payout.status.toLowerCase()}`);

  const amount = Number(payout.amount);
  const bankCode = payout.bankCode ?? (await resolveBankCode(payout.bankName));
  if (!bankCode) {
    throw new PaymentError(
      `Unable to resolve the bank code for "${payout.bankName}". Update the payout with a valid bank code before approving.`,
    );
  }

  let result: DisbursementResult;
  try {
    result = await disburse({
      amount,
      bankCode,
      accountNumber: payout.accountNumber ?? '',
      accountName: payout.accountName ?? payout.driver.user.fullName.toUpperCase(),
      reference: newReference('PO_PAY'),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway transfer failed';
    await app.prisma.payout.update({
      where: { id: payout.id },
      data: { failureReason: message.slice(0, 500) },
    });
    throw new PaymentError(`Gateway transfer failed — funds remain held. ${message}`);
  }

  const updated = await app.prisma.$transaction(async (tx) => {
    await ensurePlatformWallet(tx);

    const claimed = await tx.payout.updateMany({
      where: { id: payout.id, status: 'PENDING' },
      data: {
        status: 'PAID',
        provider: result.provider,
        providerReference: result.providerReference,
        failureReason: null,
        processedAt: new Date(),
      },
    });
    if (claimed.count === 0) throw new ConflictError('Payout has already been processed');

    await tx.walletTransaction.update({
      where: { id: payout.walletTransaction.id },
      data: {
        status: WalletTransactionStatus.COMPLETED,
        description: `Driver payout settled via ${result.provider}`,
        paystackReference: result.providerReference,
      },
    });

    await tx.driverEarning.updateMany({
      where: { driverId: payout.driverId, status: 'PENDING' },
      data: { status: 'SETTLED', settledAt: new Date() },
    });

    await tx.ledgerEntry.create({
      data: {
        debitWalletId: payout.walletTransaction.walletId,
        creditWalletId: PLATFORM_WALLET_ID,
        amount: payout.amount,
        reference: `LEDGER_${payout.walletTransaction.reference}`,
        description: `Driver payout via ${result.provider}`,
      },
    });

    return tx.payout.findUnique({ where: { id: payout.id }, include: { driver: { select: { userId: true } } } });
  });

  await deleteCache(app.redis, `cache:wallet:balance:${payout.walletTransaction.walletId}`);

  await addNotificationJob(app, updated!.driver.userId, 'PAYMENT_RECEIVED', {
    kind: 'payout_paid',
    payoutId: payout.id,
    amount,
    provider: result.provider,
    reference: result.providerReference,
  });

  return updated!;
}

export async function rejectDriverPayout(app: FastifyInstance, payoutId: string, reason: string) {
  const cleanedReason = cleanText(reason)?.trim();
  if (!cleanedReason) throw new ValidationError('A rejection reason is required');

  const payout = await app.prisma.payout.findUnique({
    where: { id: payoutId },
    include: { walletTransaction: true, driver: { select: { userId: true } } },
  });
  if (!payout) throw new NotFoundError('Payout not found');
  if (payout.status !== 'PENDING') throw new ConflictError(`Payout has already been ${payout.status.toLowerCase()}`);

  await app.prisma.$transaction(async (tx) => {
    await ensurePlatformWallet(tx);

    const claimed = await tx.payout.updateMany({
      where: { id: payout.id, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        rejectionReason: cleanedReason.slice(0, 500),
        failureReason: null,
        processedAt: new Date(),
      },
    });
    if (claimed.count === 0) throw new ConflictError('Payout has already been processed');

    await tx.walletTransaction.update({
      where: { id: payout.walletTransaction.id },
      data: { status: WalletTransactionStatus.REVERSED },
    });

    const wallet = await tx.wallet.findUnique({ where: { id: payout.walletTransaction.walletId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const before = Number(wallet.balance);
    const after = before + Number(payout.amount);

    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: after, ledgerBalance: after } });

    const refundRef = `${payout.walletTransaction.reference}_REFUND`;
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: payout.amount,
        type: WalletTransactionType.CREDIT,
        category: WalletTransactionCategory.REFUND,
        status: WalletTransactionStatus.COMPLETED,
        reference: refundRef,
        description: `Payout rejected — funds returned. ${cleanedReason}`,
        metadata: { payoutId: payout.id, reason: cleanedReason },
        balanceBefore: before,
        balanceAfter: after,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        debitWalletId: PLATFORM_WALLET_ID,
        creditWalletId: wallet.id,
        amount: payout.amount,
        reference: `LEDGER_${refundRef}`,
        description: 'Payout rejection refund',
      },
    });
  });

  await deleteCache(app.redis, `cache:wallet:balance:${payout.walletTransaction.walletId}`);

  await addNotificationJob(app, payout.driver.userId, 'PAYMENT_RECEIVED', {
    kind: 'payout_rejected',
    payoutId: payout.id,
    amount: Number(payout.amount),
    reason: cleanedReason,
  });
}
