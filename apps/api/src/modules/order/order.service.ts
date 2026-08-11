import crypto from 'node:crypto';

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { DeliveryType, OrderStatus, PaymentStatus, Prisma, VehicleType, type OrderSize, type PrismaClient } from '@prisma/client';

import { getDistanceAndDuration, geocodeAddress, getDirectionsRoute, reverseGeocode, autocompletePlaces, getPlaceDetails } from '../../lib/googleMaps.js';
import { composeDeliveryAddress, composePickupAddress, resolveHubRouteContext, type HubType } from '../../lib/hubs.js';
import { getCachedJson, setCachedJson } from '../../lib/cache.js';
import { addNotificationJob } from '../../queues/index.js';
import { broadcastOrderStatusUpdate, clearActiveDriverTracking, setActiveDriverTracking, broadcastDriverLocation, type RealtimeApp } from '../../lib/realtime.js';
import { getPriceQuote } from '../../lib/pricing.js';
import { addOrderMatchingJob } from '../../queues/index.js';
import { haversineDistanceKm } from '../../utils/helpers.js';
import { cleanText } from '../../utils/sanitize.js';
import { uploadImageBuffer } from '../../lib/cloudinary.js';
import { AppError, ForbiddenError, NotFoundError, PaymentError, ValidationError } from '../../utils/errors.js';
import type { WalletService } from '../wallet/wallet.service.js';
import { ReferralService } from '../referral/referral.service.js';
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
  cancelReason?: string | null;
  deliveryType?: 'INTERSTATE' | 'INTRASTATE';
  notes?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  courierLat?: Prisma.Decimal | number | null;
  courierLng?: Prisma.Decimal | number | null;
  pickupLat?: Prisma.Decimal | number | null;
  pickupLng?: Prisma.Decimal | number | null;
  deliveryLat?: Prisma.Decimal | number | null;
  deliveryLng?: Prisma.Decimal | number | null;
  etaMinutes?: number | null;
  driver?: {
    id: string;
    userId: string;
    user: { fullName: string; phone: string };
    rating: Prisma.Decimal | number;
    vehicleType: string;
    vehicleModel: string;
    vehiclePlate: string;
    isOnline: boolean;
  } | null;
  user?: {
    id: string;
    fullName: string;
    phone: string;
    avatarUrl?: string | null;
  } | null;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    weightKg: Prisma.Decimal | number;
    fragile?: boolean;
    imageUrl?: string | null;
  }> | null;
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
    deliveryType: order.deliveryType ?? 'INTERSTATE',
    courierLat: order.courierLat ? asNumber(order.courierLat) : null,
    courierLng: order.courierLng ? asNumber(order.courierLng) : null,
    etaMinutes: order.etaMinutes ?? null,
    pickupLat: asNumber(order.pickupLat),
    pickupLng: asNumber(order.pickupLng),
    deliveryLat: asNumber(order.deliveryLat),
    deliveryLng: asNumber(order.deliveryLng),
    pickupFormattedAddress: order.pickupFormattedAddress,
    deliveryFormattedAddress: order.deliveryFormattedAddress,
    distanceKm: asNumber(order.distanceKm),
    estimatedDurationMin: order.estimatedDurationMin,
    createdAt: order.createdAt.toISOString(),
    cancelReason: order.cancelReason ?? null,
    notes: order.notes ?? null,
    recipientName: order.recipientName ?? null,
    recipientPhone: order.recipientPhone ?? null,
    items: order.items
      ? order.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        weightKg: asNumber(i.weightKg),
        fragile: i.fragile ?? false,
        imageUrl: i.imageUrl ?? null,
      }))
      : [],
    driver: order.driver
      ? {
        id: order.driver.id,
        userId: order.driver.userId,
        fullName: order.driver.user.fullName,
        phone: order.driver.user.phone ?? null,
        rating: asNumber(order.driver.rating),
        vehicleType: order.driver.vehicleType,
        vehicleModel: order.driver.vehicleModel,
        vehiclePlate: order.driver.vehiclePlate,
        isOnline: order.driver.isOnline,
      }
      : null,
    customer: order.user
      ? {
        id: order.user.id,
        fullName: order.user.fullName,
        phone: order.user.phone,
        avatarUrl: order.user.avatarUrl ?? null,
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
  ) { }

  private async findLocalServiceArea(city: string, state: string) {
    let serviceArea = await this.prisma.localServiceArea.findFirst({
      where: {
        active: true,
        OR: [
          { city: { equals: city, mode: 'insensitive' } },
          { state: { equals: state, mode: 'insensitive' } },
          { city: { equals: state, mode: 'insensitive' } },
          { state: { equals: city, mode: 'insensitive' } },
          { city: { contains: city, mode: 'insensitive' } },
          { state: { contains: state, mode: 'insensitive' } },
        ],
      },
    });

    if (!serviceArea) {
      serviceArea = await this.prisma.localServiceArea.findFirst({
        where: { active: true },
      });
    }

    return serviceArea;
  }

  async getQuote(payload: {
    size: OrderSize;
    originHubId?: string | null;
    destinationHubId?: string | null;
    routeId?: string | null;
    pickupAddress?: string;
    deliveryAddress?: string;
    pickupLat?: number;
    pickupLng?: number;
    deliveryLat?: number;
    deliveryLng?: number;
  }): Promise<OrderQuote> {
    // Try DB-backed route first
    const dbRoute = (payload.originHubId && payload.destinationHubId)
      ? await this.prisma.route.findFirst({
        where: {
          originHubId: payload.originHubId,
          destinationHubId: payload.destinationHubId,
          isActive: true,
        },
        include: { originHub: true, destinationHub: true },
      })
      : null;

    let originHubObj = dbRoute?.originHub ?? null;
    let destHubObj = dbRoute?.destinationHub ?? null;

    if (!dbRoute && payload.originHubId && payload.destinationHubId) {
      const [oHub, dHub] = await Promise.all([
        this.prisma.hub.findUnique({ where: { id: payload.originHubId } }),
        this.prisma.hub.findUnique({ where: { id: payload.destinationHubId } }),
      ]);
      if (oHub && dHub) {
        originHubObj = oHub;
        destHubObj = dHub;
      }
    }

    const staticRouteContext = !dbRoute && !originHubObj ? resolveHubRouteContext(payload.originHubId, payload.destinationHubId, payload.routeId) : null;

    if (dbRoute || originHubObj || staticRouteContext) {
      const onlineDriversCacheKey = 'cache:drivers:online:active';
      const cachedDrivers = await getCachedJson<number>(this.app.redis, onlineDriversCacheKey);
      const onlineDrivers =
        cachedDrivers ??
        (await this.prisma.driver.count({ where: { isOnline: true, status: 'ACTIVE' } }));
      if (cachedDrivers == null) {
        await setCachedJson(this.app.redis, onlineDriversCacheKey, onlineDrivers, 30);
      }

      const oLat = originHubObj ? Number(originHubObj.lat) : Number(staticRouteContext!.originHub.lat);
      const oLng = originHubObj ? Number(originHubObj.lng) : Number(staticRouteContext!.originHub.lng);
      const dLat = destHubObj ? Number(destHubObj.lat) : Number(staticRouteContext!.destinationHub.lat);
      const dLng = destHubObj ? Number(destHubObj.lng) : Number(staticRouteContext!.destinationHub.lng);

      const distanceKm = staticRouteContext?.distanceKm ?? haversineDistanceKm(oLat, oLng, dLat, dLng);
      const estimatedDays = dbRoute?.estimatedDays ?? staticRouteContext?.route.estimatedDays ?? Math.max(1, Math.ceil(distanceKm / 400));
      const durationMin = staticRouteContext?.durationMin ?? Math.max(estimatedDays * 12 * 60, 60);

      const routeId = dbRoute?.id ?? staticRouteContext?.route.id ?? `${payload.originHubId}_${payload.destinationHubId}`;
      const quoteKey = `cache:quote:${payload.size}:hub:${routeId}:${distanceKm.toFixed(1)}:${Math.round(durationMin)}:${onlineDrivers}`;
      const cached = await getCachedJson<OrderQuote>(this.app.redis, quoteKey);
      if (cached) return cached;

      const baseFareNum = dbRoute ? Number(dbRoute.baseFare) : Math.round(Math.max(1500, distanceKm * 15));
      const routeCtxForPricing = {
        baseFare: baseFareNum,
        originModifier: originHubObj ? Number(originHubObj.basePricingModifier ?? 0) : 0,
        destModifier: destHubObj ? Number(destHubObj.basePricingModifier ?? 0) : 0,
      };
      const quote = getPriceQuote(payload.size, distanceKm, durationMin, onlineDrivers, 'INTERSTATE', null, routeCtxForPricing);
      quote.deliveryType = 'INTERSTATE';
      await setCachedJson(this.app.redis, quoteKey, quote, 300);
      return quote;
    }

    if (!payload.pickupAddress || !payload.deliveryAddress) {
      throw new ValidationError('Pickup and delivery addresses are required');
    }

    const pickup = (payload.pickupLat !== undefined && payload.pickupLng !== undefined && !isNaN(payload.pickupLat) && !isNaN(payload.pickupLng))
      ? {
        street: payload.pickupAddress,
        city: 'City',
        state: 'State',
        country: 'Nigeria',
        lat: payload.pickupLat,
        lng: payload.pickupLng,
        formattedAddress: payload.pickupAddress,
        placeId: 'pickup-coord',
      }
      : await geocodeAddress(cleanText(payload.pickupAddress) ?? payload.pickupAddress);

    const delivery = (payload.deliveryLat !== undefined && payload.deliveryLng !== undefined && !isNaN(payload.deliveryLat) && !isNaN(payload.deliveryLng))
      ? {
        street: payload.deliveryAddress,
        city: 'City',
        state: 'State',
        country: 'Nigeria',
        lat: payload.deliveryLat,
        lng: payload.deliveryLng,
        formattedAddress: payload.deliveryAddress,
        placeId: 'delivery-coord',
      }
      : await geocodeAddress(cleanText(payload.deliveryAddress) ?? payload.deliveryAddress);
    const route = await getDistanceAndDuration(pickup.lat, pickup.lng, delivery.lat, delivery.lng);
    const onlineDriversCacheKey = 'cache:drivers:online:active';
    const cachedDrivers = await getCachedJson<number>(this.app.redis, onlineDriversCacheKey);
    const onlineDrivers =
      cachedDrivers ??
      (await this.prisma.driver.count({ where: { isOnline: true, status: 'ACTIVE' } }));
    if (cachedDrivers == null) {
      await setCachedJson(this.app.redis, onlineDriversCacheKey, onlineDrivers, 30);
    }

    const sameState = pickup.state.toLowerCase() === delivery.state.toLowerCase();
    const isIntrastate = sameState && route.distanceKm <= 200;

    let serviceArea = null;
    if (isIntrastate) {
      serviceArea = await this.findLocalServiceArea(pickup.city, pickup.state);
    }

    const quoteKey = `cache:quote:${payload.size}:${route.distanceKm.toFixed(1)}:${Math.round(route.durationMin)}:${onlineDrivers}:${isIntrastate ? 'INTRASTATE' : 'INTERSTATE'}`;
    const cached = await getCachedJson<OrderQuote>(this.app.redis, quoteKey);
    if (cached) return cached;

    const quote = getPriceQuote(
      payload.size,
      route.distanceKm,
      route.durationMin,
      onlineDrivers,
      isIntrastate ? 'INTRASTATE' : 'INTERSTATE',
      serviceArea,
    );
    quote.deliveryType = isIntrastate ? 'INTRASTATE' : 'INTERSTATE';

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
    recipientName?: string | null;
    recipientPhone?: string | null;
    items: Array<{ description: string; quantity: number; weightKg: number; fragile?: boolean; imageUrl?: string | null }>;
    notes?: string | null;
    fragile?: boolean;
  }) {
    // Prefer DB-backed route over seed-based static hubs
    const dbRouteContext = (data.originHubId && data.destinationHubId)
      ? await this.prisma.route.findFirst({
        where: { originHubId: data.originHubId, destinationHubId: data.destinationHubId, isActive: true },
        include: { originHub: true, destinationHub: true },
      })
      : null;

    let originHubObj = dbRouteContext?.originHub ?? null;
    let destHubObj = dbRouteContext?.destinationHub ?? null;

    if (!dbRouteContext && data.originHubId && data.destinationHubId) {
      const [oHub, dHub] = await Promise.all([
        this.prisma.hub.findUnique({ where: { id: data.originHubId } }),
        this.prisma.hub.findUnique({ where: { id: data.destinationHubId } }),
      ]);
      if (oHub && dHub) {
        originHubObj = oHub;
        destHubObj = dHub;
      }
    }

    const routeContext = !dbRouteContext && !originHubObj ? resolveHubRouteContext(data.originHubId, data.destinationHubId, data.routeId) : null;

    const effectiveRouteContext = originHubObj && destHubObj
      ? {
        originHub: {
          ...originHubObj,
          lat: Number(originHubObj.lat),
          lng: Number(originHubObj.lng),
          createdAt: originHubObj.createdAt instanceof Date ? originHubObj.createdAt.toISOString() : String(originHubObj.createdAt),
          type: originHubObj.type as HubType,
          contactPhone: originHubObj.contactPhone ?? undefined,
        },
        destinationHub: {
          ...destHubObj,
          lat: Number(destHubObj.lat),
          lng: Number(destHubObj.lng),
          createdAt: destHubObj.createdAt instanceof Date ? destHubObj.createdAt.toISOString() : String(destHubObj.createdAt),
          type: destHubObj.type as HubType,
          contactPhone: destHubObj.contactPhone ?? undefined,
        },
        route: dbRouteContext,
        distanceKm: haversineDistanceKm(Number(originHubObj.lat), Number(originHubObj.lng), Number(destHubObj.lat), Number(destHubObj.lng)),
        durationMin: Math.max((dbRouteContext?.estimatedDays ?? Math.max(1, Math.ceil(haversineDistanceKm(Number(originHubObj.lat), Number(originHubObj.lng), Number(destHubObj.lat), Number(destHubObj.lng)) / 400))) * 12 * 60, 60),
      }
      : routeContext;
    const pickupContactName = cleanText(data.contactName);
    const pickupContactPhone = cleanText(data.contactPhone);
    const pickupNote = cleanText(data.pickupNote);
    const recipientName = cleanText(data.recipientName);
    const recipientPhone = cleanText(data.recipientPhone);
    if (!recipientName || !recipientPhone) {
      throw new ValidationError('Recipient name and recipient phone number are required');
    }
    const notesParts = [
      cleanText(data.notes),
      pickupNote ? `Pickup note: ${pickupNote}` : null,
      pickupContactName
        ? `Pickup contact: ${pickupContactName}${pickupContactPhone ? ` (${pickupContactPhone})` : ''}`
        : null,
      recipientName
        ? `Recipient contact: ${recipientName}${recipientPhone ? ` (${recipientPhone})` : ''}`
        : null,
    ].filter((part): part is string => Boolean(part && part.trim()));

    const orderNotes = notesParts.length ? notesParts.join('\n') : null;

    const pickup = effectiveRouteContext
      ? {
        street: cleanText(data.localPickupAddress) ?? effectiveRouteContext.originHub.address,
        city: effectiveRouteContext.originHub.city,
        state: effectiveRouteContext.originHub.state,
        country: 'Nigeria',
        lat: Number(effectiveRouteContext.originHub.lat),
        lng: Number(effectiveRouteContext.originHub.lng),
        placeId: effectiveRouteContext.originHub.id,
        formattedAddress: composePickupAddress(effectiveRouteContext.originHub, cleanText(data.localPickupAddress) ?? ''),
      }
      : await geocodeAddress(data.pickupAddress ?? '');

    const delivery = effectiveRouteContext
      ? {
        street: effectiveRouteContext.destinationHub.address,
        city: effectiveRouteContext.destinationHub.city,
        state: effectiveRouteContext.destinationHub.state,
        country: 'Nigeria',
        lat: Number(effectiveRouteContext.destinationHub.lat),
        lng: Number(effectiveRouteContext.destinationHub.lng),
        placeId: effectiveRouteContext.destinationHub.id,
        formattedAddress: composeDeliveryAddress(effectiveRouteContext.destinationHub),
      }
      : await geocodeAddress(data.deliveryAddress ?? '');

    if (!effectiveRouteContext && (!data.pickupAddress || !data.deliveryAddress)) {
      throw new ValidationError('Pickup and delivery addresses are required');
    }

    const route = effectiveRouteContext
      ? { distanceKm: effectiveRouteContext.distanceKm, durationMin: effectiveRouteContext.durationMin }
      : await getDistanceAndDuration(pickup.lat, pickup.lng, delivery.lat, delivery.lng);

    const sameState = pickup.state.toLowerCase() === delivery.state.toLowerCase();
    const isIntrastate = !effectiveRouteContext && sameState && route.distanceKm <= 200;

    let serviceArea = null;
    if (isIntrastate) {
      serviceArea = await this.findLocalServiceArea(pickup.city, pickup.state);
    }

    const onlineDrivers = await this.prisma.driver.count({ where: { isOnline: true, status: 'ACTIVE' } });
    const routePricingCtx = dbRouteContext
      ? { baseFare: Number(dbRouteContext.baseFare), originModifier: Number(dbRouteContext.originHub.basePricingModifier), destModifier: Number(dbRouteContext.destinationHub.basePricingModifier) }
      : null;
    const quote = getPriceQuote(
      data.size,
      route.distanceKm,
      route.durationMin,
      onlineDrivers,
      isIntrastate ? 'INTRASTATE' : 'INTERSTATE',
      serviceArea,
      routePricingCtx,
    );

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
          deliveryType: isIntrastate ? 'INTRASTATE' : 'INTERSTATE',
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
          recipientName: recipientName ?? null,
          recipientPhone: recipientPhone ?? null,
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

      const fetched = await tx.order.findUnique({
        where: { id: created.id },
        include: { driver: { include: { user: true } }, items: true },
      });
      return fetched ?? { ...updated, items: [] };
    });

    if (!order) throw new AppError('Failed to create order', 500, 'ORDER_CREATE_FAILED');

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
        include: { driver: { include: { user: true } }, items: true },
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

  async getOrderDetail(userId: string, orderId: string, driverId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId },
          ...(driverId ? [{ driverId }] : []),
          { driver: { userId } },
        ],
      },
      include: {
        driver: { include: { user: true } },
        user: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
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
    const cleanCode = trackingCode.trim();

    // Only query by UUID id if the code looks like a valid UUID — avoids Prisma P2023 crash
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { trackingCode: cleanCode },
          { trackingCode: cleanCode.toUpperCase() },
          ...(isUuid ? [{ id: cleanCode }] : []),
        ],
      },
      include: {
        user: true,
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
      const assignedDriver = await this.prisma.driver.findUnique({
        where: { id: order.driverId },
        select: { userId: true },
      });
      if (assignedDriver?.userId) {
        await addNotificationJob(this.app, assignedDriver.userId, 'ORDER_CANCELLED', { orderId, reason });
      }
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
    // Idempotency: already confirmed → return without re-running the transaction
    if (order.status === OrderStatus.COMPLETED) return serializeOrder(order);
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
        const payoutAmount = Number(order.price) * 0.8; // 80% payout
        await this.walletService.creditDriverEarning(order.driverId, order.id, payoutAmount, tx);
      }

      return updated;
    });

    if (order.driverId) {
      await clearActiveDriverTracking(this.app, order.driverId);
      const assignedDriver = await this.prisma.driver.findUnique({
        where: { id: order.driverId },
        select: { userId: true },
      });
      if (assignedDriver?.userId) {
        const payoutAmount = Number(order.price) * 0.8;
        await addNotificationJob(this.app, assignedDriver.userId, 'PAYMENT_RECEIVED', {
          amount: payoutAmount,
          orderId: order.id,
          kind: 'order_earning',
        });
      }
    }

    await addNotificationJob(this.app, userId, 'ORDER_COMPLETED', { orderId: order.id });
    this.logger.info({ userId, orderId: order.id, driverId: order.driverId ?? null, status: OrderStatus.COMPLETED }, 'order.completed');
    await this.emitStatusUpdate(order.id, OrderStatus.COMPLETED, userId, order.driverId ?? undefined);

    // Referral qualification: check if this is the user's first completed order
    const completedCount = await this.prisma.order.count({ where: { userId, status: OrderStatus.COMPLETED } });
    if (completedCount === 1) {
      try {
        const referralService = new ReferralService(this.prisma, this.logger, this.app);
        await referralService.qualifyReferral(userId);
      } catch (err) {
        this.logger.warn({ err, userId }, 'referral.qualify.failed');
      }
    }

    return serializeOrder(completed);
  }

  async getDriverActiveOrders(driverId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        driverId,
        status: { in: [OrderStatus.ACCEPTED, OrderStatus.IN_TRANSIT] },
      },
      include: { driver: { include: { user: true } }, user: true },
      orderBy: { updatedAt: 'desc' },
    });

    return orders.map(serializeOrder);
  }

  async getAvailableOrders(driverId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundError('Driver not found');
    if (driver.status !== 'ACTIVE' || !driver.isOnline) throw new ForbiddenError('Driver must be active and online');

    if (driver.currentLat == null || driver.currentLng == null) return [];

    const offerKeys = await this.app.redis.keys('order:offer:*');
    const offerDriverIds = offerKeys.length ? await this.app.redis.mget(...offerKeys) : [];
    const offeredOrderIds = offerKeys
      .map((key, index) => (offerDriverIds[index] === driverId ? key.replace('order:offer:', '') : null))
      .filter((id): id is string => Boolean(id));

    const isCarDriver = driver.vehicleType === VehicleType.CAR;
    const allowedDeliveryTypes: DeliveryType[] = isCarDriver ? [DeliveryType.INTERSTATE] : [DeliveryType.INTRASTATE];

    const orders = await this.prisma.order.findMany({
      where: {
        driverId: null,
        deliveryType: { in: allowedDeliveryTypes },
        OR: [
          { status: OrderStatus.PENDING_MATCH },
          ...(offeredOrderIds.length ? [{ id: { in: offeredOrderIds }, status: OrderStatus.MATCHED }] : []),
        ],
      },
      include: { driver: { include: { user: true } }, user: true },
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
      include: { driver: { include: { user: true } }, user: true },
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

  async declineOrder(driverId: string, orderId: string, reason = 'Driver declined order') {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundError('Driver not found');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== OrderStatus.MATCHED && order.status !== OrderStatus.PENDING_MATCH) {
      throw new ValidationError('Order is not available for decline');
    }

    const offerDriverId = await this.app.redis.get(`order:offer:${orderId}`);
    if (offerDriverId && offerDriverId !== driverId) {
      throw new ForbiddenError('This order has not been offered to this driver');
    }

    await this.app.redis.del(`order:offer:${orderId}`);
    await this.prisma.orderStatusHistory.create({
      data: { orderId, status: order.status, note: reason },
    });
    this.logger.info({ orderId, driverId }, 'order.declined');

    return { declined: true, orderId };
  }

  async updateOrderStatus(driverId: string, orderId: string, status: 'IN_TRANSIT' | 'DELIVERED', lat?: number, lng?: number) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, driverId } });
    if (!order) throw new NotFoundError('Order not found');

    if (order.status === status) {
      return serializeOrder(order);
    }

    const allowed =
      (order.status === OrderStatus.ACCEPTED && status === 'IN_TRANSIT') ||
      (order.status === OrderStatus.IN_TRANSIT && status === 'DELIVERED');
    if (!allowed) {
      throw new ValidationError(`Cannot update order status to ${status} from current status ${order.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          pickedUpAt: status === 'IN_TRANSIT' ? new Date() : order.pickedUpAt,
          deliveredAt: status === 'DELIVERED' ? new Date() : order.deliveredAt,
        },
        include: { driver: { include: { user: true } }, user: true },
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

  async getOrderTracking(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        driver: {
          include: {
            user: {
              select: { fullName: true, phone: true, avatarUrl: true },
            },
          },
        },
        items: true,
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    const trackableStatuses: OrderStatus[] = [OrderStatus.ACCEPTED, OrderStatus.IN_TRANSIT, OrderStatus.MATCHED];
    if (!trackableStatuses.includes(order.status)) {
      throw new ValidationError('Order is not currently trackable');
    }

    if (!order.driver) throw new NotFoundError('No driver assigned to this order');

    // Read the driver's most recent location from the database
    const driver = await this.prisma.driver.findUnique({
      where: { id: order.driverId! },
      select: { currentLat: true, currentLng: true, lastLocationAt: true },
    });

    const driverLat = driver?.currentLat != null ? Number(driver.currentLat) : null;
    const driverLng = driver?.currentLng != null ? Number(driver.currentLng) : null;

    const pickupLat = Number(order.pickupLat);
    const pickupLng = Number(order.pickupLng);
    const destLat = Number(order.deliveryLat);
    const destLng = Number(order.deliveryLng);

    // Full road route from pickup to destination for visual polyline
    const fullDirectionsResult = await getDirectionsRoute(pickupLat, pickupLng, destLat, destLng);

    // Remaining segment from driver's current position to destination for live ETA
    const remainingResult = (driverLat != null && driverLng != null)
      ? await getDirectionsRoute(driverLat, driverLng, destLat, destLng)
      : fullDirectionsResult;

    const routeCoordinates = fullDirectionsResult.route;
    const estimatedMinutes = remainingResult.durationMin || order.estimatedDurationMin || 30;
    const estimatedDelivery = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();

    return {
      status: order.status,
      driver: {
        id: order.driver.id,
        name: order.driver.user.fullName,
        avatar_url: order.driver.user.avatarUrl ?? null,
        phone: order.driver.user.phone ?? '',
      },
      current_location: driverLat != null && driverLng != null
        ? { latitude: driverLat, longitude: driverLng }
        : null,
      origin_location: { latitude: pickupLat, longitude: pickupLng },
      destination_location: { latitude: destLat, longitude: destLng },
      route_coordinates: routeCoordinates,
      origin_hub: order.pickupFormattedAddress,
      destination_hub: order.deliveryFormattedAddress,
      departed_at: order.pickedUpAt?.toISOString() ?? order.createdAt.toISOString(),
      distance_km: fullDirectionsResult.distanceKm || Number(order.distanceKm),
      estimated_duration_min: estimatedMinutes,
      weight_kg: await this.prisma.orderItem
        .aggregate({ where: { orderId }, _sum: { weightKg: true } })
        .then((r) => Number(r._sum.weightKg ?? 0)),
      estimated_delivery: estimatedDelivery,
      items: order.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        imageUrl: i.imageUrl ?? null,
      })),
    };
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
        include: { driver: { include: { user: true } }, user: true },
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

  async getServiceAreas() {
    return this.prisma.localServiceArea.findMany({
      where: { active: true },
      orderBy: { city: 'asc' },
    });
  }

  async updateCourierLocation(
    driverId: string,
    orderId: string,
    payload: { lat: number; lng: number; heading?: number; speed?: number },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status !== OrderStatus.IN_TRANSIT) {
      throw new ValidationError('Courier location can only be updated while in transit');
    }

    const distToDest = haversineDistanceKm(
      payload.lat,
      payload.lng,
      Number(order.deliveryLat),
      Number(order.deliveryLng),
    );
    const etaMinutes = Math.max(1, Math.round(distToDest * 2 + 3));

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        courierLat: payload.lat,
        courierLng: payload.lng,
        etaMinutes,
      },
    });

    broadcastDriverLocation(this.app as RealtimeApp, {
      driverId,
      orderId,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      speed: payload.speed,
      userId: order.userId,
    });

    return {
      lat: Number(updated.courierLat),
      lng: Number(updated.courierLng),
      etaMinutes: updated.etaMinutes,
    };
  }

  async getCourierLocation(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        courierLat: true,
        courierLng: true,
        etaMinutes: true,
        status: true,
      },
    });
    if (!order) throw new NotFoundError('Order not found');
    return {
      lat: order.courierLat ? Number(order.courierLat) : null,
      lng: order.courierLng ? Number(order.courierLng) : null,
      etaMinutes: order.etaMinutes,
      status: order.status,
    };
  }

  async getActiveHubs() {
    const hubs = await this.prisma.hub.findMany({
      where: { isActive: true },
      orderBy: { state: 'asc' },
    });
    return hubs.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      state: h.state,
      address: h.address,
      lat: Number(h.lat),
      lng: Number(h.lng),
      type: h.type as 'office' | 'agent' | 'partner_park',
      contactPhone: h.contactPhone ?? undefined,
      isActive: h.isActive,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  async reverseGeocode(lat: number, lng: number) {
    return reverseGeocode(lat, lng);
  }

  async autocomplete(input: string, lat?: number, lng?: number) {
    return autocompletePlaces(input, lat, lng);
  }

  async getPlaceDetails(placeId: string) {
    return getPlaceDetails(placeId);
  }

  async getOrderMessages(orderId: string, actorId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const order = await this.prisma.order.findFirst({
      where: isUuid ? { OR: [{ id: orderId }, { trackingCode: orderId }] } : { trackingCode: orderId },
      select: { id: true, userId: true, driverId: true, driver: { select: { id: true, userId: true } } },
    });
    if (!order) throw new NotFoundError('Order not found');

    const cleanActor = String(actorId ?? '').trim().toLowerCase();
    const isCustomer = Boolean(order.userId && String(order.userId).trim().toLowerCase() === cleanActor);
    const isDriver = Boolean(
      (order.driver?.userId && String(order.driver.userId).trim().toLowerCase() === cleanActor) ||
      (order.driver?.id && String(order.driver.id).trim().toLowerCase() === cleanActor) ||
      (order.driverId && String(order.driverId).trim().toLowerCase() === cleanActor)
    );
    if (!isCustomer && !isDriver) {
      throw new ForbiddenError('You are not authorized to view messages for this order');
    }

    const messages = await this.prisma.orderChatMessage.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return messages.map((m) => ({
      id: m.id,
      orderId: m.orderId,
      senderId: m.senderId,
      senderType: m.senderType,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async sendOrderMessage(orderId: string, actorId: string, text: string) {
    const cleanMsg = (cleanText(text ?? '') ?? '').trim();
    if (!cleanMsg) throw new ValidationError('Message text cannot be empty');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const order = await this.prisma.order.findFirst({
      where: isUuid ? { OR: [{ id: orderId }, { trackingCode: orderId }] } : { trackingCode: orderId },
      select: {
        id: true,
        userId: true,
        driverId: true,
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        driver: { select: { id: true, userId: true, user: { select: { id: true, fullName: true, avatarUrl: true } } } },
      },
    });
    if (!order) throw new NotFoundError('Order not found');

    const cleanActor = String(actorId ?? '').trim().toLowerCase();
    const isCustomer = Boolean(order.userId && String(order.userId).trim().toLowerCase() === cleanActor);
    const isDriver = Boolean(
      (order.driver?.userId && String(order.driver.userId).trim().toLowerCase() === cleanActor) ||
      (order.driver?.id && String(order.driver.id).trim().toLowerCase() === cleanActor) ||
      (order.driverId && String(order.driverId).trim().toLowerCase() === cleanActor)
    );
    if (!isCustomer && !isDriver) {
      throw new ForbiddenError('You are not authorized to chat on this order');
    }

    const senderType = isCustomer ? 'USER' : 'DRIVER';
    const senderName = isCustomer
      ? (order.user?.fullName ?? 'Customer')
      : (order.driver?.user?.fullName ?? 'Driver');
    const senderAvatarUrl = isCustomer
      ? (order.user?.avatarUrl ?? null)
      : (order.driver?.user?.avatarUrl ?? null);

    const msg = await this.prisma.orderChatMessage.create({
      data: {
        orderId: order.id,
        senderId: actorId,
        senderType,
        text: cleanMsg,
      },
    });

    const serializedMsg = {
      id: msg.id,
      orderId: msg.orderId,
      senderId: msg.senderId,
      senderType: msg.senderType,
      senderName,
      senderAvatarUrl,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
    };

    try {
      const realtimeApp = this.app as unknown as RealtimeApp;
      if (realtimeApp?.io) {
        realtimeApp.io.to(`order:${order.id}`).emit('chat_message', serializedMsg);
        try {
          realtimeApp.io.of('/user')?.to(`order:${order.id}`)?.emit('chat_message', serializedMsg);
        } catch { }
        try {
          realtimeApp.io.of('/driver')?.to(`order:${order.id}`)?.emit('chat_message', serializedMsg);
        } catch { }
      }
    } catch (err) {
      this.logger.warn({ err, orderId: order.id }, 'chat_message.broadcast_failed');
    }

    const targetUserId = isCustomer ? order.driver?.userId : order.userId;
    if (targetUserId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: targetUserId,
            title: senderName,
            body: cleanMsg,
            type: 'SYSTEM',
            data: { orderId: order.id, messageId: msg.id, senderType, senderName, senderAvatarUrl },
          },
        });
      } catch (err) {
        this.logger.warn({ err }, 'chat_db_notification_failed');
      }

      try {
        await addNotificationJob(this.app, targetUserId, 'CHAT_MESSAGE', {
          orderId: order.id,
          senderName,
          senderAvatarUrl,
          title: senderName,
          body: cleanMsg,
          data: { orderId: order.id, messageId: msg.id, senderType, senderName, senderAvatarUrl },
        });
      } catch (err) {
        this.logger.warn({ err }, 'chat_push_notification_failed');
      }
    }

    return serializedMsg;
  }

  async uploadPackageImage(userId: string, buffer: Buffer): Promise<{ imageUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundError('User not found');

    const uploaded = await uploadImageBuffer(buffer, {
      folder: `percel/users/${userId}/packages`,
      transformation: 'c_limit,q_auto,w_1200',
    });

    return { imageUrl: uploaded.secure_url };
  }

  async getDirectionsRoute(originLat: number, originLng: number, destLat: number, destLng: number) {
    return getDirectionsRoute(originLat, originLng, destLat, destLng);
  }
}
