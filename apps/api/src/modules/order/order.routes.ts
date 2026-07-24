import type { FastifyPluginAsync } from 'fastify';

import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { CancelBody, CreateOrderBody, CourierLocationBody, DisputeBody, DriverRateOrderBody, OrderQuery, QuoteBody, RateOrderBody, StatusBody } from './order.schema.js';
import { WalletService } from '../wallet/wallet.service.js';

const orderRoutes: FastifyPluginAsync = async (app) => {
  const walletService = new WalletService(app.prisma, app.log, app);
  const service = new OrderService(app.prisma, walletService, app.log, app);
  const controller = new OrderController(service);

  app.get('/hubs', { preHandler: [app.authenticate] }, controller.getActiveHubs);
  app.post('/orders/reverse-geocode', { preHandler: [app.authenticate] }, controller.reverseGeocode);
  app.get('/orders/autocomplete', { preHandler: [app.authenticate] }, controller.autocomplete);
  app.get('/orders/place-details', { preHandler: [app.authenticate] }, controller.getPlaceDetails);
  app.post('/orders/quote', { preHandler: [app.authenticate], schema: { body: QuoteBody } }, controller.getQuote);
  app.post('/orders', { preHandler: [app.authenticate], schema: { body: CreateOrderBody } }, controller.createOrder);
  app.get('/orders', { preHandler: [app.authenticate], schema: { querystring: OrderQuery } }, controller.getUserOrders);
  app.get('/orders/:id', { preHandler: [app.authenticate] }, controller.getOrderDetail);
  app.get('/orders/:id/tracking', { preHandler: [app.authenticate] }, controller.getOrderTracking);
  app.get('/orders/track/:code', controller.getOrderByTrackingCode);
  app.post('/orders/:id/cancel', { preHandler: [app.authenticate], schema: { body: CancelBody } }, controller.cancelOrder);
  app.post('/orders/:id/confirm', { preHandler: [app.authenticate] }, controller.confirmDelivery);
  app.post('/orders/:id/rate', { preHandler: [app.authenticate], schema: { body: RateOrderBody } }, controller.rateOrder);
  app.post('/orders/:id/dispute', { preHandler: [app.authenticate], schema: { body: DisputeBody } }, controller.disputeOrder);
  app.get('/driver/orders', { preHandler: [app.authenticateDriver] }, controller.getAvailableOrders);
  app.get('/driver/orders/active', { preHandler: [app.authenticateDriver] }, controller.getDriverActiveOrders);
  app.get('/driver/orders/history', { preHandler: [app.authenticateDriver] }, controller.getDriverOrdersHistory);
  app.post('/driver/orders/:id/accept', { preHandler: [app.authenticateDriver] }, controller.acceptOrder);
  app.post('/driver/orders/:id/decline', { preHandler: [app.authenticateDriver] }, controller.declineOrder);
  app.post('/driver/orders/:id/rate', { preHandler: [app.authenticateDriver], schema: { body: DriverRateOrderBody } }, controller.driverRateOrder);
  app.patch('/driver/orders/:id/status', { preHandler: [app.authenticateDriver], schema: { body: StatusBody } }, controller.updateOrderStatus);

  // Service Areas
  app.get('/service-areas', controller.getServiceAreas);

  // Courier Location
  app.patch('/orders/:id/courier-location', { preHandler: [app.authenticateDriver], schema: { body: CourierLocationBody } }, controller.updateCourierLocation);
  app.get('/orders/:id/courier-location', { preHandler: [app.authenticate] }, controller.getCourierLocation);
};

export default orderRoutes;
