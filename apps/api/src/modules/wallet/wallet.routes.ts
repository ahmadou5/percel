import type { FastifyPluginAsync } from 'fastify';

import { WalletController } from './wallet.controller.js';
import { AirtimeBody, DataBody, ElectricityBody, ResetTransferPinBody, SetTransferPinBody, TopUpBody, TransferBody, TxQuery, VerifyTransferPinBody } from './wallet.schema.js';
import { WalletService } from './wallet.service.js';

const walletRoutes: FastifyPluginAsync = async (app) => {
  const service = new WalletService(app.prisma, app.log, app);
  const controller = new WalletController(service);

  app.get('/wallet', { preHandler: [app.authenticate] }, controller.getWallet);
  app.get('/wallet/transactions', { preHandler: [app.authenticate], schema: { querystring: TxQuery } }, controller.getTransactions);
  app.post('/wallet/topup', { preHandler: [app.authenticate], schema: { body: TopUpBody } }, controller.topup);
  app.post('/wallet/transfer', { preHandler: [app.authenticate], schema: { body: TransferBody } }, controller.transfer);
  app.put('/wallet/pin', { preHandler: [app.authenticate], schema: { body: SetTransferPinBody } }, controller.setTransferPin);
  app.post('/wallet/pin/reset', { preHandler: [app.authenticate], schema: { body: ResetTransferPinBody } }, controller.resetTransferPin);
  app.post('/wallet/pin/verify', { preHandler: [app.authenticate], schema: { body: VerifyTransferPinBody } }, controller.verifyTransferPin);
  app.post('/wallet/bills/airtime', { preHandler: [app.authenticate], schema: { body: AirtimeBody } }, controller.airtime);
  app.post('/wallet/bills/data', { preHandler: [app.authenticate], schema: { body: DataBody } }, controller.data);
  app.post('/wallet/bills/electricity', { preHandler: [app.authenticate], schema: { body: ElectricityBody } }, controller.electricity);
  app.post('/webhooks/paystack', { config: { rateLimit: false } }, controller.webhook);
};

export default walletRoutes;
