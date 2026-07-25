import type { FastifyPluginAsync } from 'fastify';

import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { ChangePasswordBody, NotificationIdParams, NotificationQuery, PushTokenBody, UpdateProfileBody, VerifyBvnBody, VerifyNinBody } from './user.schema.js';

const userRoutes: FastifyPluginAsync = async (app) => {
  const service = new UserService(app.prisma, app.log, app);
  const controller = new UserController(service);

  app.get('/user/profile', { preHandler: [app.authenticate] }, controller.getProfile);
  app.patch('/user/profile', { preHandler: [app.authenticate], schema: { body: UpdateProfileBody } }, controller.updateProfile);
  app.post('/user/push-token', { preHandler: [app.authenticate], schema: { body: PushTokenBody }, config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, controller.registerPushToken);
  app.post('/user/kyc/nin', { preHandler: [app.authenticate], schema: { body: VerifyNinBody }, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, controller.verifyNin);
  app.post('/user/kyc/bvn', { preHandler: [app.authenticate], schema: { body: VerifyBvnBody }, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, controller.verifyBvn);
  app.get('/user/notifications', { preHandler: [app.authenticate], schema: { querystring: NotificationQuery } }, controller.listNotifications);
  app.patch('/user/notifications/:notificationId/read', { preHandler: [app.authenticate], schema: { params: NotificationIdParams } }, controller.markNotificationRead);
  app.patch('/user/notifications/read-all', { preHandler: [app.authenticate] }, controller.markAllNotificationsRead);
  app.post('/user/avatar', { preHandler: [app.authenticate] }, controller.updateAvatar);
  app.post('/user/password', { preHandler: [app.authenticate], schema: { body: ChangePasswordBody } }, controller.changePassword);
  app.delete('/user/account', { preHandler: [app.authenticate] }, controller.deleteAccount);
  app.get('/user/addresses', { preHandler: [app.authenticate] }, controller.getSavedAddresses);
  app.post('/user/addresses', { preHandler: [app.authenticate] }, controller.createSavedAddress);
  app.delete('/user/addresses/:id', { preHandler: [app.authenticate] }, controller.deleteSavedAddress);
};

export default userRoutes;
