import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Server } from 'socket.io';

import { DriverService } from '../modules/driver/driver.service.js';
import { attachRealtimeBridge, describeSocketOrigins } from '../lib/realtime.js';

function getToken(socket: { handshake: { auth?: { token?: string }; headers: Record<string, unknown> } }) {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers.authorization;

  if (authToken) return authToken;
  if (typeof headerToken === 'string' && headerToken.toLowerCase().startsWith('bearer ')) {
    return headerToken.slice(7).trim();
  }

  return null;
}

async function allowDriverLocationUpdate(app: FastifyInstance, driverId: string) {
  const bucketKey = `driver:location:bucket:${driverId}`;
  const acquired = await app.redis.set(bucketKey, "1", "EX", 1, "NX");
  return acquired === "OK";

}

export default fp(async (app) => {
  app.decorate('io', null);

  app.addHook('onReady', async () => {
    const io = new Server(app.server, {
      cors: {
        origin: describeSocketOrigins(),
        credentials: true,
      },
    });

    const driverService = new DriverService(app.prisma, app.log, app);
    const userNamespace = io.of('/user');
    const driverNamespace = io.of('/driver');

    const authenticateSocket = async (
      socket: { handshake: { auth?: { token?: string }; headers: Record<string, unknown> }; data: Record<string, unknown> },
      next: (err?: Error) => void,
    ) => {
      const token = getToken(socket);
      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }

      try {
        const payload = (await app.jwt.verify(token)) as {
          sub: string;
          role?: 'USER' | 'ADMIN';
          driverId?: string;
        };

        socket.data.userId = payload.sub;
        socket.data.role = payload.role ?? 'USER';
        socket.data.driverId = payload.driverId ?? null;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    };

    userNamespace.use(authenticateSocket);
    driverNamespace.use(authenticateSocket);

    userNamespace.on('connection', (socket) => {
      const userId = String(socket.data.userId ?? '');
      socket.join(`user:${userId}`);

      socket.on('disconnect', () => {
        socket.leave(`user:${userId}`);
      });
    });

    driverNamespace.on('connection', async (socket) => {
      const userId = String(socket.data.userId ?? '');
      let driverId = String(socket.data.driverId ?? '');

      if (!driverId) {
        const driver = await app.prisma.driver.findUnique({ where: { userId }, select: { id: true } });
        driverId = driver?.id ?? '';
        socket.data.driverId = driverId || null;
      }

      if (!driverId) {
        socket.disconnect(true);
        return;
      }

      socket.join(`driver:${driverId}`);
      await app.redis.set(`driver:socket:${driverId}`, socket.id, 'EX', 60 * 60);

      socket.on('go_online', async (payload: { lat?: number; lng?: number } = {}) => {
        try {
          await driverService.updateOnlineStatus(driverId, true, payload.lat, payload.lng);
        } catch (error) {
          app.log.warn({ error, driverId }, 'Driver go_online failed');
        }
      });

      socket.on('driver_online', async (payload: { lat?: number; lng?: number } = {}) => {
        try {
          await driverService.updateOnlineStatus(driverId, true, payload.lat, payload.lng);
        } catch (error) {
          app.log.warn({ error, driverId }, 'Driver driver_online failed');
        }
      });

      socket.on('go_offline', async () => {
        try {
          await driverService.updateOnlineStatus(driverId, false);
        } catch (error) {
          app.log.warn({ error, driverId }, 'Driver go_offline failed');
        }
      });

      socket.on('driver_offline', async () => {
        try {
          await driverService.updateOnlineStatus(driverId, false);
        } catch (error) {
          app.log.warn({ error, driverId }, 'Driver driver_offline failed');
        }
      });

      socket.on('location_update', async (payload: { lat: number; lng: number; heading?: number; speed?: number }) => {
        const acquired = await allowDriverLocationUpdate(app, driverId);
        if (!acquired) return;

        await driverService.updateLocation(driverId, payload.lat, payload.lng, payload.heading ?? 0, payload.speed ?? 0);
      });

      socket.on('disconnect', async () => {
        await app.redis.del(`driver:socket:${driverId}`);
        await driverService.updateOnlineStatus(driverId, false).catch((error) => {
          app.log.warn({ error, driverId }, 'Driver disconnect offline update failed');
        });
      });
    });

    app.io = io;
    app.addHook('onClose', async () => {
      if (app.io) {
        await app.io.close();
        app.io = null;
      }
    });
    await attachRealtimeBridge(app);
  });
});
