import type { FastifyRequest } from 'fastify';

import { ValidationError } from '../../utils/errors';
import { success } from '../../utils/response';
import type { UserService } from './user.service';

export class UserController {
  constructor(private readonly service: UserService) {}

  getProfile = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.getProfile(userId), 'Profile fetched');
  };

  updateProfile = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.updateProfile(userId, request.body as never), 'Profile updated');
  };

  updateAvatar = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    let buffer: Buffer | null = null;

    for await (const part of (request as unknown as { parts: () => AsyncIterable<{ type: 'field' | 'file'; fieldname: string; toBuffer?: () => Promise<Buffer> }> }).parts()) {
      if (part.type === 'file' && part.fieldname === 'file' && part.toBuffer) {
        buffer = await part.toBuffer();
      }
    }

    if (!buffer) {
      throw new ValidationError('Avatar file is required');
    }

    return success(await this.service.updateAvatar(userId, buffer), 'Avatar updated');
  };

  registerPushToken = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { token } = request.body as { token: string };
    return success(await this.service.updatePushToken(userId, token), 'Push token registered');
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
