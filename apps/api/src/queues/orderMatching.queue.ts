import { Queue } from 'bullmq';
import type { FastifyInstance } from 'fastify';

export const ORDER_MATCHING_QUEUE = 'order-matching';

export type OrderMatchingJob = {
  orderId: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
};

export function createOrderMatchingQueue(app: FastifyInstance) {
  return new Queue<OrderMatchingJob>(ORDER_MATCHING_QUEUE, { connection: app.redis });
}
