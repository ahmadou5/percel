import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './session';

export type KpiCard = {
  label: string;
  value: string;
  delta: string;
  tone: 'primary' | 'success' | 'warning' | 'muted';
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  joined: string;
  createdAt?: string;
  updatedAt?: string;
  lastActive?: string;
  orders: string;
  wallet: string;
  walletBalance?: string;
  rawWalletBalance?: number;
  city: string;
  address?: string;
  avatarInitial: string;
  avatarUrl?: string;
  role?: 'USER' | 'ADMIN' | 'SYSTEM';
  isDriver?: boolean;
  isSystem?: boolean;
  accountType?: 'Customer' | 'Driver-linked' | 'System';
  kycStatus?: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE';
  recentOrders?: AdminOrder[];
  walletTransactions?: AdminWalletTransaction[];
  supportNote?: string;
  segments?: string[];
  auditLogs?: Array<{ id: string; adminName: string; action: string; details: string; reason?: string; timestamp: string }>;
};

export type AdminDriver = {
  id: string;
  name: string;
  status: string;
  kyc: string;
  rating: string;
  vehicle: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  kycReason?: string;
  assignedOrders?: AdminOrder[];
  reviews?: Array<{ id: string; user: string; rating: string; comment: string; createdAt?: string; isFlagged?: boolean; responseNote?: string }>;
  kycDocuments?: Array<{ label: string; value: string }>;
  detailedKycDocs?: Array<{ key: string; label: string; status: 'VERIFIED' | 'SUBMITTED' | 'REJECTED' | 'MISSING'; url?: string; value?: string; rejectionReason?: string; verifiedAt?: string }>;
  reviewCount?: number;
  completedDeliveries?: number;
  lastActive?: string;
  walletBalance?: string;
  hasPendingPayout?: boolean;
  vehicleType?: 'Bike' | 'Car' | 'Van' | 'Truck';
  walletTransactions?: AdminWalletTransaction[];
  auditLogs?: Array<{ id: string; adminName: string; action: string; details: string; reason?: string; timestamp: string }>;
};

export type AdminOrder = {
  id: string;
  trackingCode: string;
  user: string;
  userId: string;
  userEmail?: string;
  userPhone?: string;
  userAvatarUrl?: string;
  driver: string;
  driverId: string;
  driverEmail?: string;
  driverPhone?: string;
  driverAvatarUrl?: string;
  driverVehicle?: string;
  driverRating?: string;
  status: string;
  price: string;
  date: string;
  payment: string;
  pickup: string;
  dropoff: string;
  items: string[];
  timeline: Array<{ status: string; note: string; at: string }>;
  riskLevel?: string;
  customerNote?: string;
  recipientName?: string;
  recipientPhone?: string;
  cancellationReason?: string;
};

export type NotificationRecipientLog = {
  userId: string;
  name: string;
  email: string;
  pushToken: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  sentAt: string;
};

export type AdminNotification = {
  id: string;
  channel: string;
  title: string;
  body: string;
  desc?: string;
  sentAt: string;
  campaignId?: string;
  isTransactional?: boolean;
  totalRecipients?: number;
  deliveredCount?: number;
  failedCount?: number;
  openRatePct?: number;
  scheduledFor?: string;
  deepLink?: string;
  recipientsList?: NotificationRecipientLog[];
};

export type BroadcastTemplate = {
  id: string;
  name: string;
  title: string;
  body: string;
  audience: 'all' | 'users' | 'drivers';
  deepLink?: string;
};

export type AdminRoleUser = {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Finance' | 'Dispatch' | 'Support';
  lastActive: string;
  status: 'ACTIVE' | 'INVITED' | 'REVOKED';
};

export type OpsThresholdConfig = {
  id: string;
  key: string;
  label: string;
  currentVal: number;
  thresholdVal: number;
  unit: string;
  channel: 'EMAIL' | 'BANNER' | 'SLACK';
};

export type SettingsAuditEntry = {
  id: string;
  adminName: string;
  category: string;
  action: string;
  oldValue: string;
  newValue: string;
  reason?: string;
  timestamp: string;
};

export type AdminWalletTransaction = {
  id: string;
  type: string;
  category: string;
  amount: string;
  rawAmount?: number;
  status: string;
  reference: string;
  note: string;
  createdAt: string;
  userName?: string;
  userId?: string;
  userRole?: 'USER' | 'DRIVER';
  isAnomalous?: boolean;
  anomalyReason?: string;
};

export type AdminPayout = {
  id: string;
  driverName: string;
  driverPhone: string;
  driverId: string;
  bankName: string;
  accountNumber: string;
  maskedAccountNumber?: string;
  accountName: string;
  amount: string;
  rawAmount?: number;
  driverWalletBalance?: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'FAILED';
  riskFlags?: string[];
  monnifyReference?: string;
  rejectionReason?: string;
  failureReason?: string;
  processedAt?: string;
};

export type AdminConnectedUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'DRIVER' | 'ADMIN';
  avatarInitial: string;
  lastSeen: string;
  status: 'ONLINE' | 'RECENT';
};

export type AdminDashboardSnapshot = {
  kpis: KpiCard[];
  revenueSeries: Array<{ day: string; value: number }>;
  orderStatusBreakdown: Array<{ label: string; value: number; color: string }>;
  recentOrders: AdminOrder[];
  driverRows: AdminDriver[];
  userRows: AdminUser[];
  notificationRows: AdminNotification[];
  walletStats: Array<{ label: string; value: string; delta: string }>;
};

export type PricingAuditRecord = {
  id: string;
  serviceAreaId: string;
  cityName: string;
  adminName: string;
  field: string;
  oldValue: number | string;
  newValue: number | string;
  timestamp: string;
};

export type AdminServiceArea = {
  id: string;
  city: string;
  state: string;
  active: boolean;
  baseFareNgn: number;
  perKmNgn: number;
  minFareNgn?: number;
  maxFareNgn?: number;
  driverCount: number;
  recentOrdersCount?: number;
  activeOrdersCount?: number;
  auditHistory?: PricingAuditRecord[];
};

export type AdminInterstateRoute = {
  id: string;
  originState: string;
  destinationState: string;
  baseFareNgn: number;
  perKmNgn: number;
  estHours: number;
  active: boolean;
};

export type AdminHub = {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  lat: number;
  lng: number;
  type: 'office' | 'agent' | 'partner_park';
  contactPhone?: string;
  isActive: boolean;
  basePricingModifier: number;
  createdAt?: string;
  auditHistory?: PricingAuditRecord[];
};

export type AdminRoute = {
  id: string;
  originHubId: string;
  destinationHubId: string;
  baseFare: number;
  estimatedDays: number;
  isActive: boolean;
  originHub?: AdminHub;
  destinationHub?: AdminHub;
  auditHistory?: PricingAuditRecord[];
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

const apiUrl = process.env.PERCEL_API_URL ?? 'http://localhost:3000';


async function adminFetch<T>(path: string): Promise<T> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) {
      console.warn('[adminFetch] No token found, returning fallback data for path:', path);
      return getFallbackForPath<T>(path);
    }

    const response = await fetch(`${apiUrl}/api/v1/admin${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    // 401/403 means the token is invalid or the user is not an admin.
    // Do NOT fall back to mock data — that hides auth issues and shows fake data.
    if (response.status === 401 || response.status === 403) {
      console.error(`[adminFetch] Auth rejected (${response.status}) for ${path}. Token may be expired or not ADMIN role. User should re-login.`);
      // Return empty-but-valid structure so page renders (not mock data)
      return getEmptyForPath<T>(path);
    }

    if (!response.ok) {
      console.warn(`[adminFetch] Response not OK (${response.status}) for ${path}, using fallback`);
      return getFallbackForPath<T>(path);
    }

    const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (payload && payload.success && 'data' in payload) {
      return payload.data;
    }

    return getFallbackForPath<T>(path);
  } catch (error) {
    console.warn(`[adminFetch] Fetch failed for ${path} (${error instanceof Error ? error.message : 'network offline'}), returning fallback data`);
    return getFallbackForPath<T>(path);
  }
}

/** Returns empty-but-real-shaped data when auth is rejected (not mock) */
function getEmptyForPath<T>(path: string): T {
  if (path.includes('/dashboard')) return {
    kpis: [
      { label: 'Orders today', value: '0', delta: '0%', tone: 'primary' },
      { label: 'Active drivers', value: '0', delta: '0%', tone: 'success' },
      { label: 'Paid revenue today', value: '₦0', delta: '0%', tone: 'warning' },
      { label: 'Wallet balance', value: '₦0', delta: '0%', tone: 'muted' },
    ],
    revenueSeries: [],
    orderStatusBreakdown: [],
    recentOrders: [],
    driverRows: [],
    userRows: [],
    notificationRows: [],
    walletStats: [
      { label: 'Platform balance', value: '₦0', delta: '0%' },
      { label: 'Commissions earned', value: '₦0', delta: '0%' },
      { label: 'Pending settlement', value: '₦0', delta: '0%' },
      { label: 'Refund reserve', value: '₦0', delta: '0%' },
    ]
  } as unknown as T;
  if (path.includes('/orders') && path !== '/orders') {
    // Single order detail path like /orders/123
    if (path.startsWith('/orders/')) return null as unknown as T;
  }
  if (path.includes('/users') && path !== '/users') {
    // Single user detail path like /users/456
    if (path.startsWith('/users/')) return null as unknown as T;
  }
  if (path.includes('/drivers') && path !== '/drivers') {
    // Single driver detail path like /drivers/789
    if (path.startsWith('/drivers/')) return null as unknown as T;
  }
  if (path.includes('/orders')) return [] as unknown as T;
  if (path.includes('/users')) return [] as unknown as T;
  if (path.includes('/drivers')) return [] as unknown as T;
  if (path === '/notifications') return [] as unknown as T;
  if (path === '/wallet') return {
    walletStats: [
      { label: 'Platform balance', value: '₦0', delta: '0%' },
      { label: 'Commissions earned', value: '₦0', delta: '0%' },
      { label: 'Pending settlement', value: '₦0', delta: '0%' },
      { label: 'Refund reserve', value: '₦0', delta: '0%' },
    ],
    transactions: []
  } as unknown as T;
  if (path === '/payouts') return [] as unknown as T;
  if (path === '/connected-users') return [] as unknown as T;
  return [] as unknown as T;
}

function getFallbackForPath<T>(path: string): T {
  // Use empty structures to prevent fake data from rendering if API fails
  return getEmptyForPath<T>(path);
}

export async function loadDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  return adminFetch<AdminDashboardSnapshot>('/dashboard');
}

export async function loadDashboardOrders() {
  return adminFetch<AdminOrder[]>('/orders');
}

export async function loadDashboardUsers() {
  return adminFetch<AdminUser[]>('/users');
}

export async function loadDashboardDrivers() {
  return adminFetch<AdminDriver[]>('/drivers');
}

export async function loadDashboardNotifications() {
  return adminFetch<AdminNotification[]>('/notifications');
}

export async function loadDashboardWallet() {
  return adminFetch<{ walletStats: Array<{ label: string; value: string; delta: string }>; transactions: AdminWalletTransaction[] }>('/wallet');
}

export async function getUserDetail(id: string) {
  return adminFetch<AdminUser | null>(`/users/${id}`);
}

export async function getDriverDetail(id: string) {
  return adminFetch<AdminDriver | null>(`/drivers/${id}`);
}

export async function getOrderDetail(id: string) {
  return adminFetch<AdminOrder | null>(`/orders/${id}`);
}

export async function getDashboardHighlights() {
  return loadDashboardSnapshot();
}

export async function loadServiceAreas() {
  return adminFetch<AdminServiceArea[]>('/service-areas');
}

export async function loadHubs() {
  return adminFetch<AdminHub[]>('/hubs');
}

export async function loadRoutes() {
  return adminFetch<AdminRoute[]>('/routes');
}

export async function loadSettings() {
  return adminFetch<{
    adminRoles: AdminRoleUser[];
    opsThresholds: OpsThresholdConfig[];
    globalAuditLog: SettingsAuditEntry[];
    broadcastTemplates: BroadcastTemplate[];
  }>('/settings');
}

export async function loadDriverPayouts() {
  return adminFetch<AdminPayout[]>('/payouts');
}

export async function loadDisputes() {
  return adminFetch<any[]>('/disputes');
}

export async function loadConnectedUsers() {
  return adminFetch<AdminConnectedUser[]>('/connected-users');
}

export async function loadWalletTransactions() {
  const data = await loadDashboardWallet();
  return data.transactions;
}
