import type { FastifyPluginAsync } from 'fastify';
import { DriverEarningStatus, NotificationType, Prisma, WalletTransactionCategory, WalletTransactionStatus } from '@prisma/client';

import { sendPushNotification } from '../../lib/notifications.js';
import { success } from '../../utils/response.js';

const currency = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', notation: 'compact', maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric' });

function money(value: Prisma.Decimal | number | string | null | undefined) {
  return currency.format(Number(value ?? 0));
}

function compactMoney(value: Prisma.Decimal | number | string | null | undefined) {
  return compactCurrency.format(Number(value ?? 0));
}

function when(value: Date | null | undefined) {
  return value ? dateTime.format(value) : 'Not available';
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'P';
}

function vehicle(driver: { vehicleType: string; vehiclePlate: string; vehicleModel: string }) {
  return `${driver.vehicleType} - ${driver.vehiclePlate} - ${driver.vehicleModel}`;
}

function mapOrder(order: any) {
  return {
    id: order.id,
    trackingCode: order.trackingCode,
    user: order.user?.fullName ?? 'Unknown user',
    userId: order.userId,
    userEmail: order.user?.email ?? '',
    userPhone: order.user?.phone ?? '',
    userAvatarUrl: order.user?.avatarUrl ?? null,
    driver: order.driver?.user?.fullName ?? 'Unassigned',
    driverId: order.driverId ?? '',
    driverEmail: order.driver?.user?.email ?? '',
    driverPhone: order.driver?.user?.phone ?? '',
    driverAvatarUrl: order.driver?.user?.avatarUrl ?? null,
    driverVehicle: order.driver ? vehicle(order.driver) : '',
    driverRating: order.driver ? Number(order.driver.rating ?? 0).toFixed(1) : '',
    status: order.status,
    price: money(order.price),
    date: when(order.createdAt),
    payment: order.paymentStatus,
    pickup: order.pickupFormattedAddress,
    dropoff: order.deliveryFormattedAddress,
    items: (order.items ?? []).map((item: any) => `${item.quantity}x ${item.description}`),
    timeline: (order.statusHistory ?? []).map((item: any) => ({ status: item.status, note: item.note ?? item.status, at: when(item.createdAt) })),
    riskLevel: order.status === 'DISPUTED' ? 'High' : 'Normal',
    customerNote: order.disputeReason ?? order.cancelReason ?? order.notes ?? 'No incidents logged.',
  };
}

function mapUser(user: any) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    joined: when(user.createdAt),
    orders: String(user._count?.orders ?? user.orders?.length ?? 0),
    wallet: money(user.wallet?.balance ?? 0),
    walletBalance: money(user.wallet?.balance ?? 0),
    city: user.address ?? 'Not set',
    avatarInitial: initials(user.fullName),
    avatarUrl: user.avatarUrl ?? null,
    supportNote: user.status === 'SUSPENDED' ? 'Account is paused pending review.' : 'Account is active.',
    recentOrders: (user.orders ?? []).map(mapOrder),
    walletTransactions: (user.wallet?.transactions ?? []).map(mapWalletTransaction),
    segments: ['Profile', 'Orders', 'Wallet'],
  };
}

function mapDriver(driver: any) {
  return {
    id: driver.id,
    name: driver.user?.fullName ?? 'Unknown driver',
    status: driver.status,
    kyc: driver.kyc?.status ?? 'PENDING',
    rating: Number(driver.rating ?? 0).toFixed(1),
    vehicle: vehicle(driver),
    email: driver.user?.email ?? 'Not available',
    phone: driver.user?.phone ?? 'Not available',
    avatarUrl: driver.user?.avatarUrl ?? null,
    kycReason: driver.kyc?.rejectionReason ?? undefined,
    assignedOrders: (driver.orders ?? []).map(mapOrder),
    reviews: (driver.ratings ?? []).map((rating: any) => ({
      id: rating.id,
      user: rating.user?.fullName ?? 'Customer',
      rating: String(rating.userRating),
      comment: rating.userComment ?? 'No comment provided.',
    })),
    kycDocuments: [
      { label: 'NIN', value: driver.kyc?.ninVerified ? 'Verified' : driver.kyc?.ninNumber ? 'Submitted' : 'Missing' },
      { label: 'BVN', value: driver.kyc?.bvnVerified ? 'Verified' : driver.kyc?.bvnNumber ? 'Submitted' : 'Missing' },
      { label: 'License', value: driver.kyc?.licenseImageUrl ? 'Uploaded' : 'Missing' },
      { label: 'Selfie', value: driver.kyc?.selfieUrl ? 'Uploaded' : 'Missing' },
      { label: 'Vehicle photo', value: driver.kyc?.vehicleImageUrl ? 'Uploaded' : 'Missing' },
    ],
  };
}

function mapWalletTransaction(tx: any) {
  return {
    id: tx.id,
    type: tx.type,
    category: tx.category,
    amount: money(tx.amount),
    status: tx.status,
    reference: tx.reference,
    note: tx.description,
    createdAt: when(tx.createdAt),
  };
}

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticateAdmin);

  app.get('/admin/users', async () => {
    const users = await app.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { wallet: true, _count: { select: { orders: true } } },
    });
    return success(users.map(mapUser), 'Admin users fetched');
  });

  app.get('/admin/users/:id', async (request) => {
    const { id } = request.params as { id: string };
    const user = await app.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: {
          include: {
            transactions: { orderBy: { createdAt: 'desc' }, take: 20 }
          }
        },
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: true, driver: { include: { user: true } }, items: true, statusHistory: { orderBy: { createdAt: 'asc' } } } },
        _count: { select: { orders: true } },
      },
    });
    return success(user ? mapUser(user) : null, 'Admin user fetched');
  });

  app.get('/admin/drivers', async () => {
    const drivers = await app.prisma.driver.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: true, kyc: true },
    });
    return success(drivers.map(mapDriver), 'Admin drivers fetched');
  });

  app.get('/admin/drivers/:id', async (request) => {
    const { id } = request.params as { id: string };
    const driver = await app.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        kyc: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: true, driver: { include: { user: true } }, items: true, statusHistory: { orderBy: { createdAt: 'asc' } } } },
        ratings: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: true } },
      },
    });
    return success(driver ? mapDriver(driver) : null, 'Admin driver fetched');
  });

  app.get('/admin/orders', async () => {
    const orders = await app.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: true, driver: { include: { user: true } }, items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return success(orders.map(mapOrder), 'Admin orders fetched');
  });

  app.get('/admin/orders/:id', async (request) => {
    const { id } = request.params as { id: string };
    const order = await app.prisma.order.findUnique({
      where: { id },
      include: { user: true, driver: { include: { user: true } }, items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return success(order ? mapOrder(order) : null, 'Admin order fetched');
  });

  app.get('/admin/wallet', async () => {
    const [walletAggregate, commissionAggregate, pendingEarningsAggregate, refundAggregate, transactions] = await Promise.all([
      app.prisma.wallet.aggregate({ _sum: { balance: true } }),
      app.prisma.walletTransaction.aggregate({ where: { category: WalletTransactionCategory.COMMISSION, status: WalletTransactionStatus.COMPLETED }, _sum: { amount: true } }),
      app.prisma.driverEarning.aggregate({ where: { status: DriverEarningStatus.PENDING }, _sum: { netAmount: true } }),
      app.prisma.walletTransaction.aggregate({ where: { category: WalletTransactionCategory.REFUND }, _sum: { amount: true } }),
      app.prisma.walletTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    return success({
      walletStats: [
        { label: 'Platform balance', value: money(walletAggregate._sum.balance), delta: 'wallet sum' },
        { label: 'Commissions earned', value: money(commissionAggregate._sum.amount), delta: 'completed' },
        { label: 'Pending settlement', value: money(pendingEarningsAggregate._sum.netAmount), delta: 'driver earnings' },
        { label: 'Refund reserve', value: money(refundAggregate._sum.amount), delta: 'refunds' },
      ],
      transactions: transactions.map(mapWalletTransaction),
    }, 'Admin wallet fetched');
  });

  app.get('/admin/notifications', async () => {
    const notifications = await app.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { include: { driver: true } } } });
    return success(notifications.map((item) => ({
      id: item.id,
      channel: item.user?.role === 'ADMIN' ? 'Admin' : item.user?.driver ? 'Driver' : 'User',
      title: item.title,
      body: item.body,
      sentAt: when(item.createdAt),
    })), 'Admin notifications fetched');
  });

  app.get('/admin/dashboard', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [orders, users, drivers, notifications, wallet] = await Promise.all([
      app.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { user: true, driver: { include: { user: true } }, items: true, statusHistory: { orderBy: { createdAt: 'asc' } } } }),
      app.prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20, include: { wallet: true, _count: { select: { orders: true } } } }),
      app.prisma.driver.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { user: true, kyc: true } }),
      app.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { user: { include: { driver: true } } } }),
      app.prisma.wallet.aggregate({ _sum: { balance: true } }),
    ]);
    const ordersToday = orders.filter((order) => order.createdAt >= today);
    const paidToday = ordersToday.filter((order) => order.paymentStatus === 'PAID').reduce((sum, order) => sum + Number(order.price), 0);
    const statusCounts = orders.reduce<Record<string, number>>((acc, order) => ({ ...acc, [order.status]: (acc[order.status] ?? 0) + 1 }), {});
    const revenueByDay = orders.filter((order) => order.paymentStatus === 'PAID').reduce<Record<string, number>>((acc, order) => {
      const key = dateOnly.format(order.createdAt);
      acc[key] = (acc[key] ?? 0) + Number(order.price);
      return acc;
    }, {});

    return success({
      kpis: [
        { label: 'Orders today', value: String(ordersToday.length), delta: `${orders.length} recent`, tone: 'primary' },
        { label: 'Active drivers', value: String(drivers.filter((driver) => driver.status === 'ACTIVE').length), delta: `${drivers.length} recent`, tone: 'success' },
        { label: 'Paid revenue today', value: compactMoney(paidToday), delta: 'paid orders', tone: 'warning' },
        { label: 'Wallet balance', value: compactMoney(wallet._sum.balance), delta: 'all wallets', tone: 'muted' },
      ],
      revenueSeries: Object.entries(revenueByDay).map(([day, value]) => ({ day, value })),
      orderStatusBreakdown: Object.entries(statusCounts).map(([label, value]) => ({ label: label.replaceAll('_', ' '), value, color: 'hsl(var(--primary))' })),
      recentOrders: orders.map(mapOrder),
      userRows: users.map(mapUser),
      driverRows: drivers.map(mapDriver),
      notificationRows: notifications.map((item) => ({ id: item.id, channel: item.user?.role === 'ADMIN' ? 'Admin' : item.user?.driver ? 'Driver' : 'User', title: item.title, body: item.body, sentAt: when(item.createdAt) })),
      walletStats: [
        { label: 'Platform balance', value: money(wallet._sum.balance), delta: 'wallet sum' },
      ],
    }, 'Admin dashboard fetched');
  });

  app.put('/admin/users/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const updated = await app.prisma.user.update({
      where: { id },
      data: {
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        status: body.status,
      },
      include: {
        wallet: {
          include: {
            transactions: { orderBy: { createdAt: 'desc' }, take: 20 }
          }
        },
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: true, driver: { include: { user: true } }, items: true, statusHistory: { orderBy: { createdAt: 'asc' } } } },
        _count: { select: { orders: true } },
      },
    });

    return success(mapUser(updated), 'User updated successfully');
  });

  app.post('/admin/users/:id/suspend', async (request) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body ?? {}) as { reason?: string };

    await app.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await app.prisma.notification.create({
      data: {
        userId: id,
        type: NotificationType.SYSTEM,
        title: 'Account suspended',
        body: reason || 'Your account has been suspended by an administrator.',
        data: { status: 'SUSPENDED', reason: reason || '' },
      },
    });

    return success({ suspended: true }, 'User suspended successfully');
  });

  app.post('/admin/users/:id/reactivate', async (request) => {
    const { id } = request.params as { id: string };

    await app.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await app.prisma.notification.create({
      data: {
        userId: id,
        type: NotificationType.SYSTEM,
        title: 'Account reactivated',
        body: 'Your account has been reactivated. You can now use the app.',
        data: { status: 'ACTIVE' },
      },
    });

    return success({ reactivated: true }, 'User reactivated successfully');
  });

  app.post('/admin/orders/:id/cancel', async (request) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body ?? {}) as { reason?: string };

    const order = await app.prisma.order.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!order) throw new Error('Order not found');

    await app.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'CANCELLED',
          note: reason || 'Order cancelled by administrator.',
        },
      });

      if (order.paymentStatus === 'PAID') {
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (wallet) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: order.price } },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'CREDIT',
              category: WalletTransactionCategory.REFUND,
              amount: order.price,
              status: WalletTransactionStatus.COMPLETED,
              reference: `REF-${order.trackingCode}`,
              description: `Refund for cancelled order ${order.trackingCode}`,
              balanceBefore: wallet.balance,
              balanceAfter: wallet.balance.add(order.price),
            },
          });
        }
      }
    });

    return success({ cancelled: true }, 'Order cancelled and refunded if paid');
  });

  app.post('/admin/orders/:id/resolve-dispute', async (request) => {
    const { id } = request.params as { id: string };

    await app.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'COMPLETED',
          note: 'Dispute resolved by administrator.',
        },
      });
    });

    return success({ resolved: true }, 'Dispute resolved');
  });

  app.post('/admin/orders/:id/refund', async (request) => {
    const { id } = request.params as { id: string };

    const order = await app.prisma.order.findUnique({
      where: { id },
    });
    if (!order) throw new Error('Order not found');

    await app.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: order.price } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            category: WalletTransactionCategory.REFUND,
            amount: order.price,
            status: WalletTransactionStatus.COMPLETED,
            reference: `REF-${order.trackingCode}`,
            description: `Refund for order ${order.trackingCode}`,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance.add(order.price),
          },
        });
      }
    });

    return success({ refunded: true }, 'Order payment refunded');
  });

  app.post('/admin/broadcast', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'body'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          body: { type: 'string', minLength: 1, maxLength: 600 },
          audience: { type: 'string', enum: ['all', 'users', 'drivers'], default: 'all' },
          data: { type: 'object', additionalProperties: true },
        },
      },
    },
  }, async (request) => {
    const { title, body, audience = 'all', data: extraData } = request.body as {
      title: string;
      body: string;
      audience?: 'all' | 'users' | 'drivers';
      data?: Record<string, unknown>;
    };

    // Resolve the audience to a list of users with push tokens
    const whereClause = audience === 'drivers'
      ? { deletedAt: null, driver: { isNot: null }, expoPushToken: { not: null } }
      : audience === 'users'
        ? { deletedAt: null, driver: null, expoPushToken: { not: null } }
        : { deletedAt: null, expoPushToken: { not: null } };

    const recipients = await app.prisma.user.findMany({
      where: whereClause as any,
      select: { id: true, expoPushToken: true },
    });

    const notificationPayload = { title, body, data: { kind: 'broadcast', ...extraData } };

    // Send push + write DB record for each recipient in parallel batches
    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        await sendPushNotification(app, recipient.id, notificationPayload);
        await app.prisma.notification.create({
          data: {
            userId: recipient.id,
            type: NotificationType.SYSTEM,
            title,
            body,
            data: notificationPayload.data,
          },
        });
      }),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    app.log.info({ audience, recipients: recipients.length, sent, failed }, 'admin.broadcast.sent');
    return success({ sent, failed, total: recipients.length }, 'Broadcast sent');
  });

  app.post('/admin/config/maintenance', {
    schema: {
      body: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: { type: 'boolean' },
          message: { type: 'string' },
          estimatedMinutes: { type: 'number' },
        },
      },
    },
  }, async (request) => {
    const { enabled, message = '', estimatedMinutes = null } = request.body as {
      enabled: boolean;
      message?: string;
      estimatedMinutes?: number | null;
    };

    const configValue = JSON.stringify({ enabled, message, estimatedMinutes });

    await app.prisma.appConfig.upsert({
      where: { key: 'maintenance' },
      update: { value: configValue },
      create: { key: 'maintenance', value: configValue },
    });

    return success({ success: true }, 'Maintenance mode updated');
  });

  app.get('/admin/config/maintenance', async () => {
    const config = await app.prisma.appConfig.findUnique({
      where: { key: 'maintenance' },
    });

    let maintenance = { enabled: false, message: '', estimatedMinutes: null };
    if (config) {
      try {
        maintenance = JSON.parse(config.value);
      } catch (err) {
        app.log.error(err, 'Failed to parse maintenance configuration');
      }
    }

    return success(maintenance, 'Maintenance mode config retrieved');
  });
};

export default adminRoutes;
