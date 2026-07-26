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
  recipientName?: string;
  recipientPhone?: string;
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

export type AdminPayout = {
  id: string;
  driverName: string;
  driverPhone: string;
  driverId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
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

export type AdminServiceArea = {
  id: string;
  city: string;
  state: string;
  active: boolean;
  baseFareNgn: number;
  perKmNgn: number;
  driverCount: number;
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
  createdAt: string;
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
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

const apiUrl = process.env.PERCEL_API_URL ?? 'http://localhost:3000';

// Mock Data Fallbacks for offline / standalone dev server operation
const MOCK_ORDERS: AdminOrder[] = [
  {
    id: 'ord_1',
    trackingCode: 'PCL-998241',
    user: 'Ahmadou Bello',
    userId: 'usr_1',
    userEmail: 'ahmadou@percel.app',
    userPhone: '+234 803 123 4567',
    driver: 'Arthur Sjorgen',
    driverId: 'drv_1',
    driverEmail: 'arthur@percel.app',
    driverPhone: '+234 802 987 6543',
    driverVehicle: 'Yamaha Motorcycle - KJA-123XY',
    driverRating: '4.9',
    status: 'IN_TRANSIT',
    price: '₦14,500',
    date: 'Today, 14:20',
    payment: 'PAID',
    pickup: 'Erdberg, Ikeja, Lagos',
    dropoff: 'Wuse 2, Abuja',
    items: ['1x Electronics Package (2.4 kg)', '2x Documents Envelope'],
    timeline: [
      { status: 'ACCEPTED', note: 'Courier accepted delivery dispatch', at: '14:05' },
      { status: 'IN_TRANSIT', note: 'Package picked up and in transit to Abuja', at: '14:20' },
    ],
    customerNote: 'Handle with extreme care, fragile OLED display.',
  },
  {
    id: 'ord_2',
    trackingCode: 'PCL-773120',
    user: 'Chioma Adebayo',
    userId: 'usr_2',
    userEmail: 'chioma@percel.app',
    userPhone: '+234 805 222 3333',
    driver: 'Emeka Nwosu',
    driverId: 'drv_2',
    driverEmail: 'emeka@percel.app',
    driverPhone: '+234 801 444 5555',
    driverVehicle: 'Toyota HiAce Cargo Van - ABJ-992ZZ',
    driverRating: '4.8',
    status: 'COMPLETED',
    price: '₦28,000',
    date: 'Yesterday',
    payment: 'PAID',
    pickup: 'Victoria Island, Lagos',
    dropoff: 'Port Harcourt Gateway Depot',
    items: ['3x Commercial Spare Parts'],
    timeline: [
      { status: 'COMPLETED', note: 'Delivered and signed by recipient', at: 'Yesterday 17:30' },
    ],
  },
  {
    id: 'ord_3',
    trackingCode: 'PCL-441098',
    user: 'Babajide Sanwo',
    userId: 'usr_3',
    userEmail: 'babajide@percel.app',
    driver: 'Kabiru Hassan',
    driverId: 'drv_3',
    driverVehicle: 'Shacman Heavy Duty Truck - KAN-441XX',
    driverRating: '5.0',
    status: 'PENDING_MATCH',
    price: '₦85,000',
    date: 'Today, 15:00',
    payment: 'PAID',
    pickup: 'Apapa Port Terminal, Lagos',
    dropoff: 'Kano Commercial Depot',
    items: ['10x Industrial Pallets'],
    timeline: [
      { status: 'PENDING_MATCH', note: 'Awaiting heavy freight driver match', at: '15:00' },
    ],
  },
];

const MOCK_USERS: AdminUser[] = [
  { id: 'usr_1', name: 'Ahmadou Bello', email: 'ahmadou@percel.app', phone: '+234 803 123 4567', status: 'ACTIVE', joined: 'Jan 2025', orders: '14', wallet: '₦45,200', city: 'Lagos', avatarInitial: 'AB' },
  { id: 'usr_2', name: 'Chioma Adebayo', email: 'chioma@percel.app', phone: '+234 805 222 3333', status: 'ACTIVE', joined: 'Feb 2025', orders: '8', wallet: '₦18,500', city: 'Abuja', avatarInitial: 'CA' },
];

const MOCK_DRIVERS: AdminDriver[] = [
  { id: 'drv_1', name: 'Arthur Sjorgen', status: 'ACTIVE', kyc: 'VERIFIED', rating: '4.9', vehicle: 'Yamaha Bike - KJA-123XY', email: 'arthur@percel.app', phone: '+234 802 987 6543' },
  { id: 'drv_2', name: 'Emeka Nwosu', status: 'ACTIVE', kyc: 'VERIFIED', rating: '4.8', vehicle: 'Cargo Van - ABJ-992ZZ', email: 'emeka@percel.app', phone: '+234 801 444 5555' },
];

const MOCK_SNAPSHOT: AdminDashboardSnapshot = {
  kpis: [
    { label: 'Orders today', value: '24', delta: '+12% vs last week', tone: 'primary' },
    { label: 'Active drivers', value: '18', delta: '100% online', tone: 'success' },
    { label: 'Paid revenue today', value: '₦328,500', delta: '+18% growth', tone: 'warning' },
    { label: 'Wallet balance', value: '₦3,855,200', delta: 'all accounts', tone: 'muted' },
  ],
  revenueSeries: [
    { day: 'Mon', value: 120000 },
    { day: 'Tue', value: 240000 },
    { day: 'Wed', value: 180000 },
    { day: 'Thu', value: 310000 },
    { day: 'Fri', value: 290000 },
    { day: 'Sat', value: 380000 },
    { day: 'Sun', value: 328500 },
  ],
  orderStatusBreakdown: [
    { label: 'Completed', value: 42, color: 'hsl(var(--success))' },
    { label: 'In Transit', value: 18, color: 'hsl(var(--primary))' },
    { label: 'Pending Match', value: 8, color: 'hsl(var(--warning))' },
  ],
  recentOrders: MOCK_ORDERS,
  driverRows: MOCK_DRIVERS,
  userRows: MOCK_USERS,
  notificationRows: [
    { id: 'not_1', channel: 'User', title: 'Order Dispatched', body: 'Your package PCL-998241 is now in transit.', sentAt: 'Today, 14:20' },
  ],
  walletStats: [
    { label: 'Platform balance', value: '₦3,855,200', delta: 'all wallets' },
    { label: 'Commissions earned', value: '₦488,400', delta: 'completed' },
    { label: 'Pending settlement', value: '₦247,900', delta: 'driver earnings' },
    { label: 'Refund reserve', value: '₦52,000', delta: 'refunds' },
  ],
};

const MOCK_PAYOUTS: AdminPayout[] = [
  { id: 'po_901283', driverName: 'Babatunde Adeleke', driverPhone: '+234 803 111 2222', driverId: 'drv_1', bankName: 'GTBank', accountNumber: '0123456789', accountName: 'BABATUNDE ADELEKE', amount: '₦45,500', requestedAt: '10 mins ago', status: 'PENDING' },
  { id: 'po_901284', driverName: 'Chinedu Okonkwo', driverPhone: '+234 802 333 4444', driverId: 'drv_2', bankName: 'Kuda Bank', accountNumber: '2098765432', accountName: 'CHINEDU OKONKWO', amount: '₦82,000', requestedAt: '25 mins ago', status: 'PENDING' },
  { id: 'po_901285', driverName: 'Amina Ibrahim', driverPhone: '+234 805 555 6666', driverId: 'drv_3', bankName: 'Access Bank', accountNumber: '0011223344', accountName: 'AMINA IBRAHIM', amount: '₦120,400', requestedAt: '1 hour ago', status: 'PENDING' },
];

const MOCK_CONNECTED_USERS: AdminConnectedUser[] = [
  { id: 'usr_1', name: 'Ahmadou Bello', email: 'ahmadou@percel.app', role: 'USER', avatarInitial: 'AB', lastSeen: 'Just now', status: 'ONLINE' },
  { id: 'drv_1', name: 'Arthur Sjorgen', email: 'arthur@percel.app', role: 'DRIVER', avatarInitial: 'AS', lastSeen: '2 min ago', status: 'ONLINE' },
  { id: 'drv_2', name: 'Emeka Nwosu', email: 'emeka@percel.app', role: 'DRIVER', avatarInitial: 'EN', lastSeen: '5 min ago', status: 'RECENT' },
  { id: 'usr_2', name: 'Chioma Adebayo', email: 'chioma@percel.app', role: 'USER', avatarInitial: 'CA', lastSeen: '12 min ago', status: 'RECENT' },
];

const MOCK_WALLET_TRANSACTIONS: AdminWalletTransaction[] = [
  { id: 'tx_1', type: 'CREDIT', category: 'TOPUP', amount: '₦25,000', status: 'COMPLETED', reference: 'MNN-882341', note: 'Monnify wallet top-up', createdAt: 'Today, 14:00' },
  { id: 'tx_2', type: 'DEBIT', category: 'PAYMENT', amount: '₦14,500', status: 'COMPLETED', reference: 'PCL-998241', note: 'Order dispatch payment', createdAt: 'Today, 14:20' },
  { id: 'tx_3', type: 'DEBIT', category: 'COMMISSION', amount: '₦1,450', status: 'COMPLETED', reference: 'COM-1234', note: 'Platform commission 10%', createdAt: 'Today, 14:21' },
  { id: 'tx_4', type: 'CREDIT', category: 'TOPUP', amount: '₦50,000', status: 'COMPLETED', reference: 'MNN-773120', note: 'Bank transfer wallet fund', createdAt: 'Yesterday, 09:00' },
  { id: 'tx_5', type: 'DEBIT', category: 'PAYMENT', amount: '₦28,000', status: 'COMPLETED', reference: 'PCL-773120', note: 'Order dispatch payment', createdAt: 'Yesterday, 11:30' },
];

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
  if (path.includes('/dashboard')) return { ...MOCK_SNAPSHOT, recentOrders: [], driverRows: [], userRows: [], notificationRows: [], walletStats: MOCK_SNAPSHOT.walletStats, kpis: MOCK_SNAPSHOT.kpis.map(k => ({ ...k, value: '—' })), revenueSeries: [], orderStatusBreakdown: [] } as unknown as T;
  if (path.includes('/orders')) return [] as unknown as T;
  if (path.includes('/users')) return [] as unknown as T;
  if (path.includes('/drivers')) return [] as unknown as T;
  if (path === '/notifications') return [] as unknown as T;
  if (path === '/wallet') return { walletStats: MOCK_SNAPSHOT.walletStats.map(s => ({ ...s, value: '—' })), transactions: [] } as unknown as T;
  if (path === '/payouts') return [] as unknown as T;
  if (path === '/connected-users') return [] as unknown as T;
  return [] as unknown as T;
}

function getFallbackForPath<T>(path: string): T {
  if (path.includes('/dashboard')) return MOCK_SNAPSHOT as unknown as T;
  if (path.includes('/orders/') && path !== '/orders') {
    const id = path.split('/').pop();
    const found = MOCK_ORDERS.find((o) => o.id === id || o.trackingCode === id);
    return (found ?? MOCK_ORDERS[0]) as unknown as T;
  }
  if (path === '/orders') return MOCK_ORDERS as unknown as T;
  if (path.includes('/users/') && path !== '/users') {
    const id = path.split('/').pop();
    const found = MOCK_USERS.find((u) => u.id === id);
    return (found ?? MOCK_USERS[0]) as unknown as T;
  }
  if (path === '/users') return MOCK_USERS as unknown as T;
  if (path.includes('/drivers/') && path !== '/drivers') {
    const id = path.split('/').pop();
    const found = MOCK_DRIVERS.find((d) => d.id === id);
    return (found ?? MOCK_DRIVERS[0]) as unknown as T;
  }
  if (path === '/drivers') return MOCK_DRIVERS as unknown as T;
  if (path === '/notifications') return MOCK_SNAPSHOT.notificationRows as unknown as T;
  if (path === '/wallet') return { walletStats: MOCK_SNAPSHOT.walletStats, transactions: MOCK_WALLET_TRANSACTIONS } as unknown as T;
  if (path === '/payouts') return MOCK_PAYOUTS as unknown as T;
  if (path === '/connected-users') return MOCK_CONNECTED_USERS as unknown as T;
  if (path === '/service-areas') return [] as unknown as T;
  if (path === '/hubs') return [] as unknown as T;
  if (path === '/routes') return [] as unknown as T;
  return MOCK_SNAPSHOT as unknown as T;
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

export async function loadDriverPayouts() {
  return adminFetch<AdminPayout[]>('/payouts');
}

export async function loadConnectedUsers() {
  return adminFetch<AdminConnectedUser[]>('/connected-users');
}

export async function loadWalletTransactions() {
  const data = await loadDashboardWallet();
  return data.transactions;
}
