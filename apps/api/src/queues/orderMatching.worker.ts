import { OrderStatus } from '@prisma/client';
import { Worker } from 'bullmq';
import { Sentry } from '../lib/sentry.js';
import type { FastifyInstance } from 'fastify';

import { addNotificationJob } from './index.js';
import { broadcastNewOrder, broadcastOrderStatusUpdate, type RealtimeApp } from '../lib/realtime.js';
import { haversineDistanceKm } from '../utils/helpers.js';
import { ORDER_MATCHING_QUEUE, type OrderMatchingJob } from './orderMatching.queue.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createOrderMatchingWorker(app: FastifyInstance) {
  return new Worker<OrderMatchingJob>(
    ORDER_MATCHING_QUEUE,
    async (job) => {
      const { orderId, pickupLat, pickupLng } = job.data;
      const order = await app.prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== OrderStatus.PENDING_MATCH) return;

      const drivers = await app.prisma.driver.findMany({
        where: {
          isOnline: true,
          status: 'ACTIVE',
          currentLat: { not: null },
          currentLng: { not: null },
        },
      });

      const candidates = drivers
        .map((driver) => {
          const distanceKm = haversineDistanceKm(
            pickupLat,
            pickupLng,
            Number(driver.currentLat ?? 0),
            Number(driver.currentLng ?? 0),
          );
          const rating = Number(driver.rating ?? 5);
          const completionRate = Math.min(1, driver.totalDeliveries / 100);
          return {
            driverId: driver.id,
            distanceKm,
            score: rating * 0.6 + completionRate * 0.4 - distanceKm * 0.1,
          };
        })
        .filter((candidate) => candidate.distanceKm <= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      for (const candidate of candidates) {
        await app.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.MATCHED } });
        await app.redis.set(`order:offer:${orderId}`, candidate.driverId, 'EX', 65);
        broadcastNewOrder(app as RealtimeApp, candidate.driverId, { orderId, driverId: candidate.driverId });

        await addNotificationJob(app, order.userId, 'ORDER_MATCHED', {
          orderId,
          driverId: candidate.driverId,
          driverName: 'driver',
        });

        for (let i = 0; i < 60; i += 1) {
          const acceptedDriver = await app.redis.get(`order:accepted:${orderId}`);
          if (acceptedDriver === candidate.driverId) {
            await app.redis.del(`order:offer:${orderId}`);
            return;
          }
          await sleep(1000);
        }

        await app.redis.del(`order:offer:${orderId}`);
      }

      await app.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED, cancelReason: 'No driver accepted the order' },
      });
      broadcastOrderStatusUpdate(app as RealtimeApp, {
        orderId,
        status: OrderStatus.CANCELLED,
        message: 'No driver accepted the order',
        userId: order.userId,
      });
    },
    { connection: app.redis as never, autorun: true, concurrency: 5 },
  )
    .on('failed', (job, error) => {
      Sentry.captureException(error);
      app.log.error({ jobId: job?.id ?? null, error }, 'order.matching.worker.failed');
    })
    .on('error', (error) => {
      Sentry.captureException(error);
      app.log.error({ error }, 'order.matching.worker.error');
    });
}
