import type { FastifyRequest } from 'fastify';

import { success } from '../../utils/response.js';
import type { ReferralService } from './referral.service.js';

export class ReferralController {
  constructor(private readonly service: ReferralService) {}

  getStats = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.getReferralStats(userId));
  };

  getMyCode = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.getMyReferralCode(userId));
  };

  applyCode = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { code } = request.body as { code: string };
    return success(await this.service.applyReferralCode(userId, code), 'Referral code applied');
  };

  claimRewards = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.claimReferralRewards(userId), 'Referral rewards claimed');
  };
}
