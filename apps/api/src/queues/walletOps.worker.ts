import { WalletTransactionCategory, WalletTransactionStatus } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { Worker } from 'bullmq';

import { getMonnifyTransferStatus } from '../lib/monnify.js';
import { verifyTransferStatus } from '../lib/paystack.js';
import { sendPushNotification } from '../lib/notifications.js';
import { Sentry } from '../lib/sentry.js';
import { classifyVtpassResponse, queryVtpassTransaction } from '../lib/vtpass.js';
import { WALLET_OPS_QUEUE, type WalletOpsJob } from './index.js';

type TxMetadata = {
  vtpassRequestId?: string;
  providerReference?: string;
  provider?: string;
};

const STALE_AFTER_MS = 2 * 60 * 1000;

async function reverseFailedDebit(app: FastifyInstance, reference: string, walletId: string, userId: string, amount: number, reason: string) {
  await app.prisma.$transaction(async (trx) => {
    const original = await trx.walletTransaction.findUnique({ where: { reference } });
    if (!original || original.status !== WalletTransactionStatus.PENDING) return;

    await trx.walletTransaction.update({ where: { reference }, data: { status: WalletTransactionStatus.FAILED } });

    const wallet = await trx.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) return;

    const before = Number(wallet.balance);
    const after = before + amount;

    await trx.wallet.update({ where: { id: walletId }, data: { balance: after, ledgerBalance: after } });

    const reversalRef = `${reference}_REVERSAL`;
    await trx.walletTransaction.create({
      data: {
        walletId,
        amount,
        type: 'CREDIT',
        category: WalletTransactionCategory.REFUND,
        status: WalletTransactionStatus.COMPLETED,
        reference: reversalRef,
        description: `Reversal: ${reason}`.slice(0, 200),
        metadata: { reversedReference: reference, reason },
        balanceBefore: before,
        balanceAfter: after,
      },
    });
  });

  void sendPushNotification(app, userId, {
    title: 'Transaction Reversed',
    body: `₦${amount.toLocaleString()} has been returned to your wallet. ${reason}`.slice(0, 160),
    data: { kind: 'wallet_reversal' },
  }).catch(() => undefined);
}

async function settlePending(app: FastifyInstance, reference: string) {
  await app.prisma.walletTransaction.update({
    where: { reference },
    data: { status: WalletTransactionStatus.COMPLETED },
  });
}

async function reconcilePendingWalletOps(app: FastifyInstance) {
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

  const pendingBills = await app.prisma.walletTransaction.findMany({
    where: {
      category: { in: [WalletTransactionCategory.AIRTIME, WalletTransactionCategory.DATA, WalletTransactionCategory.ELECTRICITY, WalletTransactionCategory.TV] },
      status: WalletTransactionStatus.PENDING,
      createdAt: { lt: staleBefore },
    },
    include: { wallet: { select: { id: true, userId: true } } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  for (const tx of pendingBills) {
    const meta = (tx.metadata ?? {}) as TxMetadata;
    if (!meta.vtpassRequestId) continue;

    try {
      const res = await queryVtpassTransaction(meta.vtpassRequestId);
      const outcome = classifyVtpassResponse(res);
      if (outcome === 'SUCCESS') {
        await settlePending(app, tx.reference);
      } else if (outcome === 'FAILED') {
        await reverseFailedDebit(
          app,
          tx.reference,
          tx.wallet.id,
          tx.wallet.userId,
          Number(tx.amount),
          String(res?.response_description ?? 'VTpass reported the transaction as failed'),
        );
      }
    } catch (err) {
      app.log.warn({ reference: tx.reference, err }, 'walletops.requery_failed');
    }
  }

  const pendingTransfers = await app.prisma.walletTransaction.findMany({
    where: {
      category: WalletTransactionCategory.TRANSFER_OUT,
      status: WalletTransactionStatus.PENDING,
      createdAt: { lt: staleBefore },
    },
    include: { wallet: { select: { id: true, userId: true } } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  for (const tx of pendingTransfers) {
    const meta = (tx.metadata ?? {}) as TxMetadata;
    let outcome: 'SUCCESS' | 'PENDING' | 'FAILED' = 'PENDING';
    try {
      if (meta.provider === 'MONNIFY') {
        outcome = await getMonnifyTransferStatus(tx.reference);
      } else if (!meta.provider || meta.provider === 'PAYSTACK') {
        outcome = await verifyTransferStatus(tx.reference);
      } else {
        continue;
      }
    } catch (err) {
      app.log.warn({ reference: tx.reference, err }, 'walletops.transfer_poll_failed');
      continue;
    }

    if (outcome === 'SUCCESS') {
      await settlePending(app, tx.reference);
    } else if (outcome === 'FAILED') {
      await reverseFailedDebit(
        app,
        tx.reference,
        tx.wallet.id,
        tx.wallet.userId,
        Number(tx.amount),
        'The bank transfer could not be completed',
      );
    }
  }
}

export function createWalletOpsWorker(app: FastifyInstance) {
  return new Worker<WalletOpsJob>(
    WALLET_OPS_QUEUE,
    async (job) => {
      if (job.data.type !== 'RECONCILE') return;
      await reconcilePendingWalletOps(app);
    },
    { connection: app.redis as never, autorun: true, concurrency: 1 },
  )
    .on('failed', (job, error) => {
      Sentry.captureException(error);
      app.log.error({ jobId: job?.id ?? null, error }, 'walletops.worker.failed');
    })
    .on('error', (error) => {
      Sentry.captureException(error);
      app.log.error({ error }, 'walletops.worker.error');
    });
}
