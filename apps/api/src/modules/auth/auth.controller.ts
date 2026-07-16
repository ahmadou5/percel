import type { FastifyRequest } from 'fastify';

import { success } from '../../utils/response.js';
import type { AuthService } from './auth.service.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  registerUser = async (request: FastifyRequest) => {
    const result = await this.service.registerUser(request.body as Record<string, unknown>);
    return success(result, 'Registration successful');
  };

  registerDriver = async (request: FastifyRequest) => {
    const result = await this.service.registerDriver(request.body as Record<string, unknown>);
    return success(result, 'Driver registration successful');
  };

  login = async (request: FastifyRequest) => {
    const body = request.body as { identifier: string; password: string };
    const result = await this.service.login(body.identifier, body.password, request.ip);
    return success(result, 'Login successful');
  };

  refresh = async (request: FastifyRequest) => {
    const body = request.body as { refreshToken: string };
    const tokens = await this.service.refreshTokens(body.refreshToken, request.ip);
    return success(tokens, 'Token refresh successful');
  };

  logout = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    await this.service.logout(userId, request.ip);
    return success({ loggedOut: true }, 'Logout successful');
  };

  forgotPassword = async (request: FastifyRequest) => {
    const { identifier } = request.body as { identifier: string };
    await this.service.forgotPassword(identifier);
    return success(
      { accepted: true },
      'If the account exists, password reset instructions have been sent.',
    );
  };

  resetPassword = async (request: FastifyRequest) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string };
    await this.service.resetPassword(token, newPassword);
    return success({ accepted: true }, 'Password reset request accepted.');
  };

  verifyOTP = async (request: FastifyRequest) => {
    const { email, phone, otp } = request.body as { email?: string; phone?: string; otp: string };
    const result = await this.service.verifyOTP({ email, phone }, otp, request.ip);
    return success(result, 'Verified successfully');
  };

  registerPushToken = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { token } = request.body as { token: string };
    const result = await this.service.updatePushToken(userId, token);
    return success(result, 'Push token registered');
  };

  // ── In-app Email Verification ──────────────────────────────────────────────

  requestEmailVerification = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    await this.service.requestEmailVerification(userId);
    return success({ sent: true }, 'Verification code sent to your email address.');
  };

  confirmEmailVerification = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { otp } = request.body as { otp: string };
    const result = await this.service.confirmEmailVerification(userId, otp);
    return success(result, 'Email verified successfully.');
  };

  // ── In-app Phone Verification ──────────────────────────────────────────────

  requestPhoneVerification = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    await this.service.requestPhoneVerification(userId);
    return success({ sent: true }, 'Verification code sent to your phone number.');
  };

  confirmPhoneVerification = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { otp } = request.body as { otp: string };
    const result = await this.service.confirmPhoneVerification(userId, otp);
    return success(result, 'Phone verified successfully.');
  };
}
