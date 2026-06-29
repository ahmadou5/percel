import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import multipartPlugin from '@fastify/multipart';
import compressPlugin from './plugins/compress.js';
import { fastifyRequestContext } from '@fastify/request-context';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { env } from './config/env.js';
import { Sentry } from './lib/sentry.js';
import healthRoutes from './modules/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import driverRoutes from './modules/driver/driver.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import userRoutes from './modules/user/user.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import referralRoutes from './modules/referral/referral.routes.js';
import corsPlugin from './plugins/cors.js';
import helmetPlugin from './plugins/helmet.js';
import jwtPlugin from './plugins/jwt.js';
import prismaPlugin from './plugins/prisma.js';
import rateLimitPlugin from './plugins/rateLimit.js';
import redisPlugin from './plugins/redis.js';
import socketPlugin from './plugins/socket.js';
import swaggerPlugin from './plugins/swagger.js';
import { createQueues } from './queues/index.js';
import { createNotificationWorker } from './queues/workers/notification.worker.js';
import { createOrderMatchingWorker } from './queues/orderMatching.worker.js';
import { AppError, InternalError, NotFoundError } from './utils/errors.js';
import { error } from './utils/response.js';

function getUserId(request: { user?: unknown }) {
  const user = request.user as { sub?: string } | null | undefined;
  if (user && typeof user === 'object' && 'sub' in user) {
    return (user as { sub?: string }).sub ?? null;
  }
  return null;
}

export async function buildApp(): Promise<FastifyInstance> {
  const loggerOptions = {
    redact: {
      paths: [
        'req.headers.authorization',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.pin',
        'req.body.currentPin',
        'req.body.newPin',
        'req.body.bvn',
        'req.body.nin',
        'req.body.cardNumber',
        'req.body.accountNumber',
        'req.body.apiKey',
      ],
      censor: '[REDACTED]',
    },
    ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : { level: 'info' as const }),
  };

  const app = Fastify({
    bodyLimit: 100 * 1024,
    logger: loggerOptions,
  });

  await app.register(fastifyRequestContext, {
    defaultStoreValues: (request) => ({
      requestId: request.id,
      userId: null,
      role: null,
      startTime: Date.now(),
    }),
  });

  app.addHook('onRequest', async (request) => {
    request.requestContext.set('requestId', request.id);
    request.requestContext.set('startTime', Date.now());
  });

  app.addHook('onResponse', async (request, reply) => {
    const startTime = request.requestContext.get('startTime') ?? Date.now();
    const durationMs = Date.now() - startTime;
    const userId = request.requestContext.get('userId') ?? getUserId(request);
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTimeMs: durationMs,
        userId,
      },
      'request.completed',
    );
  });

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(jwtPlugin);
  await app.register(multipartPlugin, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(compressPlugin);
  app.decorate('queues', createQueues(app));
  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);
  await app.register(socketPlugin);

  await app.register(async (instance) => {
    await instance.register(healthRoutes, { prefix: '/api/v1' });
    await instance.register(authRoutes, { prefix: '/api/v1/auth' });
    await instance.register(driverRoutes, { prefix: '/api/v1' });
    await instance.register(userRoutes, { prefix: '/api/v1' });
    await instance.register(walletRoutes, { prefix: '/api/v1' });
    await instance.register(orderRoutes, { prefix: '/api/v1' });
    await instance.register(referralRoutes, { prefix: '/api/v1' });
  });

  const orderWorker = createOrderMatchingWorker(app);
  const notificationWorker = createNotificationWorker(app);

  const bullBoardAdapter = new FastifyAdapter();
  bullBoardAdapter.setBasePath('/admin/queues');
  createBullBoard({
    queues: [
      new BullMQAdapter(app.queues.orderMatchingQueue),
      new BullMQAdapter(app.queues.notificationQueue),
      new BullMQAdapter(app.queues.walletOpsQueue),
    ],
    serverAdapter: bullBoardAdapter,
  });

  await app.register(async (instance) => {
    instance.addHook('preHandler', instance.authenticateAdmin);
    await instance.register(bullBoardAdapter.registerPlugin(), { prefix: '/admin/queues' });
  });

  app.addHook('onError', async (request, _reply, err) => {
    const userId = request.requestContext.get('userId') ?? getUserId(request);
    request.log.error(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        userId,
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
      },
      'request.failed',
    );

    Sentry.withScope((scope) => {
      scope.setTag('requestId', request.id);
      scope.setTag('method', request.method);
      scope.setTag('url', request.url);
      if (userId) scope.setUser({ id: userId });
      scope.setContext('fastify', {
        route: request.url,
        statusCode: request.raw.statusCode,
      });
      Sentry.captureException(err);
    });
  });

  app.addHook('onClose', async () => {
    await orderWorker.close();
    await notificationWorker.close();
  });

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send(error('Validation failed', 'VALIDATION_ERROR', err.issues));
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return reply.status(409).send(error('Duplicate value detected', 'CONFLICT'));
      }

      if (err.code === 'P2025') {
        return reply.status(404).send(error('Resource not found', 'NOT_FOUND'));
      }

      return reply.status(400).send(error('Database request failed', 'VALIDATION_ERROR'));
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
      return reply.status(400).send(error('Database validation failed', 'VALIDATION_ERROR'));
    }

    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(error(err.message, err.code));
    }

    request.log.error({ err, requestId: request.id, userId: request.requestContext.get('userId') ?? getUserId(request) }, 'unhandled.error');
    const internal = new InternalError();
    return reply.status(internal.statusCode).send(error(internal.message, internal.code));
  });

  app.setNotFoundHandler((_request, reply) => {
    const notFound = new NotFoundError();
    return reply.status(notFound.statusCode).send(error(notFound.message, notFound.code));
  });

  return app;
}
