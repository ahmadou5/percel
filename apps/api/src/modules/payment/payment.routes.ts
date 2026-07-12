import type { FastifyPluginAsync } from 'fastify';

import { PaymentProviderController } from './payment.controller.js';
import { PaymentProviderBody } from './payment.schema.js';
import { PaymentProviderService } from './payment.service.js';

const paymentProviderRoutes: FastifyPluginAsync = async (app) => {
  const service = new PaymentProviderService(app.prisma);
  const controller = new PaymentProviderController(service);

  app.get('/admin/payment-provider', { preHandler: [app.authenticateAdmin] }, controller.getActiveProvider);
  app.put('/admin/payment-provider', { preHandler: [app.authenticateAdmin], schema: { body: PaymentProviderBody } }, controller.setActiveProvider);
};

export default paymentProviderRoutes;
