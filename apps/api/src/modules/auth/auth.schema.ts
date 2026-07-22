import { Type } from '@sinclair/typebox';
import { z } from 'zod';

const passwordRule = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const nigerianPhone = /^\+234\d{10}$/;

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(nigerianPhone, 'Phone must be in +234XXXXXXXXXX format'),
  password: z
    .string()
    .regex(passwordRule, 'Password must be 8+ chars with at least 1 uppercase and 1 number'),
  fullName: z.string().min(2),
  referralCode: z.string().optional(),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const RegisterDriverSchema = RegisterUserSchema.extend({
  vehicleType: z.enum(['BIKE', 'TRICYCLE', 'CAR', 'VAN', 'TRUCK']),
  vehiclePlate: z.string().min(2),
  vehicleModel: z.string().min(2),
  licenseNumber: z.string().min(3),
});

export const VerifyOTPSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(nigerianPhone).optional(),
  otp: z.string().length(6),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .regex(passwordRule, 'Password must be 8+ chars with at least 1 uppercase and 1 number'),
});

export const ForgotPasswordSchema = z.object({
  identifier: z.string().min(1),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .regex(passwordRule, 'Password must be 8+ chars with at least 1 uppercase and 1 number'),
});

export const RegisterUserBody = Type.Object({
  email: Type.String({ format: 'email' }),
  phone: Type.String(),
  password: Type.String({ minLength: 8 }),
  fullName: Type.String({ minLength: 2 }),
  referralCode: Type.Optional(Type.String()),
});

export const RegisterDriverBody = Type.Object({
  email: Type.String({ format: 'email' }),
  phone: Type.String(),
  password: Type.String({ minLength: 8 }),
  fullName: Type.String({ minLength: 2 }),
  vehicleType: Type.Union([
    Type.Literal('BIKE'),
    Type.Literal('TRICYCLE'),
    Type.Literal('CAR'),
    Type.Literal('VAN'),
    Type.Literal('TRUCK'),
  ]),
  vehiclePlate: Type.String(),
  vehicleModel: Type.String(),
  licenseNumber: Type.String(),
});

export const LoginBody = Type.Object({
  identifier: Type.String(),
  password: Type.String(),
});

export const RefreshBody = Type.Object({
  refreshToken: Type.String(),
});

export const ForgotPasswordBody = Type.Object({
  identifier: Type.String(),
});

export const ResetPasswordBody = Type.Object({
  token: Type.String(),
  newPassword: Type.String({ minLength: 8 }),
});

export const VerifyOTPBody = Type.Object({
  email: Type.Optional(Type.String({ format: 'email' })),
  phone: Type.Optional(Type.String()),
  otp: Type.String({ minLength: 6, maxLength: 6 }),
});


export const PushTokenSchema = z.object({
  token: z.string().min(1),
});

export const PushTokenBody = Type.Object({
  token: Type.String({ minLength: 1 }),
});
