import { Worker } from 'bullmq';
import { Sentry } from '../../lib/sentry';
import type { FastifyInstance } from 'fastify';

import { buildNotificationPayload, sendPushNotification } from '../../lib/notifications';
import { NOTIFICATION_QUEUE, type NotificationJobData } from '..';

export function createNotificationWorker(app: FastifyInstance) {
  return new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE,
    async (job) => {
      const payload = buildNotificationPayload(job.data.type, job.data.payload);
      await sendPushNotification(app, job.data.userId, payload);
      return { delivered: true };
    },
    { connection: app.redis as never, autorun: true, concurrency: 20 },
  )
    .on('failed', (job, error) => {
      Sentry.captureException(error);
      app.log.error({ jobId: job?.id ?? null, error }, 'notification.worker.failed');
    })
    .on('error', (error) => {
      Sentry.captureException(error);
      app.log.error({ error }, 'notification.worker.error');
    });
}
