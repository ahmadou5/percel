import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { NotificationType, type PrismaClient, UserStatus } from '@prisma/client';

import { uploadImageBuffer } from '../../lib/cloudinary.js';
import { verifyBVN, verifyNIN } from '../../lib/smileIdentity.js';
import { env } from '../../config/env.js';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../../utils/errors.js';
import type { ChangePasswordBody, NotificationsFeedResponse, NotificationResponse, UpdateProfileBody, UserProfileResponse } from './user.types.js';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('dateOfBirth must be a valid date');
  }
  return parsed;
}

function normalizeText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [firstName = 'Percel', ...rest] = parts;
  return {
    firstName,
    lastName: rest.join(' ') || 'User',
  };
}

function isKycComplete(user: {
  dateOfBirth: Date | null;
  address: string | null;
  ninVerified: boolean;
  bvnVerified: boolean;
}) {
  return Boolean(user.dateOfBirth && user.address && user.ninVerified && user.bvnVerified);
}

function toNotificationResponse(notification: {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: unknown;
  read: boolean;
  createdAt: Date;
}): NotificationResponse {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: (notification.data ?? {}) as Record<string, unknown>,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export class UserService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger,
    private readonly app: FastifyInstance,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        dateOfBirth: true,
        address: true,
        ninNumber: true,
        ninVerified: true,
        bvnNumber: true,
        bvnVerified: true,
        status: true,
        walletPinHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      dateOfBirth: toIso(user.dateOfBirth),
      address: user.address,
      ninNumber: user.ninNumber,
      ninVerified: user.ninVerified,
      bvnNumber: user.bvnNumber,
      bvnVerified: user.bvnVerified,
      status: user.status,
      walletPinSet: Boolean(user.walletPinHash),
      kycComplete: isKycComplete(user),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async listNotifications(userId: string, query: { limit?: number; unreadOnly?: boolean }): Promise<NotificationsFeedResponse> {
    const limit = query.limit ?? 20;
    const where = {
      userId,
      ...(query.unreadOnly ? { read: false } : {}),
    };

    const [unreadCount, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId, read: false } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return {
      unreadCount,
      data: data.map(toNotificationResponse),
    };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    return { updated: result.count > 0 };
  }

  async markAllNotificationsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { updated: result.count };
  }

  async updateProfile(userId: string, data: UpdateProfileBody): Promise<UserProfileResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!existing) throw new NotFoundError('User not found');
    if (existing.status === UserStatus.SUSPENDED) throw new ForbiddenError('Account is suspended');

    const nextFullName = data.fullName?.trim();
    if (nextFullName && nextFullName.length < 2) {
      throw new ValidationError('Full name must be at least 2 characters');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(nextFullName ? { fullName: nextFullName } : {}),
        ...(data.dateOfBirth !== undefined ? { dateOfBirth: toDate(data.dateOfBirth) } : {}),
        ...(data.address !== undefined ? { address: normalizeText(data.address) } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        dateOfBirth: true,
        address: true,
        ninNumber: true,
        ninVerified: true,
        bvnNumber: true,
        bvnVerified: true,
        status: true,
        walletPinHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.info({ userId }, 'user.profile.updated');
    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      dateOfBirth: toIso(updated.dateOfBirth),
      address: updated.address,
      ninNumber: updated.ninNumber,
      ninVerified: updated.ninVerified,
      bvnNumber: updated.bvnNumber,
      bvnVerified: updated.bvnVerified,
      status: updated.status,
      walletPinSet: Boolean(updated.walletPinHash),
      kycComplete: isKycComplete(updated),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async verifyUserNin(userId: string, nin: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, dateOfBirth: true, ninVerified: true, address: true },
    });

    if (!user) throw new NotFoundError('User not found');
    if (!user.dateOfBirth) throw new ValidationError('Add your date of birth before verifying NIN');

    const { firstName, lastName } = splitFullName(user.fullName);
    const result = await verifyNIN(env.SMILE_IDENTITY_PARTNER_ID, nin.trim(), firstName, lastName, user.dateOfBirth.toISOString().slice(0, 10));
    if (!result.verified) throw new ValidationError('NIN verification failed');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ninNumber: nin.trim(),
        ninVerified: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        dateOfBirth: true,
        address: true,
        ninNumber: true,
        ninVerified: true,
        bvnNumber: true,
        bvnVerified: true,
        status: true,
        walletPinHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.info({ userId }, 'user.kyc.nin_verified');
    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      dateOfBirth: toIso(updated.dateOfBirth),
      address: updated.address,
      ninNumber: updated.ninNumber,
      ninVerified: updated.ninVerified,
      bvnNumber: updated.bvnNumber,
      bvnVerified: updated.bvnVerified,
      status: updated.status,
      walletPinSet: Boolean(updated.walletPinHash),
      kycComplete: isKycComplete(updated),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async verifyUserBvn(userId: string, bvn: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, dateOfBirth: true, bvnVerified: true, address: true },
    });

    if (!user) throw new NotFoundError('User not found');
    if (!user.dateOfBirth) throw new ValidationError('Add your date of birth before verifying BVN');

    const { firstName, lastName } = splitFullName(user.fullName);
    const result = await verifyBVN(env.SMILE_IDENTITY_PARTNER_ID, bvn.trim(), firstName, lastName, user.dateOfBirth.toISOString().slice(0, 10));
    if (!result.verified) throw new ValidationError('BVN verification failed');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bvnNumber: bvn.trim(),
        bvnVerified: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        dateOfBirth: true,
        address: true,
        ninNumber: true,
        ninVerified: true,
        bvnNumber: true,
        bvnVerified: true,
        status: true,
        walletPinHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.info({ userId }, 'user.kyc.bvn_verified');
    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      dateOfBirth: toIso(updated.dateOfBirth),
      address: updated.address,
      ninNumber: updated.ninNumber,
      ninVerified: updated.ninVerified,
      bvnNumber: updated.bvnNumber,
      bvnVerified: updated.bvnVerified,
      status: updated.status,
      walletPinSet: Boolean(updated.walletPinHash),
      kycComplete: isKycComplete(updated),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async updateAvatar(userId: string, buffer: Buffer): Promise<{ avatarUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundError('User not found');

    const uploaded = await uploadImageBuffer(buffer, {
      folder: `percel/users/${userId}/avatar`,
      publicId: 'avatar',
      transformation: 'c_fill,g_face,w_512,h_512,q_auto',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploaded.secure_url },
    });

    this.logger.info({ userId }, 'user.avatar.updated');
    return { avatarUrl: uploaded.secure_url };
  }

  async updatePushToken(userId: string, token: string) {
    if (!token) throw new ValidationError('Push token required');

    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token.trim() },
    });

    this.logger.info({ userId }, 'user.push_token.updated');
    return { registered: true };
  }

  async changePassword(userId: string, payload: ChangePasswordBody) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) throw new NotFoundError('User not found');

    const matches = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!matches) throw new UnauthorizedError('Invalid current password');

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    this.logger.info({ userId }, 'user.password.changed');
    return { updated: true };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
    if (!user) throw new NotFoundError('User not found');
    if (user.status === UserStatus.SUSPENDED) {
      return { deleted: true };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        deletedAt: new Date(),
        refreshToken: null,
        expoPushToken: null,
        walletPinHash: null,
        avatarUrl: null,
        fullName: 'Deleted User',
        address: null,
        dateOfBirth: null,
      },
    });

    this.logger.info({ userId }, 'user.account.deleted');
    return { deleted: true };
  }
}
