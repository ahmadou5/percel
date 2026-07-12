import type { FastifyRequest } from 'fastify';

import type { PaymentProviderService } from './payment.service.js';
import { success } from '../../utils/response.js';

export class PaymentProviderController {
  constructor(private readonly service: PaymentProviderService) {}

  getActiveProvider = async () => {
    const provider = await this.service.getActiveProvider();
    return success({ provider });
  };

  setActiveProvider = async (request: FastifyRequest) => {
    const { provider } = request.body as { provider: string };
    const data = await this.service.setActiveProvider(provider);
    return success(data, 'Payment provider updated');
  };
}
