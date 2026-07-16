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
  orders: string;
  wallet: string;
  walletBalance?: string;
  city: string;
  avatarInitial: string;
  avatarUrl?: string;
  recentOrders?: AdminOrder[];
  walletTransactions?: AdminWalletTransaction[];
  supportNote?: string;
  segments?: string[];
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
  reviews?: Array<{ id: string; user: string; rating: string; comment: string }>;
  kycDocuments?: Array<{ label: string; value: string }>;
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
};

export type AdminNotification = {
  id: string;
  channel: string;
  title: string;
  body: string;
  sentAt: string;
};

export type AdminWalletTransaction = {
  id: string;
  type: string;
  category: string;
  amount: string;
  status: string;
  reference: string;
  note: string;
  createdAt: string;
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

export type AdminServiceArea = {
  id: string;
  city: string;
  state: string;
  active: boolean;
  baseFareNgn: number;
  perKmNgn: number;
  driverCount: number;
};


type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

const apiUrl = process.env.PERCEL_API_URL ?? 'http://localhost:3000';

async function adminFetch<T>(path: string): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${apiUrl}/api/v1/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | { message?: string } | null;

  if (!response.ok || !payload || !('data' in payload)) {
    throw new Error(payload?.message ?? `Admin API request failed: ${path}`);
  }

  return payload.data;
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
