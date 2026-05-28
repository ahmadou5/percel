import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient, User, UserRole } from '@prisma/client';

import { ForbiddenError, UnauthorizedError, ValidationError } from '../../utils/errors';
import type { AuthResponse, AuthTokens, SafeUser } from './auth.types';

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

type JwtSigner = {
  sign: (
    payload: object,
    options: { sub: string; expiresIn: string; secret?: string },
  ) => string | Promise<string>;
  verify: (
    token: string,
    options: { secret?: string },
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
};

type AuthInput = {
  email: string;
  phone: string;
  password: string;
  fullName: string;
};

type DriverInput = AuthInput & {
  vehicleType: 'BIKE' | 'CAR' | 'VAN' | 'TRUCK';
  vehiclePlate: string;
  vehicleModel: string;
  licenseNumber: string;
};

type UserTokenContext = {
  userId: string;
  role: UserRole;
  driverId?: string | null;
};

function redactUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    address: user.address,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeTokenEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwt: JwtSigner,
    private readonly logger: FastifyBaseLogger,
  ) {}

  private async resolveDriverId(userId: string): Promise<string | null> {
    const driver = await this.prisma.driver.findUnique({ where: { userId }, select: { id: true } });
    return driver?.id ?? null;
  }

  async generateTokens({ userId, role, driverId }: UserTokenContext): Promise<AuthTokens> {
    const accessToken = await Promise.resolve(
      this.jwt.sign(
        { role, ...(driverId ? { driverId } : {}) },
        { sub: userId, expiresIn: ACCESS_EXPIRES, secret: process.env.JWT_SECRET },
      ),
    );

    const refreshToken = await Promise.resolve(
      this.jwt.sign(
        { type: 'refresh' },
        { sub: userId, expiresIn: REFRESH_EXPIRES, secret: process.env.JWT_REFRESH_SECRET },
      ),
    );

    return { accessToken, refreshToken };
  }

  async registerUser(data: Record<string, unknown>): Promise<AuthResponse> {
    const payload = data as AuthInput;
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: payload.email }, { phone: payload.phone }] },
    });
    if (existing) throw new ValidationError('Email or phone already exists');

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: payload.email,
          phone: payload.phone,
          passwordHash,
          fullName: payload.fullName,
        },
      });

      await tx.wallet.create({ data: { userId: created.id, nuban: null, bankName: null } });
      return created;
    });

    const driverId = await this.resolveDriverId(user.id);
    const tokens = await this.generateTokens({ userId: user.id, role: user.role, driverId });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(tokens.refreshToken) } });

    this.logger.info({ userId: user.id }, 'auth.register.success');
    return { user: redactUser(user), tokens };
  }

  async registerDriver(data: Record<string, unknown>): Promise<AuthResponse> {
    const payload = data as DriverInput;
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: payload.email }, { phone: payload.phone }] },
    });
    if (existing) throw new ValidationError('Email or phone already exists');

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: payload.email,
          phone: payload.phone,
          passwordHash,
          fullName: payload.fullName,
        },
      });

      await tx.wallet.create({ data: { userId: created.id } });
      await tx.driver.create({
        data: {
          userId: created.id,
          licenseNumber: payload.licenseNumber,
          vehicleType: payload.vehicleType,
          vehiclePlate: payload.vehiclePlate,
          vehicleModel: payload.vehicleModel,
          status: 'PENDING_KYC',
        },
      });

      return created;
    });

    const driverId = await this.resolveDriverId(user.id);
    const tokens = await this.generateTokens({ userId: user.id, role: user.role, driverId });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(tokens.refreshToken) } });

    this.logger.info({ userId: user.id }, 'auth.register_driver.success');
    return { user: redactUser(user), tokens };
  }

  async login(identifier: string, password: string, ip?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }] } });
    if (!user) {
      this.logger.warn({ identifier, ip }, 'auth.login.failed');
      throw new UnauthorizedError('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.logger.warn({ userId: user.id, ip }, 'auth.login.failed');
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') throw new ForbiddenError('Account is suspended');

    const driverId = await this.resolveDriverId(user.id);
    const tokens = await this.generateTokens({ userId: user.id, role: user.role, driverId });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(tokens.refreshToken) } });

    this.logger.info({ userId: user.id, ip }, 'auth.login.success');
    return { user: redactUser(user), tokens };
  }

  async refreshTokens(refreshToken: string, ip?: string): Promise<AuthTokens> {
    let payload: Record<string, unknown>;
    try {
      payload = await Promise.resolve(
        this.jwt.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET }),
      );
    } catch {
      throw new UnauthorizedError('Invalid credentials');
    }

    const userId = String(payload.sub ?? '');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedError('Invalid credentials');

    const incomingHash = hashToken(refreshToken);
    if (!safeTokenEqual(incomingHash, user.refreshToken)) {
      this.logger.warn({ userId, ip }, 'auth.refresh.reuse_detected');
      throw new UnauthorizedError('Invalid credentials');
    }

    const driverId = await this.resolveDriverId(user.id);
    const next = await this.generateTokens({ userId: user.id, role: user.role, driverId });
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(next.refreshToken) } });

    this.logger.info({ userId, ip }, 'auth.refresh.success');
    return next;
  }

  async logout(userId: string, ip?: string): Promise<void> {
    if (!userId) throw new UnauthorizedError('Invalid credentials');
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    this.logger.info({ userId, ip }, 'auth.logout.success');
  }

  async updatePushToken(userId: string, token: string) {
    if (!token) throw new ValidationError('Push token required');

    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token },
    });

    this.logger.info({ userId }, 'auth.push_token.updated');
    return { registered: true };
  }
}
