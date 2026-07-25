import type { FastifyPluginAsync } from 'fastify';

import { ReferralController } from './referral.controller.js';
import { ReferralService } from './referral.service.js';
import { ApplyReferralBody, ApplyReferralSchema } from './referral.schema.js';

const referralRoutes: FastifyPluginAsync = async (app) => {
  const service = new ReferralService(app.prisma, app.log, app);
  const controller = new ReferralController(service);

  /** Get referral dashboard: code, stats, list of referrals */
  app.get('/referrals', { preHandler: [app.authenticate] }, controller.getStats);

  /** Get (or generate) user's referral code */
  app.get('/referrals/code', { preHandler: [app.authenticate] }, controller.getMyCode);

  /** Apply a referral code (post-registration) */
  app.post(
    '/referrals/apply',
    {
      preHandler: [app.authenticate],
      schema: { body: ApplyReferralBody },
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request) => {
      ApplyReferralSchema.parse(request.body);
      return controller.applyCode(request);
    },
  );

  /** Claim qualified referral rewards into wallet */
  app.post('/referrals/claim', { preHandler: [app.authenticate] }, controller.claimRewards);
};

export default referralRoutes;
