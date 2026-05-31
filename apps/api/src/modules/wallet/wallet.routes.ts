import type { FastifyPluginAsync } from 'fastify';

import { WalletController } from './wallet.controller.js';
import { AirtimeBody, BankResolveBody, BankTransferBody, DataBody, ElectricityBody, ProviderServicesQuery, ProviderValidateBody, ProviderVariationsParams, ResetTransferPinBody, SetTransferPinBody, TopUpBody, TransferBody, TvBody, TxQuery, VerifyTransferPinBody } from './wallet.schema.js';
import { WalletService } from './wallet.service.js';

const walletRoutes: FastifyPluginAsync = async (app) => {
  const service = new WalletService(app.prisma, app.log, app);
  const controller = new WalletController(service);

  app.get('/wallet', { preHandler: [app.authenticate] }, controller.getWallet);
  app.get('/wallet/transactions', { preHandler: [app.authenticate], schema: { querystring: TxQuery } }, controller.getTransactions);
  app.post('/wallet/topup', { preHandler: [app.authenticate], schema: { body: TopUpBody } }, controller.topup);
  app.post('/wallet/transfer', { preHandler: [app.authenticate], schema: { body: TransferBody } }, controller.transfer);
  app.get('/wallet/banks', { preHandler: [app.authenticate] }, controller.bankList);
  app.post('/wallet/bank/resolve', { preHandler: [app.authenticate], schema: { body: BankResolveBody } }, controller.resolveBank);
  app.post('/wallet/bank-transfer', { preHandler: [app.authenticate], schema: { body: BankTransferBody } }, controller.bankTransfer);
  app.get('/wallet/providers', { preHandler: [app.authenticate], schema: { querystring: ProviderServicesQuery } }, controller.providerServices);
  app.get('/wallet/providers/:serviceID/variations', { preHandler: [app.authenticate], schema: { params: ProviderVariationsParams } }, controller.providerVariations);
  app.post('/wallet/providers/validate', { preHandler: [app.authenticate], schema: { body: ProviderValidateBody } }, controller.providerValidate);
  app.put('/wallet/pin', { preHandler: [app.authenticate], schema: { body: SetTransferPinBody } }, controller.setTransferPin);
  app.post('/wallet/pin/reset', { preHandler: [app.authenticate], schema: { body: ResetTransferPinBody } }, controller.resetTransferPin);
  app.post('/wallet/pin/verify', { preHandler: [app.authenticate], schema: { body: VerifyTransferPinBody } }, controller.verifyTransferPin);
  app.post('/wallet/bills/airtime', { preHandler: [app.authenticate], schema: { body: AirtimeBody } }, controller.airtime);
  app.post('/wallet/bills/data', { preHandler: [app.authenticate], schema: { body: DataBody } }, controller.data);
  app.post('/wallet/bills/electricity', { preHandler: [app.authenticate], schema: { body: ElectricityBody } }, controller.electricity);
  app.post('/wallet/bills/tv', { preHandler: [app.authenticate], schema: { body: TvBody } }, controller.tv);
  app.post('/webhooks/paystack', { config: { rateLimit: false } }, controller.webhook);
  app.post('/wallet/webhooks/paystack', { config: { rateLimit: false } }, controller.webhook);
};

export default walletRoutes;
