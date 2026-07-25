import type { FastifyRequest } from 'fastify';

import { success } from '../../utils/response.js';
import type { OrderService } from './order.service.js';

export class OrderController {
  constructor(private readonly service: OrderService) {}

  getQuote = async (request: FastifyRequest) => {
    const body = request.body as {
      size: 'SMALL' | 'MEDIUM' | 'LARGE';
      originHubId?: string;
      destinationHubId?: string;
      routeId?: string;
      localPickupAddress?: string;
      pickupAddress?: string;
      deliveryAddress?: string;
    };
    return success(await this.service.getQuote(body), 'Quote generated');
  };

  createOrder = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    return success(await this.service.createOrder(userId, request.body as never), 'Order created');
  };

  getUserOrders = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const query = request.query as { page?: number; limit?: number; status?: string };
    return success(await this.service.getUserOrders(userId, query), 'Orders fetched');
  };

  getOrderDetail = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    return success(await this.service.getOrderDetail(userId, id), 'Order fetched');
  };

  getOrderTracking = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    return success(await this.service.getOrderTracking(userId, id), 'Tracking data fetched');
  };

  getOrderByTrackingCode = async (request: FastifyRequest) => {
    const { code } = request.params as { code: string };
    return success(await this.service.getOrderByTrackingCode(code), 'Order fetched');
  };

  cancelOrder = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    return success(await this.service.cancelOrder(userId, id, reason), 'Order cancelled');
  };

  confirmDelivery = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    return success(await this.service.confirmDelivery(userId, id), 'Delivery confirmed');
  };

  rateOrder = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    const { userRating, userComment } = request.body as { userRating: number; userComment?: string };
    return success(await this.service.rateOrder(userId, id, userRating, userComment), 'Order rated');
  };

  disputeOrder = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    return success(await this.service.disputeOrder(userId, id, reason), 'Order disputed');
  };

  getAvailableOrders = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    return success(await this.service.getAvailableOrders(driverId), 'Available orders fetched');
  };

  getDriverActiveOrders = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    return success(await this.service.getDriverActiveOrders(driverId), 'Active orders fetched');
  };

  acceptOrder = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const { id } = request.params as { id: string };
    return success(await this.service.acceptOrder(driverId, id), 'Order accepted');
  };

  declineOrder = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const { id } = request.params as { id: string };
    const { reason } = (request.body ?? {}) as { reason?: string };
    return success(await this.service.declineOrder(driverId, id, reason), 'Order declined');
  };

  driverRateOrder = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const { id } = request.params as { id: string };
    const { driverRating, driverComment } = request.body as { driverRating: number; driverComment?: string };
    return success(await this.service.driverRateOrder(driverId, id, driverRating, driverComment), 'Customer rated');
  };

  updateOrderStatus = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const { id } = request.params as { id: string };
    const { status, lat, lng } = request.body as { status: 'IN_TRANSIT' | 'DELIVERED'; lat?: number; lng?: number };
    return success(await this.service.updateOrderStatus(driverId, id, status, lat, lng), 'Order status updated');
  };

  getDriverOrdersHistory = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string } | null)?.driverId ?? '');
    const query = request.query as { page?: number; limit?: number };
    return success(await this.service.getDriverOrdersHistory(driverId, query), 'Driver orders history fetched');
  };

  getServiceAreas = async (request: FastifyRequest) => {
    return success(await this.service.getServiceAreas(), 'Service areas fetched');
  };

  updateCourierLocation = async (request: FastifyRequest) => {
    const driverId = String((request.user as { driverId?: string; sub?: string } | null)?.driverId ?? (request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    const body = request.body as { lat: number; lng: number; heading?: number; speed?: number };
    return success(await this.service.updateCourierLocation(driverId, id, body), 'Location updated');
  };

  getCourierLocation = async (request: FastifyRequest) => {
    const userId = String((request.user as { sub?: string } | null)?.sub ?? '');
    const { id } = request.params as { id: string };
    return success(await this.service.getCourierLocation(userId, id), 'Courier location fetched');
  };

  getMessages = async (request: FastifyRequest) => {
    const userPayload = request.user as { sub?: string; id?: string; driverId?: string } | null;
    const actorId = String(userPayload?.sub ?? userPayload?.id ?? userPayload?.driverId ?? '').trim();
    const { id } = request.params as { id: string };
    return success(await this.service.getOrderMessages(id, actorId), 'Messages fetched');
  };

  sendMessage = async (request: FastifyRequest) => {
    const userPayload = request.user as { sub?: string; id?: string; driverId?: string } | null;
    const actorId = String(userPayload?.sub ?? userPayload?.id ?? userPayload?.driverId ?? '').trim();
    const { id } = request.params as { id: string };
    const { text } = request.body as { text: string };
    return success(await this.service.sendOrderMessage(id, actorId, text), 'Message sent');
  };

  getActiveHubs = async (request: FastifyRequest) => {
    return success(await this.service.getActiveHubs(), 'Active hubs fetched');
  };

  reverseGeocode = async (request: FastifyRequest) => {
    const { lat, lng } = request.body as { lat: number; lng: number };
    return success(await this.service.reverseGeocode(lat, lng), 'Address reverse geocoded');
  };

  autocomplete = async (request: FastifyRequest) => {
    const { input, lat, lng } = request.query as { input: string; lat?: string; lng?: string };
    const latNum = lat != null ? Number(lat) : undefined;
    const lngNum = lng != null ? Number(lng) : undefined;
    return success(await this.service.autocomplete(input, latNum, lngNum), 'Autocomplete suggestions fetched');
  };

  getPlaceDetails = async (request: FastifyRequest) => {
    const { placeId } = request.query as { placeId: string };
    return success(await this.service.getPlaceDetails(placeId), 'Place details fetched');
  };
}
