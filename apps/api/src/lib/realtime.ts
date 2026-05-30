import type { FastifyInstance } from 'fastify';
import type IORedis from 'ioredis';
import type { Server } from 'socket.io';

import { env } from '../config/env.js';

export type RealtimeApp = FastifyInstance & {
  io: Server | null;
  redis: IORedis;
};

export type LocationPayload = {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: string;
  orderId?: string | null;
  userId?: string | null;
};

export type StatusPayload = {
  orderId: string;
  status: string;
  message?: string | null;
  timestamp?: string;
};

function getIo(app: RealtimeApp) {
  return app.io;
}

function timestamp(value?: string) {
  return value ?? new Date().toISOString();
}

function parseOrigins() {
  if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') return '*';
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function describeSocketOrigins() {
  return parseOrigins();
}

export async function attachRealtimeBridge(app: RealtimeApp) {
  const subscriber = app.redis.duplicate();
  await subscriber.connect();
  await subscriber.subscribe('driver:location');

  subscriber.on('message', async (_channel, message) => {
    try {
      const payload = JSON.parse(message) as LocationPayload;
      const trackingRaw = await app.redis.get(`driver:tracking:${payload.driverId}`);
      const tracking = trackingRaw ? (JSON.parse(trackingRaw) as { userId?: string; orderId?: string }) : null;
      broadcastDriverLocation(app, {
        ...payload,
        userId: tracking?.userId ?? payload.userId ?? null,
        orderId: tracking?.orderId ?? payload.orderId ?? null,
      });
    } catch (error) {
      app.log.warn({ error }, 'Failed to bridge driver location event');
    }
  });

  app.addHook('onClose', async () => {
    try {
      await subscriber.unsubscribe('driver:location');
    } catch {
      // ignore shutdown race
    }

    if (subscriber.status === 'ready' || subscriber.status === 'connect') {
      await subscriber.quit();
    }
  });
}

export function emitToUser(app: RealtimeApp, userId: string, event: string, payload: unknown) {
  const io = getIo(app);
  if (!io) return;
  io.of('/user').to(`user:${userId}`).emit(event, payload);
}

export function emitToDriver(app: RealtimeApp, driverId: string, event: string, payload: unknown) {
  const io = getIo(app);
  if (!io) return;
  io.of('/driver').to(`driver:${driverId}`).emit(event, payload);
}

export function broadcastNewOrder(app: RealtimeApp, driverId: string, orderPayload: Record<string, unknown>) {
  if (!driverId) return;
  emitToDriver(app, driverId, 'new_order_available', {
    ...orderPayload,
    timestamp: timestamp(),
  });
}

export function broadcastOrderStatusUpdate(
  app: RealtimeApp,
  payload: StatusPayload & { userId?: string; driverId?: string | null },
) {
  const eventPayload = {
    orderId: payload.orderId,
    status: payload.status,
    message: payload.message ?? null,
    timestamp: timestamp(payload.timestamp),
  };

  if (payload.userId) {
    emitToUser(app, payload.userId, 'order_status_update', eventPayload);
  }

  if (payload.driverId) {
    emitToDriver(app, payload.driverId, 'order_status_update', eventPayload);
  }

  if (payload.status === 'CANCELLED') {
    if (payload.userId) {
      emitToUser(app, payload.userId, 'order_cancelled', eventPayload);
    }

    if (payload.driverId) {
      emitToDriver(app, payload.driverId, 'order_cancelled', eventPayload);
    }
  }
}

export function broadcastDriverLocation(app: RealtimeApp, payload: LocationPayload) {
  const io = getIo(app);
  if (!io) return;

  const eventPayload = {
    driverId: payload.driverId,
    orderId: payload.orderId ?? null,
    lat: payload.lat,
    lng: payload.lng,
    heading: payload.heading ?? 0,
    speed: payload.speed ?? 0,
    timestamp: timestamp(payload.timestamp),
  };

  if (payload.userId) {
    emitToUser(app, payload.userId, 'driver_location', eventPayload);
  }

  emitToDriver(app, payload.driverId, 'driver_location', eventPayload);
}

export async function setActiveDriverTracking(
  app: RealtimeApp,
  driverId: string,
  tracking: { userId: string; orderId: string },
  ttlSeconds = 60 * 60 * 24,
) {
  await app.redis.set(`driver:tracking:${driverId}`, JSON.stringify(tracking), 'EX', ttlSeconds);
}

export async function clearActiveDriverTracking(app: RealtimeApp, driverId: string) {
  if (!driverId) return;
  await app.redis.del(`driver:tracking:${driverId}`);
}
