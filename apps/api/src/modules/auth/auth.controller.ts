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
    const { phone, otp } = request.body as { phone: string; otp: string };
    const result = await this.service.verifyOTP(phone, otp, request.ip);
    return success(result, 'Phone verified successfully');
  };

  registerPushToken = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { token } = request.body as { token: string };
    const result = await this.service.updatePushToken(userId, token);
    return success(result, 'Push token registered');
  };
}
