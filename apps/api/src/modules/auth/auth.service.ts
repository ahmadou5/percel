import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient, User, UserRole } from '@prisma/client';

import { ForbiddenError, UnauthorizedError, ValidationError } from '../../utils/errors.js';
import { sendEmail } from '../../utils/mailer.js';
import { sendSMS } from '../../utils/sms.js';
import type { AuthResponse, AuthTokens, SafeUser } from './auth.types.js';

const ACCESS_EXPIRES = '2h';
const REFRESH_EXPIRES = '15d';

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
  referralCode?: string;
};

type DriverInput = AuthInput & {
  vehicleType: 'BIKE' | 'TRICYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  vehiclePlate: string;
  vehicleModel: string;
  licenseNumber: string;
};

type UserTokenContext = {
  userId: string;
  role: UserRole;
  driverId?: string | null;
};

/**
 * Normalize an identifier (email or phone) so lookups work regardless of
 * whether the caller sends "08012345678", "2348012345678" or "+2348012345678".
 */
function normalizeIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();

  // Strip non-digit characters
  const digits = trimmed.replace(/\D/g, '');

  if (digits.startsWith('234') && digits.length >= 13) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+234${digits}`;
  }
  // Return with + prefix if it already starts with 234
  return trimmed.startsWith('+') ? trimmed : `+${digits}`;
}

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
    emailVerified: (user as any).emailVerified ?? false,
    phoneVerified: (user as any).phoneVerified ?? false,
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

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 mins
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

  // ─── Registration ──────────────────────────────────────────────────────────

  async registerUser(data: Record<string, unknown>): Promise<AuthResponse> {
    const payload = data as AuthInput;

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: payload.email }, { phone: payload.phone }] },
    });
    if (existing) throw new ValidationError('Email or phone already exists');

    const passwordHash = await bcrypt.hash(payload.password, 12);
    let inviterId: string | null = null;
    if (payload.referralCode) {
      const inviter = await this.prisma.user.findUnique({
        where: { referralCode: payload.referralCode.trim().toUpperCase() },
        select: { id: true },
      });
      if (!inviter) throw new ValidationError('Invalid referral code');
      inviterId = inviter.id;
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: payload.email,
          phone: payload.phone,
          passwordHash,
          fullName: payload.fullName,
          referredById: inviterId,
          status: 'ACTIVE', // no verification gate at signup
        },
      });

      await tx.wallet.create({ data: { userId: created.id, nuban: null, bankName: null } });

      if (inviterId) {
        await tx.referral.create({
          data: {
            inviterId,
            inviteeId: created.id,
            status: 'PENDING',
          },
        });
      }

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
          status: 'ACTIVE', // no verification gate at signup
        },
      });

      await tx.wallet.create({ data: { userId: created.id } });
      await tx.driver.create({
        data: {
          userId: created.id,
          licenseNumber: payload.licenseNumber || 'PENDING',
          vehicleType: payload.vehicleType || 'BIKE',
          vehiclePlate: payload.vehiclePlate || 'PENDING',
          vehicleModel: payload.vehicleModel || 'UNSET',
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

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(identifier: string, password: string, ip?: string): Promise<AuthResponse> {
    const normalized = normalizeIdentifier(identifier);
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: normalized }, { phone: normalized }] },
    });

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

  // ─── Legacy OTP verify (kept for backward compat, now mostly unused) ───────

  async verifyOTP(params: { email?: string; phone?: string }, otp: string, ip?: string): Promise<AuthResponse> {
    const { email, phone } = params;
    if (!email && !phone) throw new ValidationError('email or phone required');

    const user = await this.prisma.user.findFirst({
      where: email ? { email } : { phone },
    });
    if (!user) throw new ValidationError('User not found');

    // Check email verification fields
    const u = user as any;
    const code: string | null = u.emailVerificationCode ?? u.phoneVerificationCode ?? null;
    const expiry: Date | null = u.emailVerificationExpiry ?? u.phoneVerificationExpiry ?? null;

    if (!code || !expiry) throw new ValidationError('No active verification request found');
    if (expiry < new Date()) throw new ValidationError('Verification code has expired');
    if (code !== otp) throw new ValidationError('Invalid verification code');

    const isEmailVerify = Boolean(u.emailVerificationCode);
    const updateData: Record<string, unknown> = isEmailVerify
      ? { emailVerificationCode: null, emailVerificationExpiry: null, emailVerified: true }
      : { phoneVerificationCode: null, phoneVerificationExpiry: null, phoneVerified: true };

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData as any,
    });

    const driverId = await this.resolveDriverId(updated.id);
    const tokens = await this.generateTokens({ userId: updated.id, role: updated.role, driverId });
    await this.prisma.user.update({ where: { id: updated.id }, data: { refreshToken: hashToken(tokens.refreshToken) } });

    this.logger.info({ userId: updated.id, ip }, 'auth.verify_otp.success');
    return { user: redactUser(updated), tokens };
  }

  // ─── In-App Email Verification ─────────────────────────────────────────────

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ValidationError('User not found');
    if (!user.email) throw new ValidationError('No email address associated with this account');

    const otpCode = generateOTP();
    const expiry = otpExpiry();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationCode: otpCode,
        emailVerificationExpiry: expiry,
      } as any,
    });

    // Send email in background without blocking response if SMTP hangs or is slow
    void sendEmail({
      to: user.email,
      subject: 'Verify your Percel email address',
      text: `Your Percel email verification code is: ${otpCode}. Valid for 15 minutes.`,
      html: `<p>Your Percel email verification code is: <strong>${otpCode}</strong>.</p><p>Valid for 15 minutes.</p>`,
    }).catch((err) => {
      this.logger.error({ userId, err: err?.message || err }, 'auth.email_verification.send_failed');
    });

    this.logger.info({ userId }, 'auth.email_verification.requested');
  }

  async confirmEmailVerification(userId: string, otp: string): Promise<{ verified: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ValidationError('User not found');

    const u = user as any;
    if (!u.emailVerificationCode || !u.emailVerificationExpiry) {
      throw new ValidationError('No active email verification request. Please request a new code.');
    }
    if (u.emailVerificationExpiry < new Date()) {
      throw new ValidationError('Verification code has expired. Please request a new one.');
    }
    if (u.emailVerificationCode !== otp) {
      throw new ValidationError('Invalid verification code.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      } as any,
    });

    this.logger.info({ userId }, 'auth.email_verification.confirmed');
    return { verified: true };
  }

  // ─── In-App Phone Verification ─────────────────────────────────────────────

  async requestPhoneVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ValidationError('User not found');
    if (!user.phone) throw new ValidationError('No phone number associated with this account');

    const otpCode = generateOTP();
    const expiry = otpExpiry();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerificationCode: otpCode,
        phoneVerificationExpiry: expiry,
      },
    });

    // Send SMS in background without blocking response if provider hangs or is slow
    void sendSMS({
      to: user.phone,
      message: `Your Twilio verification code is: ${otpCode}`,
    }).catch((err) => {
      this.logger.error({ userId, err: err?.message || err }, 'auth.phone_verification.send_failed');
    });

    this.logger.info({ userId }, 'auth.phone_verification.requested');
  }

  async confirmPhoneVerification(userId: string, otp: string): Promise<{ verified: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ValidationError('User not found');

    if (!user.phoneVerificationCode || !user.phoneVerificationExpiry) {
      throw new ValidationError('No active phone verification request. Please request a new code.');
    }
    if (user.phoneVerificationExpiry < new Date()) {
      throw new ValidationError('Verification code has expired. Please request a new one.');
    }
    if (user.phoneVerificationCode !== otp) {
      throw new ValidationError('Invalid verification code.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
      } as any,
    });

    this.logger.info({ userId }, 'auth.phone_verification.confirmed');
    return { verified: true };
  }

  // ─── Password Recovery ─────────────────────────────────────────────────────

  async forgotPassword(identifier: string): Promise<void> {
    const normalized = normalizeIdentifier(identifier);

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: normalized }, { phone: normalized }] },
    });
    if (!user) {
      this.logger.warn({ identifier }, 'auth.forgot_password.user_not_found');
      return; // silent — don't leak whether account exists
    }

    const otpCode = generateOTP();
    const expiry = otpExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: otpCode,
        passwordResetExpiry: expiry,
      },
    });

    const isPhoneIdentifier = !identifier.includes('@');
    if (isPhoneIdentifier && user.phone) {
      void sendSMS({
        to: user.phone,
        message: `Your Twilio verification code is: ${otpCode}`,
      }).catch((err) => {
        this.logger.error({ userId: user.id, err: err?.message || err }, 'auth.forgot_password.sms_failed');
      });
    }

    if (user.email) {
      void sendEmail({
        to: user.email,
        subject: 'Reset your Percel Password',
        text: `Your password reset code is: ${otpCode}. It is valid for 15 minutes.`,
        html: `<p>Your password reset code is: <strong>${otpCode}</strong>.</p><p>It is valid for 15 minutes.</p>`,
      }).catch((err) => {
        this.logger.error({ userId: user.id, err: err?.message || err }, 'auth.forgot_password.email_failed');
      });
    }

    this.logger.info({ userId: user.id }, 'auth.forgot_password.sent');
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    this.logger.info({ userId: user.id }, 'auth.reset_password.success');
  }

  // ─── Token Management ──────────────────────────────────────────────────────

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
