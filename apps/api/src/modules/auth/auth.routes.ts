import type { FastifyPluginAsync } from 'fastify';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  ForgotPasswordBody,
  ForgotPasswordSchema,
  LoginBody,
  LoginSchema,
  PushTokenBody,
  PushTokenSchema,
  RefreshBody,
  RefreshTokenSchema,
  RegisterDriverBody,
  RegisterDriverSchema,
  RegisterUserBody,
  RegisterUserSchema,
  ResetPasswordBody,
  ResetPasswordSchema,
  VerifyOTPBody,
  VerifyOTPSchema,
} from './auth.schema.js';
import { Type } from '@sinclair/typebox';
import { z } from 'zod';

const ConfirmOTPBody = Type.Object({ otp: Type.String({ minLength: 6, maxLength: 6 }) });
const ConfirmOTPSchema = z.object({ otp: z.string().length(6) });

const authRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuthService(app.prisma, app.jwt as never, app.log);
  const controller = new AuthController(service);

  app.post('/register', { schema: { body: RegisterUserBody }, config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    RegisterUserSchema.parse(request.body);
    return controller.registerUser(request);
  });

  app.post('/register/driver', { schema: { body: RegisterDriverBody }, config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    RegisterDriverSchema.parse(request.body);
    return controller.registerDriver(request);
  });

  app.post(
    '/login',
    { schema: { body: LoginBody }, config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (request) => {
      LoginSchema.parse(request.body);
      return controller.login(request);
    },
  );

  app.post('/refresh', { schema: { body: RefreshBody }, config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    RefreshTokenSchema.parse(request.body);
    return controller.refresh(request);
  });

  app.post('/logout', { preHandler: [app.authenticate] }, async (request) => controller.logout(request));

  app.post('/push-token', { preHandler: [app.authenticate], schema: { body: PushTokenBody }, config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request) => {
    PushTokenSchema.parse(request.body);
    return controller.registerPushToken(request);
  });

  app.post('/forgot-password', { schema: { body: ForgotPasswordBody }, config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    ForgotPasswordSchema.parse(request.body);
    return controller.forgotPassword(request);
  });

  app.post('/reset-password', { schema: { body: ResetPasswordBody }, config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    ResetPasswordSchema.parse(request.body);
    return controller.resetPassword(request);
  });

  // Legacy verify-otp (kept for backward compat)
  app.post('/verify-otp', { schema: { body: VerifyOTPBody }, config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    VerifyOTPSchema.parse(request.body);
    return controller.verifyOTP(request);
  });

  // ── In-app Email Verification ──────────────────────────────────────────────

  app.post('/email/verify/request', {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
  }, async (request) => controller.requestEmailVerification(request));

  app.post('/email/verify/confirm', {
    preHandler: [app.authenticate],
    schema: { body: ConfirmOTPBody },
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request) => {
    ConfirmOTPSchema.parse(request.body);
    return controller.confirmEmailVerification(request);
  });

  // ── In-app Phone Verification ──────────────────────────────────────────────

  app.post('/phone/verify/request', {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
  }, async (request) => controller.requestPhoneVerification(request));

  app.post('/phone/verify/confirm', {
    preHandler: [app.authenticate],
    schema: { body: ConfirmOTPBody },
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request) => {
    ConfirmOTPSchema.parse(request.body);
    return controller.confirmPhoneVerification(request);
  });
};

export default authRoutes;
