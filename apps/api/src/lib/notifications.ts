import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import type { FastifyInstance } from 'fastify';

import type { NotificationJobType } from '../queues';

const expo = new Expo();

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function formatAmount(amount: unknown) {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildTitle(type: NotificationJobType) {
  switch (type) {
    case 'ORDER_CREATED':
      return 'Order created';
    case 'ORDER_MATCHED':
      return 'Driver found';
    case 'ORDER_ACCEPTED':
      return 'Order accepted';
    case 'ORDER_PICKED_UP':
      return 'Package picked up';
    case 'ORDER_DELIVERED':
      return 'Package delivered';
    case 'ORDER_COMPLETED':
      return 'Delivery complete';
    case 'ORDER_CANCELLED':
      return 'Order cancelled';
    case 'PAYMENT_RECEIVED':
      return 'Wallet funded';
    case 'TRANSFER_RECEIVED':
      return 'Money received';
    case 'KYC_APPROVED':
      return 'KYC approved';
    case 'KYC_REJECTED':
      return 'KYC rejected';
    default:
      return 'Percel update';
  }
}

export function buildNotificationPayload(type: NotificationJobType, payload: Record<string, unknown>): NotificationPayload {
  switch (type) {
    case 'ORDER_CREATED':
      return {
        title: buildTitle(type),
        body: 'Your order has been placed. Finding a driver...',
        data: payload,
      };
    case 'ORDER_MATCHED':
      return {
        title: buildTitle(type),
        body: `Driver found. ${String(payload.driverName ?? 'A driver')} is on the way.`,
        data: payload,
      };
    case 'ORDER_ACCEPTED':
      return {
        title: buildTitle(type),
        body: 'Driver accepted your order.',
        data: payload,
      };
    case 'ORDER_PICKED_UP':
      return {
        title: buildTitle(type),
        body: `${String(payload.driverName ?? 'Your driver')} has picked up your package.`,
        data: payload,
      };
    case 'ORDER_DELIVERED':
      return {
        title: buildTitle(type),
        body: 'Your package has been delivered. Confirm receipt.',
        data: payload,
      };
    case 'ORDER_COMPLETED':
      return {
        title: buildTitle(type),
        body: 'Delivery complete. Rate your experience.',
        data: payload,
      };
    case 'ORDER_CANCELLED':
      return {
        title: buildTitle(type),
        body: 'Your order was cancelled. Refund in progress.',
        data: payload,
      };
    case 'PAYMENT_RECEIVED':
      return {
        title: buildTitle(type),
        body: `${formatAmount(payload.amount)} added to your wallet.`,
        data: payload,
      };
    case 'TRANSFER_RECEIVED':
      return {
        title: buildTitle(type),
        body: `${formatAmount(payload.amount)} received from ${String(payload.senderName ?? 'another user')}.`,
        data: payload,
      };
    case 'KYC_APPROVED':
      return {
        title: buildTitle(type),
        body: 'Your account is approved. Go online to start earning.',
        data: payload,
      };
    case 'KYC_REJECTED':
      return {
        title: buildTitle(type),
        body: `KYC rejected: ${String(payload.reason ?? 'Please resubmit.')}`,
        data: payload,
      };
    default:
      return {
        title: 'Percel update',
        body: 'You have a new update.',
        data: payload,
      };
  }
}

async function clearInvalidToken(app: FastifyInstance, userId: string, token: string) {
  await app.prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: null },
  });
  app.log.warn({ userId, token }, 'notifications.push_token_cleared');
}

export async function sendPushNotification(app: FastifyInstance, userId: string, notification: NotificationPayload) {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });

  const token = user?.expoPushToken;
  if (!token) {
    app.log.warn({ userId }, 'notifications.push_token_missing');
    return { sent: false };
  }

  if (!Expo.isExpoPushToken(token)) {
    await clearInvalidToken(app, userId, token);
    return { sent: false };
  }

  const message: ExpoPushMessage = {
    to: token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
  };

  const tickets: ExpoPushTicket[] = [];
  for (const chunk of expo.chunkPushNotifications([message])) {
    const result = await expo.sendPushNotificationsAsync(chunk);
    tickets.push(...result);
  }

  for (const ticket of tickets) {
    if (ticket.status !== 'error') continue;
    const error = ticket.details?.error;
    if (error === 'DeviceNotRegistered' || error === 'InvalidCredentials') {
      await clearInvalidToken(app, userId, token);
    }
    app.log.warn({ userId, error, ticket }, 'notifications.push_send_failed');
  }

  return { sent: true, tickets };
}

export async function sendBulkNotifications(
  app: FastifyInstance,
  userIds: string[],
  notification: NotificationPayload,
) {
  const uniqueUserIds = Array.from(new Set(userIds));
  return Promise.allSettled(uniqueUserIds.map((userId) => sendPushNotification(app, userId, notification)));
}
