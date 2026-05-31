import type { FastifyRequest } from 'fastify';

import { success } from '../../utils/response.js';
import type { UserService } from './user.service.js';

export class UserController {
  constructor(private readonly service: UserService) {}

  getProfile = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.getProfile(userId));
  };

  updateProfile = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.updateProfile(userId, request.body as never), 'Profile updated');
  };

  registerPushToken = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { token } = request.body as { token: string };
    return success(await this.service.updatePushToken(userId, token), 'Push token registered');
  };

  listNotifications = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const query = request.query as { limit?: number; unreadOnly?: boolean };
    return success(await this.service.listNotifications(userId, query));
  };

  markNotificationRead = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { notificationId } = request.params as { notificationId: string };
    return success(await this.service.markNotificationRead(userId, notificationId), 'Notification updated');
  };

  markAllNotificationsRead = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.markAllNotificationsRead(userId), 'Notifications updated');
  };

  updateAvatar = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const file = await request.file();
    if (!file) throw new Error('Avatar file required');
    const buffer = await file.toBuffer();
    return success(await this.service.updateAvatar(userId, buffer), 'Avatar updated');
  };

  changePassword = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.changePassword(userId, request.body as never), 'Password changed');
  };

  deleteAccount = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.deleteAccount(userId), 'Account deleted');
  };
}
