import type { FastifyPluginAsync } from 'fastify';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ChangePasswordBody, PushTokenBody, UpdateProfileBody } from './user.schema';

const userRoutes: FastifyPluginAsync = async (app) => {
  const service = new UserService(app.prisma, app.log, app);
  const controller = new UserController(service);

  app.get('/user/profile', { preHandler: [app.authenticate] }, controller.getProfile);
  app.patch('/user/profile', { preHandler: [app.authenticate], schema: { body: UpdateProfileBody } }, controller.updateProfile);
  app.post('/user/push-token', { preHandler: [app.authenticate], schema: { body: PushTokenBody }, config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, controller.registerPushToken);
  app.post('/user/avatar', { preHandler: [app.authenticate] }, controller.updateAvatar);
  app.post('/user/password', { preHandler: [app.authenticate], schema: { body: ChangePasswordBody } }, controller.changePassword);
  app.delete('/user/account', { preHandler: [app.authenticate] }, controller.deleteAccount);
};

export default userRoutes;
