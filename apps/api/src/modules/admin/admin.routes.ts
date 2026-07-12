import type { FastifyPluginAsync } from 'fastify';
import { DriverEarningStatus, Prisma, WalletTransactionCategory, WalletTransactionStatus } from '@prisma/client';

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
    driver: order.driver?.user?.fullName ?? 'Unassigned',
    driverId: order.driverId ?? '',
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
    supportNote: user.status === 'SUSPENDED' ? 'Account is paused pending review.' : 'Account is active.',
    recentOrders: (user.orders ?? []).map(mapOrder),
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
        wallet: true,
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
};

export default adminRoutes;
