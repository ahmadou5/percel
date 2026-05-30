import fp from 'fastify-plugin';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

export default fp(async (app) => {
  const redis = new IORedis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    connectTimeout: 1500,
    retryStrategy: () => null,
  });

  redis.on('error', (error) => {
    app.log.warn({ error }, 'Redis client error');
  });

  try {
    await redis.connect();
    await redis.ping();
    app.log.info('Redis health check passed');
  } catch (error) {
    if (env.NODE_ENV === 'production') {
      throw error;
    }

    app.log.warn('Redis health check failed; continuing in non-production mode');
  }

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    if (redis.status === 'ready' || redis.status === 'connect') {
      await redis.quit();
    }
  });
});
