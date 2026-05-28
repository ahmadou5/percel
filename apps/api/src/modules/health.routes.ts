import type { FastifyPluginAsync } from 'fastify';

import { success } from '../utils/response';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    const [dbResult, redisResult, queueSizes] = await Promise.all([
      app.prisma.$queryRaw`SELECT 1 AS ok`.then(() => ({ ok: true })).catch(() => ({ ok: false })),
      app.redis.ping().then(() => ({ ok: true })).catch(() => ({ ok: false })),
      Promise.all([
        app.queues.orderMatchingQueue.getJobCounts('waiting', 'delayed', 'active'),
        app.queues.notificationQueue.getJobCounts('waiting', 'delayed', 'active'),
        app.queues.walletOpsQueue.getJobCounts('waiting', 'delayed', 'active'),
      ]),
    ]);

    const summarizeQueue = (counts: Awaited<(typeof queueSizes)[number]>) => ({
      counts,
      pending: Number(counts.waiting ?? 0) + Number(counts.delayed ?? 0),
    });

    const orderMatching = summarizeQueue(queueSizes[0]);
    const notification = summarizeQueue(queueSizes[1]);
    const walletOps = summarizeQueue(queueSizes[2]);

    const queueAlert = [orderMatching, notification, walletOps].some((item) => item.pending > 1000);

    return success(
      {
        status: dbResult.ok && redisResult.ok && !queueAlert ? 'ok' : 'degraded',
        uptime: process.uptime(),
        db: dbResult,
        redis: redisResult,
        queues: {
          orderMatching,
          notification,
          walletOps,
          alert: queueAlert,
        },
        timestamp: new Date().toISOString(),
      },
      'API is healthy',
    );
  });
};

export default healthRoutes;
