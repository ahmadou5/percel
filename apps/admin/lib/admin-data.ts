type KpiCard = {
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
  city: string;
  avatarInitial: string;
};

export type AdminDriver = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  kyc: 'APPROVED' | 'SUBMITTED' | 'REJECTED';
  rating: string;
  vehicle: string;
  email: string;
  phone: string;
  kycReason?: string;
};

export type AdminOrder = {
  id: string;
  trackingCode: string;
  user: string;
  userId: string;
  driver: string;
  driverId: string;
  status: string;
  price: string;
  date: string;
  payment: 'PAID' | 'PENDING' | 'REFUNDED';
  pickup: string;
  dropoff: string;
  items: string[];
  timeline: Array<{ status: string; note: string; at: string }>;
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
  type: 'CREDIT' | 'DEBIT';
  category: 'COMMISSION' | 'REFUND' | 'ORDER_EARNING' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'TOP_UP';
  amount: string;
  status: 'COMPLETED' | 'PENDING' | 'REVERSED';
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

const users: AdminUser[] = [
  { id: 'amina-bello', name: 'Amina Bello', email: 'amina@percel.app', phone: '+234 803 111 2048', status: 'ACTIVE', joined: '2 days ago', orders: '14', wallet: '₦84,200', city: 'Lagos Island', avatarInitial: 'A' },
  { id: 'tobi-adeyemi', name: 'Tobi Adeyemi', email: 'tobi@percel.app', phone: '+234 801 442 2209', status: 'SUSPENDED', joined: '1 week ago', orders: '7', wallet: '₦0', city: 'Ikeja', avatarInitial: 'T' },
  { id: 'mariam-yusuf', name: 'Mariam Yusuf', email: 'mariam@percel.app', phone: '+234 809 001 1134', status: 'ACTIVE', joined: '3 weeks ago', orders: '31', wallet: '₦210,500', city: 'Abuja', avatarInitial: 'M' },
  { id: 'david-eze', name: 'David Eze', email: 'david@percel.app', phone: '+234 806 552 7801', status: 'PENDING_VERIFICATION', joined: 'Today', orders: '2', wallet: '₦12,900', city: 'Port Harcourt', avatarInitial: 'D' },
];

const drivers: AdminDriver[] = [
  { id: 'chinedu-okafor', name: 'Chinedu Okafor', status: 'ACTIVE', kyc: 'APPROVED', rating: '4.9', vehicle: 'VAN · KJA-482XY', email: 'chinedu@percel.app', phone: '+234 803 451 9910' },
  { id: 'ngozi-umeh', name: 'Ngozi Umeh', status: 'ACTIVE', kyc: 'APPROVED', rating: '4.8', vehicle: 'CAR · LAG-193PQ', email: 'ngozi@percel.app', phone: '+234 811 332 1432' },
  { id: 'ibrahim-sani', name: 'Ibrahim Sani', status: 'PENDING', kyc: 'SUBMITTED', rating: '4.6', vehicle: 'BIKE · FCT-812RT', email: 'ibrahim@percel.app', phone: '+234 806 220 4559' },
  { id: 'aisha-bello', name: 'Aisha Bello', status: 'SUSPENDED', kyc: 'REJECTED', rating: '4.2', vehicle: 'TRUCK · KAD-220XE', email: 'aisha@percel.app', phone: '+234 805 990 7754', kycReason: 'Vehicle photo did not match registration records.' },
];

const orderMap: AdminOrder[] = [
  {
    id: 'pcl-19ax2fq',
    trackingCode: 'PCL-19AX2FQ',
    user: 'Amina Bello',
    userId: 'amina-bello',
    driver: 'Chinedu Okafor',
    driverId: 'chinedu-okafor',
    status: 'IN_TRANSIT',
    price: '₦12,400',
    date: 'Today, 09:12',
    payment: 'PAID',
    pickup: '12 Adeola Odeku, Victoria Island, Lagos',
    dropoff: '44 Admiralty Way, Lekki Phase 1, Lagos',
    items: ['Clothing box', 'Accessories pouch', 'Sealed envelope'],
    timeline: [
      { status: 'CREATED', note: 'Order created by Amina Bello', at: '09:00' },
      { status: 'MATCHED', note: 'Assigned to Chinedu Okafor', at: '09:03' },
      { status: 'IN_TRANSIT', note: 'Package picked up and on route', at: '09:12' },
    ],
  },
  {
    id: 'pcl-4kq2j9m',
    trackingCode: 'PCL-4KQ2J9M',
    user: 'Tobi Adeyemi',
    userId: 'tobi-adeyemi',
    driver: 'Unassigned',
    driverId: 'ibrahim-sani',
    status: 'PENDING_MATCH',
    price: '₦7,900',
    date: 'Today, 08:47',
    payment: 'PENDING',
    pickup: '5 Allen Avenue, Ikeja, Lagos',
    dropoff: '18 Obafemi Awolowo Way, Ikeja, Lagos',
    items: ['Small parcel', 'Gift bag'],
    timeline: [
      { status: 'CREATED', note: 'Waiting for driver assignment', at: '08:47' },
    ],
  },
  {
    id: 'pcl-7qpd8lm',
    trackingCode: 'PCL-7QPD8LM',
    user: 'Mariam Yusuf',
    userId: 'mariam-yusuf',
    driver: 'Ngozi Umeh',
    driverId: 'ngozi-umeh',
    status: 'COMPLETED',
    price: '₦19,000',
    date: 'Today, 08:03',
    payment: 'PAID',
    pickup: '17 Okotie Eboh Street, Ikoyi, Lagos',
    dropoff: '12 Ajose Adeogun, Abuja',
    items: ['Laptop bag', 'Documents folder'],
    timeline: [
      { status: 'CREATED', note: 'Order created by Mariam Yusuf', at: '07:41' },
      { status: 'MATCHED', note: 'Assigned to Ngozi Umeh', at: '07:49' },
      { status: 'DELIVERED', note: 'Delivered and confirmed by customer', at: '08:03' },
      { status: 'COMPLETED', note: 'Order closed', at: '08:05' },
    ],
  },
  {
    id: 'pcl-2jx5zcn',
    trackingCode: 'PCL-2JX5ZCN',
    user: 'David Eze',
    userId: 'david-eze',
    driver: 'Ibrahim Sani',
    driverId: 'ibrahim-sani',
    status: 'DISPUTED',
    price: '₦5,200',
    date: 'Yesterday',
    payment: 'REFUNDED',
    pickup: '41 Aba Road, Port Harcourt',
    dropoff: '2 Tombia Street, Port Harcourt',
    items: ['Medicine bag', 'Receipt envelope'],
    timeline: [
      { status: 'CREATED', note: 'Order created by David Eze', at: 'Yesterday 11:00' },
      { status: 'DELIVERED', note: 'Dispute opened after handoff', at: 'Yesterday 12:10' },
      { status: 'DISPUTED', note: 'Refund reviewed by support', at: 'Yesterday 12:24' },
    ],
  },
];

const notifications: AdminNotification[] = [
  { id: 'notif-1', channel: 'All users', title: 'Weekend delivery promo', body: 'Free wallet top-up fee for the first 100 orders.', sentAt: '2 hours ago' },
  { id: 'notif-2', channel: 'Drivers', title: 'Hot zones updated', body: 'High-demand pickup areas are now active in Lagos Island.', sentAt: 'Yesterday' },
  { id: 'notif-3', channel: 'Specific user', title: 'Refund processed', body: 'Order PCL-2JX5ZCN refund completed.', sentAt: 'Yesterday' },
];

const walletTransactions: AdminWalletTransaction[] = [
  { id: 'txn-1', type: 'CREDIT', category: 'COMMISSION', amount: '₦18,400', status: 'COMPLETED', reference: 'PCL-19AX2FQ', note: 'Platform commission from completed order', createdAt: 'Today, 09:14' },
  { id: 'txn-2', type: 'DEBIT', category: 'REFUND', amount: '₦5,200', status: 'COMPLETED', reference: 'PCL-2JX5ZCN', note: 'Refund issued after dispute resolution', createdAt: 'Yesterday, 12:26' },
  { id: 'txn-3', type: 'CREDIT', category: 'ORDER_EARNING', amount: '₦64,000', status: 'PENDING', reference: 'DRV-2240', note: 'Awaiting settlement batch', createdAt: 'Yesterday, 17:10' },
];

function withDetailSummary<T extends { id: string }>(items: T[]) {
  return items;
}

export const adminUsers = withDetailSummary(users);
export const adminDrivers = withDetailSummary(drivers);
export const adminOrders = withDetailSummary(orderMap);
export const adminNotifications = withDetailSummary(notifications);
export const adminWalletTransactions = withDetailSummary(walletTransactions);

function parseCurrency(value: string) {
  return Number(value.replace(/[^\d.-]/g, '')) || 0;
}

function formatNaira(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function compactNaira(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: value >= 1000000 ? 2 : 0,
  }).format(value);
}

function titleCaseStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildKpis(): KpiCard[] {
  const todaysOrders = adminOrders.filter((order) => order.date.startsWith('Today'));
  const activeDrivers = adminDrivers.filter((driver) => driver.status === 'ACTIVE');
  const revenueToday = todaysOrders.filter((order) => order.payment === 'PAID').reduce((sum, order) => sum + parseCurrency(order.price), 0);
  const pendingKyc = adminDrivers.filter((driver) => driver.kyc === 'SUBMITTED');

  return [
    { label: 'Orders today', value: String(todaysOrders.length), delta: `${adminOrders.length} total`, tone: 'primary' },
    { label: 'Active drivers', value: String(activeDrivers.length), delta: `${adminDrivers.length} onboarded`, tone: 'success' },
    { label: 'Paid revenue today', value: compactNaira(revenueToday), delta: `${todaysOrders.length} live orders`, tone: 'warning' },
    { label: 'Pending KYC', value: String(pendingKyc.length), delta: pendingKyc.length === 0 ? 'clear' : 'needs review', tone: 'muted' },
  ];
}

function buildRevenueSeries() {
  const paidOrders = adminOrders.filter((order) => order.payment === 'PAID');
  const totals = paidOrders.reduce<Record<string, number>>((acc, order) => {
    const day = order.date.split(',')[0];
    acc[day] = (acc[day] ?? 0) + parseCurrency(order.price);
    return acc;
  }, {});

  return Object.entries(totals).map(([day, value]) => ({ day, value }));
}

function buildStatusBreakdown() {
  const colors: Record<string, string> = {
    COMPLETED: 'hsl(var(--primary))',
    IN_TRANSIT: 'hsl(var(--success))',
    PENDING_MATCH: 'hsl(var(--warning))',
    DISPUTED: 'hsl(var(--destructive))',
  };
  const counts = adminOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([status, value]) => ({
    label: titleCaseStatus(status),
    value,
    color: colors[status] ?? 'hsl(var(--muted-foreground))',
  }));
}

export const walletStats = [
  {
    label: 'Platform balance',
    value: formatNaira(adminUsers.reduce((sum, user) => sum + parseCurrency(user.wallet), 0)),
    delta: `${adminUsers.length} wallets`,
  },
  {
    label: 'Commissions earned',
    value: formatNaira(adminWalletTransactions.filter((tx) => tx.category === 'COMMISSION').reduce((sum, tx) => sum + parseCurrency(tx.amount), 0)),
    delta: 'completed',
  },
  {
    label: 'Pending settlement',
    value: formatNaira(adminWalletTransactions.filter((tx) => tx.status === 'PENDING').reduce((sum, tx) => sum + parseCurrency(tx.amount), 0)),
    delta: 'open batch',
  },
  {
    label: 'Refund reserve',
    value: formatNaira(adminWalletTransactions.filter((tx) => tx.category === 'REFUND').reduce((sum, tx) => sum + parseCurrency(tx.amount), 0)),
    delta: 'disputes',
  },
];

export async function loadDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  return {
    kpis: buildKpis(),
    revenueSeries: buildRevenueSeries(),
    orderStatusBreakdown: buildStatusBreakdown(),
    recentOrders: adminOrders,
    driverRows: adminDrivers,
    userRows: adminUsers,
    notificationRows: adminNotifications,
    walletStats,
  };
}

export async function loadDashboardOrders() {
  return adminOrders;
}

export async function loadDashboardUsers() {
  return adminUsers;
}

export async function loadDashboardDrivers() {
  return adminDrivers;
}

export async function loadDashboardNotifications() {
  return adminNotifications;
}

export async function loadDashboardWalletTransactions() {
  return adminWalletTransactions;
}

export function getUserDetail(id: string) {
  const user = adminUsers.find((entry) => entry.id === id);
  if (!user) return null;

  const orders = adminOrders.filter((order) => order.userId === id);
  return {
    ...user,
    walletBalance: user.wallet,
    recentOrders: orders,
    supportNote: user.status === 'SUSPENDED' ? 'Account is paused pending review.' : 'Account is healthy and actively placing orders.',
    segments: ['Profile', 'Orders', 'Wallet'],
  };
}

export function getDriverDetail(id: string) {
  const driver = adminDrivers.find((entry) => entry.id === id);
  if (!driver) return null;

  const reviews = [
    { id: 'rev-1', user: 'Amina Bello', rating: '5.0', comment: 'Fast pickup and clear communication.' },
    { id: 'rev-2', user: 'Mariam Yusuf', rating: '4.8', comment: 'Delivered on time and handled the package carefully.' },
  ];

  const assignedOrders = adminOrders.filter((order) => order.driverId === id);
  return {
    ...driver,
    assignedOrders,
    reviews,
    kycDocuments: [
      { label: 'NIN', value: 'Verified' },
      { label: 'BVN', value: 'Verified' },
      { label: 'License', value: 'Uploaded' },
      { label: 'Selfie', value: 'Uploaded' },
      { label: 'Vehicle photo', value: 'Uploaded' },
    ],
  };
}

export function getOrderDetail(id: string) {
  const order = adminOrders.find((entry) => entry.id === id);
  if (!order) return null;

  return {
    ...order,
    riskLevel: order.status === 'DISPUTED' ? 'High' : 'Normal',
    customerNote: order.status === 'DISPUTED' ? 'Support escalation in progress.' : 'No incidents logged.',
  };
}

export function getDashboardHighlights() {
  return {
    kpis: buildKpis(),
    revenueSeries: buildRevenueSeries(),
    orderStatusBreakdown: buildStatusBreakdown(),
    recentOrders: adminOrders,
    driverRows: adminDrivers,
    userRows: adminUsers,
    notificationRows: adminNotifications,
    walletStats,
  };
}
