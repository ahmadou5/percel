import crypto from 'node:crypto';

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { OrderStatus, PaymentStatus, Prisma, type OrderSize, type PrismaClient } from '@prisma/client';

import { getDistanceAndDuration, geocodeAddress } from '../../lib/googleMaps.js';
import { composeDeliveryAddress, composePickupAddress, resolveHubRouteContext } from '../../lib/hubs.js';
import { getCachedJson, setCachedJson } from '../../lib/cache.js';
import { addNotificationJob } from '../../queues/index.js';
import { broadcastOrderStatusUpdate, clearActiveDriverTracking, setActiveDriverTracking, type RealtimeApp } from '../../lib/realtime.js';
import { getPriceQuote } from '../../lib/pricing.js';
import { addOrderMatchingJob } from '../../queues/index.js';
import { haversineDistanceKm } from '../../utils/helpers.js';
import { cleanText } from '../../utils/sanitize.js';
import { ForbiddenError, NotFoundError, PaymentError, ValidationError } from '../../utils/errors.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { OrderQuote, OrderSummary } from './order.types.js';

function asNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

function makeTrackingCode() {
  return `TRK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function assertRating(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }
}

type OrderLike = {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  price: Prisma.Decimal | number;
  currency: string;
  size: OrderSize;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  distanceKm: Prisma.Decimal | number;
  estimatedDurationMin: number;
  createdAt: Date;
  driver?: {
    id: string;
    userId: string;
    user: { fullName: string };
    rating: Prisma.Decimal | number;
    vehicleType: string;
    vehicleModel: string;
    vehiclePlate: string;
    isOnline: boolean;
  } | null;
};

function serializeOrder(order: OrderLike): OrderSummary {
  return {
    id: order.id,
    trackingCode: order.trackingCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    price: asNumber(order.price),
    currency: order.currency,
    size: order.size,
    pickupFormattedAddress: order.pickupFormattedAddress,
    deliveryFormattedAddress: order.deliveryFormattedAddress,
    distanceKm: asNumber(order.distanceKm),
    estimatedDurationMin: order.estimatedDurationMin,
    createdAt: order.createdAt.toISOString(),
    driver: order.driver
      ? {
          id: order.driver.id,
          userId: order.driver.userId,
          fullName: order.driver.user.fullName,
          rating: asNumber(order.driver.rating),
          vehicleType: order.driver.vehicleType,
          vehicleModel: order.driver.vehicleModel,
          vehiclePlate: order.driver.vehiclePlate,
          isOnline: order.driver.isOnline,
        }
      : null,
  };
}

export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly walletService: WalletService,
    private readonly logger: FastifyBaseLogger,
    private readonly app: FastifyInstance,
  ) {}

  async getQuote(payload: {
    size: OrderSize;
    originHubId?: string | null;
    destinationHubId?: string | null;
    routeId?: string | null;
    pickupAddress?: string;
    deliveryAddress?: string;
  }): Promise<OrderQuote> {
    const routeContext = resolveHubRouteContext(payload.originHubId, payload.destinationHubId, payload.routeId);

    if (routeContext) {
      const onlineDriversCacheKey = 'cache:drivers:online:active';
      const cachedDrivers = await getCachedJson<number>(this.app.redis, onlineDriversCacheKey);
      const onlineDrivers =
        cachedDrivers ??
        (await this.prisma.driver.count({ where: { isOnline: true, status: 'ACTIVE' } }));
      if (cachedDrivers == null) {
        await setCachedJson(this.app.redis, onlineDriversCacheKey, onlineDrivers, 30);
      }

      const quoteKey = `cache:quote:${payload.size}:hub:${routeContext.route.id}:${routeContext.distanceKm.toFixed(1)}:${Math.round(routeContext.durationMin)}:${onlineDrivers}`;
      const cached = await getCachedJson<OrderQuote>(this.app.redis, quoteKey);
      if (cached) return cached;

      const quote = getPriceQuote(payload.size, routeContext.distanceKm, routeContext.durationMin, onlineDrivers);
      await setCachedJson(this.app.redis, quoteKey, quote, 300);
      return quote;
    }

    if (!payload.pickupAddress || !payload.deliveryAddress) {
      throw new ValidationError('Pickup and delivery addresses are required');
    }

    const pickup = await geocodeAddress(cleanText(payload.pickupAddress) ?? payload.pickupAddress);
    const delivery = await geocodeAddress(cleanText(payload.deliveryAddress) ?? payload.deliveryAddress);
    const route = await getDistanceAndDuration(pickup.lat, pickup.lng, delivery.lat, delivery.lng);
    const onlineDriversCacheKey = 'cache:drivers:online:active';
    const cachedDrivers = await getCachedJson<number>(this.app.redis, onlineDriversCacheKey);
    const onlineDrivers =
      cachedDrivers ??
      (await this.prisma.driver.count({ where: { isOnline: true, status: 'ACTIVE' } }));
    if (cachedDrivers == null) {
      await setCachedJson(this.app.redis, onlineDriversCacheKey, onlineDrivers, 30);
    }

    const quoteKey = `cache:quote:${payload.size}:${route.distanceKm.toFixed(1)}:${Math.round(route.durationMin)}:${onlineDrivers}`;
    const cached = await getCachedJson<OrderQuote>(this.app.redis, quoteKey);
    if (cached) return cached;

    const quote = getPriceQuote(payload.size, route.distanceKm, route.durationMin, onlineDrivers);
    await setCachedJson(this.app.redis, quoteKey, quote, 300);
    return quote;
  }

  async createOrder(userId: string, data: {
    size: OrderSize;
    originHubId?: string | null;
    destinationHubId?: string | null;
    routeId?: string | null;
    localPickupAddress?: string | null;
    pickupAddress?: string;
    deliveryAddress?: string;
    contactName?: string | null;
    contactPhone?: string | null;
    pickupNote?: string | null;
    items: Array<{ description: string; quantity: number; weightKg: number; fragile?: boolean; imageUrl?: string | null }>;
    notes?: string | null;
    fragile?: boolean;
  }) {
    const routeContext = resolveHubRouteContext(data.originHubId, data.destinationHubId, data.routeId);
    const pickupContactName = cleanText(data.contactName);
    const pickupContactPhone = cleanText(data.contactPhone);
    const pickupNote = cleanText(data.pickupNote);
    const notesParts = [
      cleanText(data.notes),
      pickupNote ? `Pickup note: ${pickupNote}` : null,
      pickupContactName
        ? `Pickup contact: ${pickupContactName}${pickupContactPhone ? ` (${pickupContactPhone})` : ''}`
        : null,
    ].filter((part): part is string => Boolean(part && part.trim()));

    const orderNotes = notesParts.length ? notesParts.join('\n') : null;

    const pickup = routeContext
      ? {
          street: cleanText(data.localPickupAddress) ?? routeContext.originHub.address,
          city: routeContext.originHub.city,
          state: routeContext.originHub.state,
          country: 'Nigeria',
          lat: routeContext.originHub.lat,
          lng: routeContext.originHub.lng,
          placeId: routeContext.originHub.id,
          formattedAddress: composePickupAddress(routeContext.originHub, cleanText(data.localPickupAddress) ?? ''),
        }
      : await geocodeAddress(data.pickupAddress ?? '');

    const delivery = routeContext
      ? {
          street: routeContext.destinationHub.address,
          city: routeContext.destinationHub.city,
          state: routeContext.destinationHub.state,
          country: 'Nigeria',
          lat: routeContext.destinationHub.lat,
          lng: routeContext.destinationHub.lng,
          placeId: routeContext.destinationHub.id,
          formattedAddress: composeDeliveryAddress(routeContext.destinationHub),
        }
      : await geocodeAddress(data.deliveryAddress ?? '');

    if (!routeContext && (!data.pickupAddress || !data.deliveryAddress)) {
      throw new ValidationError('Pickup and delivery addresses are required');
    }

    const route = routeContext
      ? {
          distanceKm: routeContext.distanceKm,
          durationMin: routeContext.durationMin,
        }
      : await getDistanceAndDuration(pickup.lat, pickup.lng, delivery.lat, delivery.lng);

    const onlineDrivers = await this.prisma.driver.count({ where: { isOnline: true, status: 'ACTIVE' } });
    const quote = getPriceQuote(data.size, route.distanceKm, route.durationMin, onlineDrivers);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    const balance = await this.walletService.getBalance(wallet.id);
    if (balance.realBalance < quote.totalPrice) throw new PaymentError('Insufficient wallet balance');

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          trackingCode: makeTrackingCode(),
          userId,
          size: data.size,
          pickupStreet: pickup.street,
          pickupCity: pickup.city,
          pickupState: pickup.state,
          pickupCountry: pickup.country,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          pickupPlaceId: pickup.placeId,
          pickupFormattedAddress: pickup.formattedAddress,
          deliveryStreet: delivery.street,
          deliveryCity: delivery.city,
          deliveryState: delivery.state,
          deliveryCountry: delivery.country,
          deliveryLat: delivery.lat,
          deliveryLng: delivery.lng,
          deliveryPlaceId: delivery.placeId,
          deliveryFormattedAddress: delivery.formattedAddress,
          distanceKm: quote.distanceKm,
          estimatedDurationMin: quote.durationMin,
          price: quote.totalPrice,
          currency: 'NGN',
          notes: orderNotes,
          fragile: data.fragile ?? false,
          status: OrderStatus.CREATED,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      await tx.orderItem.createMany({
        data: data.items.map((item) => ({
          orderId: created.id,
          description: item.description,
          quantity: item.quantity,
          weightKg: item.weightKg,
          fragile: item.fragile ?? false,
          imageUrl: item.imageUrl ?? null,
        })),
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: created.id,
          status: OrderStatus.CREATED,
          note: 'Order created',
        },
      });

      await this.walletService.deductForOrder(userId, created.id, quote.totalPrice, tx);

      const updated = await tx.order.update({
        where: { id: created.id },
        data: { paymentStatus: PaymentStatus.PAID, status: OrderStatus.PENDING_MATCH },
        include: { driver: { include: { user: true } } },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: created.id,
          status: OrderStatus.PENDING_MATCH,
          note: 'Payment confirmed; matching driver',
        },
      });

      return updated;
    });

    await addOrderMatchingJob(this.app, {
      orderId: order.id,
      pickupLat: Number(pickup.lat),
      pickupLng: Number(pickup.lng),
      deliveryLat: Number(delivery.lat),
      deliveryLng: Number(delivery.lng),
      size: data.size,
    });

    await addNotificationJob(this.app, userId, 'ORDER_CREATED', {
      orderId: order.id,
      trackingCode: order.trackingCode,
      price: Number(order.price),
    });

    this.logger.info({ userId, orderId: order.id, price: order.price }, 'order.created');
    return serializeOrder(order);
  }

  async getUserOrders(userId: string, query: { page?: number; limit?: number; status?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status as OrderStatus } : {}),
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { driver: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: orders.map(serializeOrder),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderDetail(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        driver: { include: { user: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        items: true,
        rating: true,
      },
    });

    if (!order) throw new NotFoundError('Order not found');
    return {
      ...serializeOrder(order),
      items: order.items,
      statusHistory: order.statusHistory.map((entry) => ({
        id: entry.id,
        status: entry.status,
        note: entry.note,
        lat: entry.lat ? Number(entry.lat) : null,
        lng: entry.lng ? Number(entry.lng) : null,
        createdAt: entry.createdAt.toISOString(),
      })),
      rating: order.rating,
    };
  }

  async getOrderByTrackingCode(trackingCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { trackingCode },
      include: {
        driver: { include: { user: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        items: true,
        rating: true,
      },
    });

    if (!order) throw new NotFoundError('Order not found');
    return {
      ...serializeOrder(order),
      items: order.items,
      statusHistory: order.statusHistory.map((entry) => ({
        id: entry.id,
        status: entry.status,
        note: entry.note,
        lat: entry.lat ? Number(entry.lat) : null,
        lng: entry.lng ? Number(entry.lng) : null,
        createdAt: entry.createdAt.toISOString(),
      })),
      rating: order.rating,
    };
  }

  async cancelOrder(userId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundError('Order not found');
    const cancellableStatuses: OrderStatus[] = [OrderStatus.CREATED, OrderStatus.PENDING_MATCH, OrderStatus.MATCHED];
    if (!cancellableStatuses.includes(order.status)) {
      throw new ForbiddenError('This order can no longer be cancelled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED, cancelReason: cleanText(reason) ?? reason },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: OrderStatus.CANCELLED, note: cleanText(reason) ?? reason },
      });

      await this.walletService.refundOrderPayment(userId, order.id, Number(order.price), reason, tx);
      return cancelled;
    });

    await addNotificationJob(this.app, userId, 'ORDER_CANCELLED', { orderId, reason });
    if (order.driverId) {
      await clearActiveDriverTracking(this.app, order.driverId);
    }
    this.logger.info({ userId, orderId, reason, status: OrderStatus.CANCELLED }, 'order.cancelled');
    await this.emitStatusUpdate(order.id, OrderStatus.CANCELLED, userId, order.driverId ?? undefined);
    return serializeOrder(updated);
  }

  async disputeOrder(userId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundError('Order not found');

    const disputed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DISPUTED, disputeReason: cleanText(reason) ?? reason },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: OrderStatus.DISPUTED, note: cleanText(reason) ?? reason },
      });

      await tx.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Order disputed',
          body: reason,
          data: { orderId: order.id, reason },
        },
      });

      return updated;
    });

    await addNotificationJob(this.app, userId, 'ORDER_CANCELLED', { orderId, reason });
    if (order.driverId) {
      await clearActiveDriverTracking(this.app, order.driverId);
    }
    this.logger.info({ userId, orderId, reason, status: OrderStatus.DISPUTED }, 'order.disputed');
    await this.emitStatusUpdate(order.id, OrderStatus.DISPUTED, userId, order.driverId ?? undefined);
    return serializeOrder(disputed);
  }

  async confirmDelivery(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== OrderStatus.DELIVERED) throw new ValidationError('Order must be delivered before confirmation');

    const completed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: OrderStatus.COMPLETED, note: 'User confirmed delivery' },
      });

      if (order.driverId) {
        await this.walletService.creditDriverEarning(order.driverId, order.id, Number(order.price), tx);
      }

      return updated;
    });

    if (order.driverId) {
      await clearActiveDriverTracking(this.app, order.driverId);
    }

    await addNotificationJob(this.app, userId, 'ORDER_COMPLETED', { orderId: order.id });
    this.logger.info({ userId, orderId: order.id, driverId: order.driverId ?? null, status: OrderStatus.COMPLETED }, 'order.completed');
    await this.emitStatusUpdate(order.id, OrderStatus.COMPLETED, userId, order.driverId ?? undefined);
    return serializeOrder(completed);
  }

  async getAvailableOrders(driverId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundError('Driver not found');
    if (driver.status !== 'ACTIVE' || !driver.isOnline) throw new ForbiddenError('Driver must be active and online');

    if (driver.currentLat == null || driver.currentLng == null) return [];

    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING_MATCH, driverId: null },
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return orders
      .map((order) => ({
        order,
        distanceKm: haversineDistanceKm(
          Number(driver.currentLat),
          Number(driver.currentLng),
          Number(order.pickupLat),
          Number(order.pickupLng),
        ),
      }))
      // .filter((item) => item.distanceKm <= 20) // Removed for testing so drivers can see all orders
      .map((item) => serializeOrder(item.order));
  }

  async acceptOrder(driverId: string, orderId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundError('Driver not found');
    if (driver.status !== 'ACTIVE' || !driver.isOnline) throw new ForbiddenError('Driver must be active and online');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== OrderStatus.MATCHED && order.status !== OrderStatus.PENDING_MATCH) {
      throw new ValidationError('Order is not available for acceptance');
    }

    const offerDriverId = await this.app.redis.get(`order:offer:${orderId}`);
    if (offerDriverId && offerDriverId !== driverId) {
      throw new ForbiddenError('This order has not been offered to this driver');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { driverId, status: OrderStatus.ACCEPTED },
      include: { driver: { include: { user: true } } },
    });

    await this.prisma.orderStatusHistory.create({
      data: { orderId, status: OrderStatus.ACCEPTED, note: 'Driver accepted order' },
    });

    await this.prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'ORDER_UPDATE',
        title: 'Driver accepted your order',
        body: 'Your order is now on the way',
        data: { orderId, driverId },
      },
    });

    await this.app.redis.set(`order:accepted:${orderId}`, driverId, 'EX', 120);
    await this.app.redis.del(`order:offer:${orderId}`);
    await setActiveDriverTracking(this.app, driverId, { userId: order.userId, orderId });
    await addNotificationJob(this.app, order.userId, 'ORDER_ACCEPTED', {
      orderId,
      driverName: updated.driver?.user.fullName ?? 'your driver',
    });
    this.logger.info({ orderId, userId: order.userId, driverId, status: OrderStatus.ACCEPTED }, 'order.accepted');
    await this.emitStatusUpdate(orderId, OrderStatus.ACCEPTED, order.userId, driverId);

    return { accepted: true, order: serializeOrder(updated) };
  }

  async updateOrderStatus(driverId: string, orderId: string, status: 'IN_TRANSIT' | 'DELIVERED', lat?: number, lng?: number) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, driverId } });
    if (!order) throw new NotFoundError('Order not found');

    const allowed =
      (order.status === OrderStatus.ACCEPTED && status === 'IN_TRANSIT') ||
      (order.status === OrderStatus.IN_TRANSIT && status === 'DELIVERED');
    if (!allowed) throw new ValidationError('Invalid order status transition');

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          pickedUpAt: status === 'IN_TRANSIT' ? new Date() : order.pickedUpAt,
          deliveredAt: status === 'DELIVERED' ? new Date() : order.deliveredAt,
        },
        include: { driver: { include: { user: true } } },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status,
          note: status === 'IN_TRANSIT' ? 'Driver picked up the package' : 'Driver delivered the package',
          lat,
          lng,
        },
      });

      await tx.notification.create({
        data: {
          userId: order.userId,
          type: 'ORDER_UPDATE',
          title: 'Order update',
          body: status === 'IN_TRANSIT' ? 'Your package is on the road' : 'Your package has been delivered',
          data: { orderId, status, lat, lng },
        },
      });

      if (status === 'DELIVERED') {
        const payoutAmount = Number(order.price) * 0.8; // 80% payout
        await this.walletService.creditDriverEarning(driverId, orderId, payoutAmount, tx);
      }

      return next;
    });

    if (status === 'DELIVERED') {
      await clearActiveDriverTracking(this.app, driverId);
    }

    await addNotificationJob(this.app, order.userId, status === 'IN_TRANSIT' ? 'ORDER_PICKED_UP' : 'ORDER_DELIVERED', {
      orderId,
      driverName: updated.driver?.user.fullName ?? 'your driver',
    });

    await this.emitStatusUpdate(orderId, status, order.userId, driverId);
    this.logger.info({ orderId, userId: order.userId, driverId, status }, 'order.status.updated');
    return serializeOrder(updated);
  }

  private async emitStatusUpdate(orderId: string, status: string, userId?: string, driverId?: string) {
    this.logger.info({ orderId, status, userId, driverId }, 'order.status.update');
    broadcastOrderStatusUpdate(this.app as RealtimeApp, { orderId, status, userId, driverId, message: null });
  }
  async rateOrder(userId: string, orderId: string, userRating: number, userComment?: string) {
    assertRating(userRating);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { driver: { include: { user: true } }, rating: true },
    });

    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== OrderStatus.COMPLETED) {
      throw new ValidationError('Order must be completed before rating');
    }
    const assignedDriverId = order.driverId;
    if (!assignedDriverId) throw new ValidationError('Order does not have a driver assigned');

    const nextRating = await this.prisma.$transaction(async (tx) => {
      const rating = await tx.orderRating.upsert({
        where: { orderId },
        update: {
          userId,
          driverId: assignedDriverId,
          userRating,
          userComment: userComment ?? undefined,
        },
        create: {
          orderId,
          userId,
          driverId: assignedDriverId,
          userRating,
          userComment: userComment ?? undefined,
        },
      });

      const aggregate = await tx.orderRating.aggregate({
        where: { driverId: assignedDriverId },
        _avg: { userRating: true },
        _count: { userRating: true },
      });

      await tx.driver.update({
        where: { id: assignedDriverId },
        data: { rating: Number(aggregate._avg?.userRating ?? 5) },
      });

      return { rating, aggregate };
    });

    const refreshed = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { driver: { include: { user: true } }, rating: true },
    });

    if (!refreshed || !refreshed.rating || !refreshed.driverId) {
      throw new NotFoundError('Order not found');
    }

    return {
      order: serializeOrder(refreshed),
      rating: {
        id: refreshed.rating.id,
        orderId: refreshed.rating.orderId,
        userRating: refreshed.rating.userRating,
        userComment: refreshed.rating.userComment,
        driverRating: refreshed.rating.driverRating,
        driverComment: refreshed.rating.driverComment,
        createdAt: refreshed.rating.createdAt.toISOString(),
      },
      driverAverageRating: Number(nextRating.aggregate._avg?.userRating ?? 5),
      driverRatingCount: Number(nextRating.aggregate._count?.userRating ?? 0),
    };
  }

  async driverRateOrder(driverId: string, orderId: string, driverRating: number, driverComment?: string) {
    assertRating(driverRating);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
      include: { rating: true },
    });

    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
      throw new ValidationError('Order must be delivered before driver rating');
    }
    if (!order.rating) {
      throw new ValidationError('Customer rating must be submitted before driver feedback');
    }

    const rating = await this.prisma.orderRating.upsert({
      where: { orderId },
      update: {
        driverRating,
        driverComment: driverComment ?? undefined,
      },
      create: {
        orderId,
        userId: order.userId,
        driverId,
        userRating: order.rating.userRating,
        userComment: order.rating.userComment ?? undefined,
        driverRating,
        driverComment: driverComment ?? undefined,
      },
    });

    return {
      orderId,
      rating: {
        id: rating.id,
        orderId: rating.orderId,
        userRating: rating.userRating,
        userComment: rating.userComment,
        driverRating: rating.driverRating,
        driverComment: rating.driverComment,
        createdAt: rating.createdAt.toISOString(),
      },
    };
  }

  async getDriverOrdersHistory(driverId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.OrderWhereInput = {
      driverId,
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { driver: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: orders.map(serializeOrder),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
