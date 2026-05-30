import { Queue } from 'bullmq';
import type { FastifyInstance } from 'fastify';

import { createOrderMatchingQueue, type OrderMatchingJob } from './orderMatching.queue';

export const NOTIFICATION_QUEUE = 'send-notification';
export const WALLET_OPS_QUEUE = 'wallet-ops';

export type NotificationJobType =
  | 'ORDER_CREATED'
  | 'ORDER_MATCHED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_PICKED_UP'
  | 'ORDER_DELIVERED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'TRANSFER_RECEIVED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED';

export type NotificationJobData = {
  userId: string;
  type: NotificationJobType;
  payload: Record<string, unknown>;
};

export type WalletOpsJob = {
  type: 'RECONCILE' | 'SETTLE' | 'REFUND';
  data: Record<string, unknown>;
};

export type AppQueues = {
  orderMatchingQueue: Queue<OrderMatchingJob>;
  notificationQueue: Queue<NotificationJobData>;
  walletOpsQueue: Queue<WalletOpsJob>;
};

export function createQueues(app: FastifyInstance): AppQueues {
  return {
    orderMatchingQueue: createOrderMatchingQueue(app),
    notificationQueue: new Queue<NotificationJobData>(NOTIFICATION_QUEUE, { connection: app.redis as never }),
    walletOpsQueue: new Queue<WalletOpsJob>(WALLET_OPS_QUEUE, { connection: app.redis as never }),
  };
}

export async function addOrderMatchingJob(app: FastifyInstance, job: OrderMatchingJob) {
  return app.queues.orderMatchingQueue.add('match-order', job, {
    removeOnComplete: 100,
    removeOnFail: 1000,
  });
}

export async function addNotificationJob(
  app: FastifyInstance,
  userId: string,
  type: NotificationJobType,
  payload: Record<string, unknown>,
) {
  return app.queues.notificationQueue.add(
    'send-notification',
    { userId, type, payload },
    { removeOnComplete: 500, removeOnFail: 1000 },
  );
}
