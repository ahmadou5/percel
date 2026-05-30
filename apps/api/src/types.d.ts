import type { PrismaClient } from '@prisma/client';
import type IORedis from 'ioredis';
import type { Server } from 'socket.io';
import 'fastify';
import '@fastify/request-context';

import type { AppQueues } from './queues';

declare module '@fastify/request-context' {
  interface RequestContextData {
    requestId: string;
    userId: string | null;
    role: 'USER' | 'ADMIN' | null;
    startTime: number;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: IORedis;
    io: Server | null;
    queues: AppQueues;
    authenticate: (request: unknown) => Promise<void>;
    authenticateDriver: (request: unknown) => Promise<void>;
    authenticateAdmin: (request: unknown) => Promise<void>;
  }
}
