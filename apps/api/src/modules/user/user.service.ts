import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { NotificationType, Prisma, type PrismaClient, UserStatus, PaymentProvider } from '@prisma/client';

import { uploadImageBuffer } from '../../lib/cloudinary.js';
import { createCustomer, validateCustomerIdentity } from '../../lib/paystack.js';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError, PaymentError } from '../../utils/errors.js';
import type { ChangePasswordBody, NotificationsFeedResponse, NotificationResponse, UpdateProfileBody, UserProfileResponse } from './user.types.js';
import { PaymentProviderService } from '../payment/payment.service.js';
import { deleteCache } from '../../lib/cache.js';
import { emitToUser } from '../../lib/realtime.js';

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
  kycMethod: 'NIN' | 'BVN' | null;
  ninVerified: boolean;
  bvnVerified: boolean;
}) {
  if (!user.dateOfBirth || !user.address || !user.kycMethod) return false;
  return user.kycMethod === 'BVN' ? user.bvnVerified : user.ninVerified;
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

  private async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as Prisma.InputJsonValue,
        read: false,
      },
    });
  }

  private async ensurePaystackCustomerCode(userId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phone: true, paystackCustomerCode: true },
    });

    if (!existing) throw new NotFoundError('User not found');
    if (existing.paystackCustomerCode) return existing.paystackCustomerCode;

    const { firstName, lastName } = splitFullName(existing.fullName);
    const customer = await createCustomer({
      email: existing.email,
      firstName,
      lastName,
      phone: existing.phone,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { paystackCustomerCode: customer.customer_code },
    });

    return customer.customer_code;
  }

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
        kycMethod: true,
        status: true,
        walletPinHash: true,
        emailVerified: true,
        phoneVerified: true,
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
      kycMethod: user.kycMethod,
      status: user.status,
      walletPinSet: Boolean(user.walletPinHash),
      kycComplete: isKycComplete(user),
      emailVerified: (user as any).emailVerified ?? false,
      phoneVerified: (user as any).phoneVerified ?? false,
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
        ...(data.kycMethod !== undefined ? { kycMethod: data.kycMethod } : {}),
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
        kycMethod: true,
        status: true,
        walletPinHash: true,
        emailVerified: true,
        phoneVerified: true,
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
      kycMethod: updated.kycMethod,
      status: updated.status,
      walletPinSet: Boolean(updated.walletPinHash),
      kycComplete: isKycComplete(updated),
      emailVerified: (updated as any).emailVerified ?? false,
      phoneVerified: (updated as any).phoneVerified ?? false,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async verifyUserNin(userId: string, nin: string) {
    const trimmedNin = nin.trim();
    if (!/^\d{11}$/.test(trimmedNin)) {
      throw new ValidationError('NIN must be an 11-digit number');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        bvnVerified: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');

    const existingNinUser = await this.prisma.user.findFirst({
      where: {
        ninNumber: trimmedNin,
        ninVerified: true,
        NOT: { id: userId },
      },
    });
    if (existingNinUser) {
      throw new ValidationError('This NIN is already registered and verified on another account');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ninNumber: trimmedNin,
        ninVerified: true,
        kycMethod: user.bvnVerified ? 'BVN' : 'NIN',
        status: UserStatus.ACTIVE,
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
        kycMethod: true,
        status: true,
        walletPinHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.createNotification(
      userId,
      NotificationType.SYSTEM,
      'NIN Verification Approved',
      'Your National Identification Number (NIN) has been verified successfully.',
      { nin: trimmedNin },
    );

    this.logger.info({ userId, nin: trimmedNin }, 'user.kyc.nin_verified');

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
      kycMethod: updated.kycMethod,
      status: updated.status,
      walletPinSet: Boolean(updated.walletPinHash),
      kycComplete: isKycComplete(updated),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async verifyUserBvn(
    userId: string,
    input: {
      bvn: string;
      accountNumber: string;
      bankCode: string;
      firstName: string;
      lastName: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfBirth: true, paystackCustomerCode: true },
    });

    if (!user) throw new NotFoundError('User not found');
    if (!user.dateOfBirth) throw new ValidationError('Add your date of birth before verifying BVN');

    const customerCode = user.paystackCustomerCode ?? (await this.ensurePaystackCustomerCode(userId));
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const bvn = input.bvn.trim();
    const accountNumber = input.accountNumber.trim();
    const bankCode = input.bankCode.trim();

    const existingBvnUser = await this.prisma.user.findFirst({
      where: {
        bvnNumber: bvn,
        bvnVerified: true,
        NOT: { id: userId },
      },
    });
    if (existingBvnUser) {
      throw new ValidationError('This BVN is already registered and verified on another account');
    }

    try {
      const providers = new PaymentProviderService(this.prisma);
      const activeProvider = await providers.getActiveProvider();
      const accountDetails = await providers.resolveBankAccount(activeProvider, accountNumber, bankCode);
      if (accountDetails?.accountName) {
        const resName = accountDetails.accountName.toUpperCase();
        const fName = firstName.toUpperCase();
        const lName = lastName.toUpperCase();

        const matchFirst = resName.includes(fName);
        const matchLast = resName.includes(lName);

        if (!matchFirst && !matchLast) {
          throw new ValidationError(
            `Bank account name (${accountDetails.accountName}) does not match your provided name (${firstName} ${lastName})`
          );
        }
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      this.logger.warn({ err, accountNumber, bankCode }, 'Bank account resolution check skipped or failed');
    }

    let result;
    let alreadyValidated = false;
    try {
      result = await validateCustomerIdentity(customerCode, {
        country: 'NG',
        type: 'bank_account',
        account_number: accountNumber,
        bvn,
        bank_code: bankCode,
        first_name: firstName,
        last_name: lastName,
      });
    } catch (err) {
      if (err instanceof PaymentError && err.message.includes('Customer already validated using the same credentials')) {
        alreadyValidated = true;
      } else {
        throw err;
      }
    }

    if (!alreadyValidated && result && !result.status) {
      throw new ValidationError(result.message || 'Verification could not be started');
    }

    if (alreadyValidated) {
      const userWithWallet = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          wallet: { select: { id: true, nuban: true, bankName: true } },
        },
      });

      const wallet = userWithWallet?.wallet;
      if (wallet && (!wallet.nuban || !wallet.bankName)) {
        const providers = new PaymentProviderService(this.prisma);
        try {
          const provider = await providers.getActiveProvider();
          const account = await providers.createVirtualAccountWithFallback(provider, {
            id: userId,
            email: userWithWallet.email,
            fullName: firstName + ' ' + lastName,
            phone: userWithWallet.phone,
            bvn: bvn,
            providerCustomerCode: customerCode,
          });

          await this.prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              nuban: account.accountNumber,
              bankName: account.bankName,
              bankCode: account.bankCode ?? null,
              paymentProvider: account.provider,
            },
          });

          await deleteCache(this.app.redis, 'cache:wallet:balance:' + wallet.id);

          try {
            emitToUser(this.app, userId, 'wallet_updated', { walletId: wallet.id });
          } catch (err) {
            this.logger.warn({ err, userId }, 'Failed to emit wallet_updated socket event');
          }
        } catch (err) {
          this.logger.error({ err, userId }, 'Failed to create dedicated virtual account during fallback activation');
        }
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: firstName + ' ' + lastName,
        bvnNumber: bvn,
        bvnVerified: true,
        kycMethod: 'BVN',
        status: UserStatus.ACTIVE,
        paystackCustomerCode: customerCode,
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
        kycMethod: true,
        status: true,
        walletPinHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (alreadyValidated) {
      await this.createNotification(
        userId,
        NotificationType.SYSTEM,
        'Verification approved',
        'Your bank verification is complete. Your dedicated account is ready.',
        { customerCode },
      );
      this.logger.info({ userId, customerCode }, 'user.kyc.bvn_active_already_validated');
    } else {
      this.logger.info({ userId, customerCode }, 'user.kyc.bvn_pending');
    }

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
      kycMethod: updated.kycMethod,
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

  async getSavedAddresses(userId: string) {
    const addresses = await this.prisma.savedAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return addresses.map((a) => ({
      id: a.id,
      label: a.label,
      street: a.street,
      city: a.city,
      state: a.state,
      country: a.country,
      formattedAddress: a.formattedAddress,
      placeId: a.placeId ?? undefined,
      lat: Number(a.lat),
      lng: Number(a.lng),
      contactName: a.contactName ?? undefined,
      contactPhone: a.contactPhone ?? undefined,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async createSavedAddress(userId: string, data: {
    label: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    formattedAddress: string;
    placeId?: string;
    lat: number;
    lng: number;
    contactName?: string;
    contactPhone?: string;
  }) {
    if (!data.label || !data.formattedAddress) {
      throw new ValidationError('Label and formatted address are required');
    }

    const saved = await this.prisma.savedAddress.create({
      data: {
        userId,
        label: data.label.trim(),
        street: data.street || data.formattedAddress.split(',')[0] || 'Street',
        city: data.city || 'Lagos',
        state: data.state || 'Lagos',
        country: data.country || 'Nigeria',
        formattedAddress: data.formattedAddress,
        placeId: data.placeId,
        lat: data.lat,
        lng: data.lng,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
      },
    });

    return {
      id: saved.id,
      label: saved.label,
      street: saved.street,
      city: saved.city,
      state: saved.state,
      country: saved.country,
      formattedAddress: saved.formattedAddress,
      placeId: saved.placeId ?? undefined,
      lat: Number(saved.lat),
      lng: Number(saved.lng),
      contactName: saved.contactName ?? undefined,
      contactPhone: saved.contactPhone ?? undefined,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async deleteSavedAddress(userId: string, addressId: string) {
    const existing = await this.prisma.savedAddress.findUnique({
      where: { id: addressId },
      select: { userId: true },
    });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Saved address not found');
    }

    await this.prisma.savedAddress.delete({ where: { id: addressId } });
    return { deleted: true };
  }
}
