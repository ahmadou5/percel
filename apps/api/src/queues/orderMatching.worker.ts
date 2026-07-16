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

      // ─────────────────────────────────────────────────────────────────────
      // Helper: fetch the top-3 scored nearby drivers for this order
      // ─────────────────────────────────────────────────────────────────────
      const findCandidates = async () => {
        const isLocal = order.deliveryType === 'INTRASTATE';
        const drivers = await app.prisma.driver.findMany({
          where: {
            isOnline: true,
            status: 'ACTIVE',
            currentLat: { not: null },
            currentLng: { not: null },
            ...(isLocal
              ? {
                  driverMode: { in: ['LOCAL', 'BOTH'] },
                  serviceCity: { equals: order.pickupCity, mode: 'insensitive' },
                }
              : {
                  driverMode: { in: ['INTERSTATE', 'BOTH'] },
                }),
          },
        });
        return drivers
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
          // .filter((c) => c.distanceKm <= 20) // Removed for testing
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
      };

      // ─────────────────────────────────────────────────────────────────────
      // Wait up to 3 minutes for at least one nearby driver to appear.
      // Poll every 15 seconds. This handles the case where the driver goes
      // online a few moments after the order is placed.
      // ─────────────────────────────────────────────────────────────────────
      const WAIT_LIMIT_MS = 3 * 60 * 1000; // 3 minutes
      const POLL_INTERVAL_MS = 15_000;       // 15 seconds
      const startedAt = Date.now();

      let candidates = await findCandidates();

      while (candidates.length === 0 && Date.now() - startedAt < WAIT_LIMIT_MS) {
        // Bail early if order was externally cancelled/accepted while waiting
        const liveStatus = await app.prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
        if (!liveStatus || liveStatus.status !== OrderStatus.PENDING_MATCH) return;

        app.log.info({ orderId, elapsed: Date.now() - startedAt }, 'order.matching.waiting_for_driver');
        await sleep(POLL_INTERVAL_MS);
        candidates = await findCandidates();
      }

      // If still no candidates after the wait window, cancel the order
      if (candidates.length === 0) {
        await app.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CANCELLED, cancelReason: 'No driver available in your area' },
        });
        broadcastOrderStatusUpdate(app as RealtimeApp, {
          orderId,
          status: OrderStatus.CANCELLED,
          message: 'No driver available in your area',
          userId: order.userId,
        });
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // Try each candidate one by one — offer for 60 s each
      // ─────────────────────────────────────────────────────────────────────
      for (const candidate of candidates) {
        // Re-check order is still waiting before making each offer
        const freshOrder = await app.prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        if (
          !freshOrder ||
          (freshOrder.status !== OrderStatus.PENDING_MATCH && freshOrder.status !== OrderStatus.MATCHED)
        ) {
          // Order was accepted or cancelled externally — stop processing
          return;
        }

        // Mark as MATCHED and send the offer to this specific driver
        const fullOrder = await app.prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            trackingCode: true,
            status: true,
            paymentStatus: true,
            price: true,
            currency: true,
            size: true,
            pickupFormattedAddress: true,
            deliveryFormattedAddress: true,
            distanceKm: true,
            estimatedDurationMin: true,
            createdAt: true,
          },
        });
        await app.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.MATCHED } });
        await app.redis.set(`order:offer:${orderId}`, candidate.driverId, 'EX', 65);
        broadcastNewOrder(app as RealtimeApp, candidate.driverId, {
          orderId,
          driverId: candidate.driverId,
          ...(fullOrder
            ? {
                id: fullOrder.id,
                trackingCode: fullOrder.trackingCode,
                status: 'MATCHED',
                paymentStatus: fullOrder.paymentStatus,
                price: Number(fullOrder.price),
                currency: fullOrder.currency,
                size: fullOrder.size,
                pickupFormattedAddress: fullOrder.pickupFormattedAddress,
                deliveryFormattedAddress: fullOrder.deliveryFormattedAddress,
                distanceKm: Number(fullOrder.distanceKm),
                estimatedDurationMin: fullOrder.estimatedDurationMin,
                createdAt: fullOrder.createdAt.toISOString(),
              }
            : {}),
        });

        await addNotificationJob(app, order.userId, 'ORDER_MATCHED', {
          orderId,
          driverId: candidate.driverId,
          driverName: 'driver',
        });

        // Poll for up to 60 seconds to see if this driver accepts
        let accepted = false;
        for (let i = 0; i < 60; i += 1) {
          const acceptedDriver = await app.redis.get(`order:accepted:${orderId}`);
          if (acceptedDriver === candidate.driverId) {
            accepted = true;
            break;
          }
          await sleep(1000);
        }

        await app.redis.del(`order:offer:${orderId}`);

        if (accepted) return; // Driver confirmed — done

        // Offer timed out. Reset back to PENDING_MATCH only if nobody else changed the status.
        const afterTimeout = await app.prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        if (afterTimeout?.status === OrderStatus.MATCHED) {
          // Still in MATCHED (offer expired without acceptance) — safe to reset
          await app.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.PENDING_MATCH },
          });
        } else {
          // Accepted or cancelled while we were waiting — bail out
          return;
        }
      }

      // All candidates exhausted without any acceptance — cancel the order
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
