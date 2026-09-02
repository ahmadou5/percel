import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

import { IdentityProviderService } from './identity.service.js';
import { success } from '../../utils/response.js';

const IdentityProviderBody = Type.Object({
  provider: Type.Union([Type.Literal('SMILE'), Type.Literal('DOJAH'), Type.Literal('PREMBLY'), Type.Literal('NONE')]),
});

const identityRoutes: FastifyPluginAsync = async (app) => {
  const service = new IdentityProviderService(app.prisma);

  app.get('/admin/identity-provider', { preHandler: [app.authenticateAdmin] }, async () => {
    const provider = await service.getActiveProvider();
    return success({ provider }, 'Identity provider fetched');
  });

  app.put('/admin/identity-provider', { preHandler: [app.authenticateAdmin], schema: { body: IdentityProviderBody } }, async (request) => {
    const body = request.body as { provider: string };
    const result = await service.setActiveProvider(body.provider);
    return success(result, 'Identity provider updated');
  });
};

export default identityRoutes;
