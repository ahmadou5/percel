import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { DriverKYCStatus, DriverStatus, Prisma, type PrismaClient } from '@prisma/client';

import { env } from '../../config/env.js';
import { addNotificationJob } from '../../queues/index.js';
import { uploadImageBuffer } from '../../lib/cloudinary.js';
import { verifyBVN, verifyNIN } from '../../lib/smileIdentity.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import type { DriverKycDocumentType, DriverProfileResponse, VerifyResponse } from './driver.types.js';

type DriverRecord = {
  id: string;
  userId: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel: string;
  status: DriverStatus;
  rating: Prisma.Decimal | number;
  totalDeliveries: number;
  isOnline: boolean;
  currentLat: Prisma.Decimal | number | null;
  currentLng: Prisma.Decimal | number | null;
  lastLocationAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    avatarUrl: string | null;
  };
  kyc: {
    id: string;
    ninNumber: string;
    bvnNumber: string;
    licenseImageUrl: string | null;
    selfieUrl: string | null;
    vehicleImageUrl: string | null;
    smileJobId: string | null;
    status: DriverKYCStatus;
    rejectionReason: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
  } | null;
};

function asNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(' ') || parts[0] || fullName,
  };
}

function serializeDriver(driver: DriverRecord): DriverProfileResponse {
  const kyc = driver.kyc ?? {
    id: '',
    ninNumber: '',
    bvnNumber: '',
    licenseImageUrl: null,
    selfieUrl: null,
    vehicleImageUrl: null,
    smileJobId: null,
    status: DriverKYCStatus.PENDING,
    rejectionReason: null,
    submittedAt: null,
    reviewedAt: null,
  };

  return {
    id: driver.id,
    userId: driver.userId,
    fullName: driver.user.fullName,
    email: driver.user.email,
    phone: driver.user.phone,
    avatarUrl: driver.user.avatarUrl,
    status: driver.status,
    kycStatus: kyc.status,
    rating: asNumber(driver.rating),
    totalDeliveries: driver.totalDeliveries,
    isOnline: driver.isOnline,
    vehicleType: driver.vehicleType as DriverProfileResponse['vehicleType'],
    vehiclePlate: driver.vehiclePlate,
    vehicleModel: driver.vehicleModel,
    licenseNumber: driver.licenseNumber,
    currentLat: driver.currentLat == null ? null : Number(driver.currentLat),
    currentLng: driver.currentLng == null ? null : Number(driver.currentLng),
    lastLocationAt: formatDate(driver.lastLocationAt),
    memberSince: driver.createdAt.toISOString(),
    kyc: {
      id: kyc.id,
      ninNumber: kyc.ninNumber,
      bvnNumber: kyc.bvnNumber,
      licenseImageUrl: kyc.licenseImageUrl,
      selfieUrl: kyc.selfieUrl,
      vehicleImageUrl: kyc.vehicleImageUrl,
      smileJobId: kyc.smileJobId,
      status: kyc.status,
      rejectionReason: kyc.rejectionReason,
      submittedAt: formatDate(kyc.submittedAt),
      reviewedAt: formatDate(kyc.reviewedAt),
    },
    stats: {
      totalDeliveries: driver.totalDeliveries,
      rating: asNumber(driver.rating),
      memberSince: driver.createdAt.toISOString(),
    },
  };
}

async function ensureDriverKyc(prisma: PrismaClient, driverId: string) {
  const existing = await prisma.driverKYC.findUnique({ where: { driverId } });
  if (existing) return existing;

  return prisma.driverKYC.create({
    data: {
      driverId,
      ninNumber: '',
      bvnNumber: '',
      status: DriverKYCStatus.PENDING,
    },
  });
}

async function createAdminNotifications(
  prisma: Pick<PrismaClient, 'user' | 'notification'>,
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (!admins.length) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: 'SYSTEM',
      title,
      body,
      data: data as Prisma.InputJsonValue,
    })),
  });
}

export class DriverService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger,
    private readonly app: FastifyInstance,
  ) {}

  async getDriverProfile(driverId: string): Promise<DriverProfileResponse> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        kyc: true,
      },
    });

    if (!driver) throw new NotFoundError('Driver not found');
    const kyc = driver.kyc ?? (await ensureDriverKyc(this.prisma, driver.id));
    return serializeDriver({ ...driver, kyc } as DriverRecord);
  }

  async updateVehicleProfile(
    driverId: string,
    data: { vehicleType: 'BIKE' | 'CAR' | 'VAN' | 'TRUCK'; vehiclePlate: string; vehicleModel: string },
  ): Promise<DriverProfileResponse> {
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        vehicleType: data.vehicleType,
        vehiclePlate: data.vehiclePlate.trim(),
        vehicleModel: data.vehicleModel.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        kyc: true,
      },
    });

    const kyc = driver.kyc ?? (await ensureDriverKyc(this.prisma, driver.id));
    this.logger.info({ driverId }, 'driver.vehicle.updated');
    return serializeDriver({ ...driver, kyc } as DriverRecord);
  }

  async updateOnlineStatus(driverId: string, isOnline: boolean, lat?: number, lng?: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { kyc: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');

    if (isOnline && (driver.status !== DriverStatus.ACTIVE || driver.kyc?.status !== DriverKYCStatus.APPROVED)) {
      throw new ForbiddenError('Driver must have approved KYC before going online');
    }

    const updated = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        isOnline,
        ...(lat != null ? { currentLat: lat } : {}),
        ...(lng != null ? { currentLng: lng } : {}),
        lastLocationAt: new Date(),
      },
    });

    await this.app.redis.publish(
      'driver:status',
      JSON.stringify({ driverId, isOnline, lat: lat ?? null, lng: lng ?? null }),
    );

    this.logger.info({ driverId, isOnline }, 'driver.status.updated');
    return {
      id: updated.id,
      isOnline: updated.isOnline,
      status: updated.status,
      currentLat: updated.currentLat == null ? null : Number(updated.currentLat),
      currentLng: updated.currentLng == null ? null : Number(updated.currentLng),
      lastLocationAt: formatDate(updated.lastLocationAt),
    };
  }

  async updateLocation(driverId: string, lat: number, lng: number, heading = 0, speed = 0) {
    void this.prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLat: lat,
        currentLng: lng,
        lastLocationAt: new Date(),
      },
    });

    await this.app.redis.publish(
      'driver:location',
      JSON.stringify({ driverId, lat, lng, heading, speed }),
    );

    this.logger.info({ driverId, lat, lng }, 'driver.location.updated');
    return null;
  }

  async submitKYCNIN(driverId: string, nin: string): Promise<VerifyResponse & { message?: string }> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true, kyc: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');

    const name = splitName(driver.user.fullName);

    try {
      const result = await verifyNIN(
        env.SMILE_IDENTITY_PARTNER_ID,
        nin,
        name.firstName,
        name.lastName,
        driver.createdAt.toISOString().slice(0, 10),
      );

      const kyc = await ensureDriverKyc(this.prisma, driverId);
      await this.prisma.driverKYC.update({
        where: { driverId },
        data: {
          ninNumber: nin,
          ninVerified: Boolean(result.verified),
          status: DriverKYCStatus.PENDING,
          rejectionReason: null,
          smileJobId: kyc.smileJobId,
        },
      });

      return result;
    } catch {
      return {
        verified: false,
        name: null,
        dob: null,
        photo: null,
        message: 'NIN verification failed. Please review the number and try again.',
      };
    }
  }

  async submitKYCBVN(driverId: string, bvn: string): Promise<VerifyResponse & { message?: string }> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');

    const name = splitName(driver.user.fullName);

    try {
      const result = await verifyBVN(
        env.SMILE_IDENTITY_PARTNER_ID,
        bvn,
        name.firstName,
        name.lastName,
        driver.createdAt.toISOString().slice(0, 10),
      );

      await ensureDriverKyc(this.prisma, driverId);
      await this.prisma.driverKYC.update({
        where: { driverId },
        data: {
          bvnNumber: bvn,
          bvnVerified: Boolean(result.verified),
          status: DriverKYCStatus.PENDING,
          rejectionReason: null,
        },
      });

      return result;
    } catch {
      return {
        verified: false,
        name: null,
        dob: null,
        photo: null,
        message: 'BVN verification failed. Please review the number and try again.',
      };
    }
  }

  async uploadKYCDocument(driverId: string, file: Buffer, type: DriverKycDocumentType) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { kyc: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');
    await ensureDriverKyc(this.prisma, driverId);

    const uploaded = await uploadImageBuffer(file, {
      folder: `kyc/${driverId}`,
      publicId: `${type}-${Date.now()}`,
      format: 'webp',
    });

    const data:
      | { licenseImageUrl: string; selfieUrl?: never; vehicleImageUrl?: never }
      | { selfieUrl: string; licenseImageUrl?: never; vehicleImageUrl?: never }
      | { vehicleImageUrl: string; licenseImageUrl?: never; selfieUrl?: never } = type === 'license'
      ? { licenseImageUrl: uploaded.secure_url }
      : type === 'selfie'
        ? { selfieUrl: uploaded.secure_url }
        : { vehicleImageUrl: uploaded.secure_url };

    await this.prisma.driverKYC.update({
      where: { driverId },
      data,
    });

    return {
      ...uploaded,
      type,
    };
  }

  async submitKYC(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true, kyc: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');

    const kyc = driver.kyc ?? (await ensureDriverKyc(this.prisma, driverId));
    const missing: string[] = [];

    if (!kyc.ninNumber) missing.push('NIN');
    if (!kyc.ninVerified) missing.push('verified NIN');
    if (!kyc.bvnNumber) missing.push('BVN');
    if (!kyc.bvnVerified) missing.push('verified BVN');
    if (!kyc.licenseImageUrl) missing.push('license image');
    if (!kyc.selfieUrl) missing.push('selfie');
    if (!kyc.vehicleImageUrl) missing.push('vehicle image');

    if (missing.length) {
      throw new ValidationError(`Missing KYC requirements: ${missing.join(', ')}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.driverKYC.update({
        where: { driverId },
        data: {
          status: DriverKYCStatus.SUBMITTED,
          submittedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.KYC_SUBMITTED },
      });

      await createAdminNotifications(
        tx,
        'Driver KYC submitted',
        `${driver.user.fullName} submitted KYC for review.`,
        { driverId, kycStatus: 'SUBMITTED' },
      );
    });

    this.logger.info({ driverId }, 'driver.kyc.submitted');
    return { submitted: true, status: DriverKYCStatus.SUBMITTED };
  }

  async approveKYC(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.driverKYC.update({
        where: { driverId },
        data: {
          status: DriverKYCStatus.APPROVED,
          rejectionReason: null,
          reviewedAt: new Date(),
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ACTIVE },
      });

      await tx.notification.create({
        data: {
          userId: driver.userId,
          type: 'SYSTEM',
          title: 'KYC approved',
          body: 'Your account has been approved. You can now go online.',
          data: {
            driverId,
            kycStatus: 'APPROVED',
          },
        },
      });
    });

    await addNotificationJob(this.app, driver.userId, 'KYC_APPROVED', { driverId });
    this.logger.info({ driverId }, 'driver.kyc.approved');
    return { approved: true };
  }

  async rejectKYC(driverId: string, reason: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.driverKYC.update({
        where: { driverId },
        data: {
          status: DriverKYCStatus.REJECTED,
          rejectionReason: reason,
          reviewedAt: new Date(),
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.PENDING_KYC, isOnline: false },
      });

      await tx.notification.create({
        data: {
          userId: driver.userId,
          type: 'SYSTEM',
          title: 'KYC rejected',
          body: reason,
          data: {
            driverId,
            kycStatus: 'REJECTED',
            reason,
          },
        },
      });
    });

    await addNotificationJob(this.app, driver.userId, 'KYC_REJECTED', { driverId, reason });
    this.logger.info({ driverId, reason }, 'driver.kyc.rejected');
    return { rejected: true };
  }
  async getDriverReviews(driverId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, rating: true },
    });

    if (!driver) throw new NotFoundError('Driver not found');

    const where: Prisma.OrderRatingWhereInput = { driverId };

    const [total, ratings, aggregate] = await this.prisma.$transaction([
      this.prisma.orderRating.count({ where }),
      this.prisma.orderRating.findMany({
        where,
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          order: { select: { trackingCode: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.orderRating.aggregate({
        where,
        _avg: { userRating: true },
      }),
    ]);

    return {
      data: ratings.map((rating) => ({
        id: rating.id,
        orderId: rating.orderId,
        userRating: rating.userRating,
        userComment: rating.userComment,
        createdAt: rating.createdAt.toISOString(),
        order: {
          trackingCode: rating.order.trackingCode,
          createdAt: rating.order.createdAt.toISOString(),
        },
        user: {
          fullName: rating.user.fullName,
          avatarUrl: rating.user.avatarUrl,
        },
      })),
      averageRating: Number(aggregate._avg.userRating ?? driver.rating ?? 0),
      totalReviews: total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
