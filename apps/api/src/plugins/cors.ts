import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env';

function parseOrigins() {
  if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') return true;
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export default fp(async (app) => {
  await app.register(cors, {
    origin: parseOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
});
