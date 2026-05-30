import type { FastifyReply, FastifyRequest } from 'fastify';

import { success } from '../../utils/response.js';
import type { WalletService } from './wallet.service.js';

export class WalletController {
  constructor(private readonly service: WalletService) {}

  getWallet = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const data = await this.service.getWallet(userId);
    return success(data);
  };

  getTransactions = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const wallet = await this.service.getWallet(userId);
    const query = request.query as { page?: number; limit?: number; category?: string };
    const data = await this.service.getTransactions(wallet.id, query);
    return success(data);
  };

  topup = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { amount, callbackUrl } = request.body as { amount: number; callbackUrl?: string };
    const data = await this.service.initializeTopUp(userId, amount, callbackUrl);
    return success(data);
  };

  transfer = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { toPhone, amount, description, pin } = request.body as {
      toPhone: string;
      amount: number;
      description?: string;
      pin: string;
    };
    const data = await this.service.transfer(userId, toPhone, amount, description, pin);
    return success(data);
  };

  setTransferPin = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { currentPin, newPin } = request.body as { currentPin?: string; newPin: string };
    const data = await this.service.setTransferPin(userId, newPin, currentPin);
    return success(data, 'Transfer PIN updated');
  };

  resetTransferPin = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { currentPin } = request.body as { currentPin: string };
    const data = await this.service.resetTransferPin(userId, currentPin);
    return success(data, 'Transfer PIN removed');
  };

  airtime = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { phone, amount, network } = request.body as { phone: string; amount: number; network: string };
    const data = await this.service.buyAirtime(userId, phone, amount, network);
    return success(data);
  };

  data = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { phone, plan, network, amount } = request.body as {
      phone: string;
      plan: string;
      network: string;
      amount: number;
    };
    const result = await this.service.buyData(userId, phone, plan, network, amount);
    return success(result);
  };

  electricity = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { meterNumber, amount, disco } = request.body as {
      meterNumber: string;
      amount: number;
      disco: string;
    };
    const data = await this.service.buyElectricity(userId, meterNumber, amount, disco);
    return success(data);
  };

  webhook = async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-paystack-signature'];
    const sig = Array.isArray(signature) ? signature[0] : signature;
    await this.service.handlePaystackWebhook(request.body as Record<string, unknown>, sig);
    return reply.status(200).send({ ok: true });
  };
}
