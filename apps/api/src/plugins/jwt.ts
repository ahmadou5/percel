import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

type JwtPayload = {
  sub: string;
  role?: 'USER' | 'ADMIN';
  driverId?: string;
};

type JwtRequest = {
  jwtVerify: () => Promise<void>;
  user?: unknown;
  requestContext: {
    set: (key: 'userId' | 'role', value: string | null) => void;
  };
};

async function verify(request: JwtRequest): Promise<JwtPayload> {
  try {
    await request.jwtVerify();
    return request.user as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or missing token');
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: {
      private: env.JWT_SECRET,
      public: env.JWT_SECRET,
    },
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  app.decorate('authenticate', async (request: unknown) => {
    const payload = await verify(request as JwtRequest);
    (request as { user?: JwtPayload }).user = payload;
    (request as JwtRequest).requestContext.set('userId', payload.sub);
    (request as JwtRequest).requestContext.set('role', payload.role ?? 'USER');
  });

  app.decorate('authenticateDriver', async (request: unknown) => {
    const payload = await verify(request as JwtRequest);
    if (!payload.driverId) {
      const driver = await app.prisma.driver.findUnique({
        where: { userId: payload.sub },
        select: { id: true },
      });

      if (!driver) {
        throw new ForbiddenError('Driver access required');
      }

      (request as { user?: JwtPayload }).user = { ...payload, driverId: driver.id };
      (request as JwtRequest).requestContext.set('userId', payload.sub);
      (request as JwtRequest).requestContext.set('role', payload.role ?? 'USER');
      return;
    }

    (request as { user?: JwtPayload }).user = payload;
    (request as JwtRequest).requestContext.set('userId', payload.sub);
    (request as JwtRequest).requestContext.set('role', payload.role ?? 'USER');
  });

  app.decorate('authenticateAdmin', async (request: unknown) => {
    const payload = await verify(request as JwtRequest);
    if (payload.role !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }
    (request as { user?: JwtPayload }).user = payload;
    (request as JwtRequest).requestContext.set('userId', payload.sub);
    (request as JwtRequest).requestContext.set('role', 'ADMIN');
  });
});
