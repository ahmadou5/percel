export type KpiCard = {
  label: string;
  value: string;
  delta: string;
  tone: 'primary' | 'success' | 'warning' | 'muted';
};

export type OrderRow = {
  trackingCode: string;
  user: string;
  driver: string;
  status: string;
  price: string;
  date: string;
};

export type DriverRow = {
  name: string;
  status: string;
  kyc: string;
  rating: string;
  vehicle: string;
};

export type NotificationRow = {
  channel: string;
  title: string;
  body: string;
  sentAt: string;
};

export const kpis: KpiCard[] = [
  { label: 'Total orders today', value: '248', delta: '+14%', tone: 'primary' },
  { label: 'Active drivers', value: '37', delta: '+6', tone: 'success' },
  { label: 'Revenue today', value: '₦1.84M', delta: '+9.2%', tone: 'warning' },
  { label: 'Pending KYC', value: '12', delta: '-3', tone: 'muted' },
];

export const orderStatusBreakdown = [
  { label: 'Completed', value: 56, color: 'var(--primary)' },
  { label: 'In transit', value: 18, color: 'var(--success)' },
  { label: 'Pending match', value: 14, color: 'var(--warning)' },
  { label: 'Disputed', value: 12, color: 'var(--destructive)' },
];

export const revenueSeries = [
  { day: 'Mon', value: 220000 },
  { day: 'Tue', value: 280000 },
  { day: 'Wed', value: 310000 },
  { day: 'Thu', value: 260000 },
  { day: 'Fri', value: 360000 },
  { day: 'Sat', value: 430000 },
  { day: 'Sun', value: 410000 },
];

export const recentOrders: OrderRow[] = [
  { trackingCode: 'PCL-19AX2FQ', user: 'Amina Bello', driver: 'Chinedu Okafor', status: 'IN_TRANSIT', price: '₦12,400', date: 'Today, 09:12' },
  { trackingCode: 'PCL-4KQ2J9M', user: 'Tobi Adeyemi', driver: 'Unassigned', status: 'PENDING_MATCH', price: '₦7,900', date: 'Today, 08:47' },
  { trackingCode: 'PCL-7QPD8LM', user: 'Mariam Yusuf', driver: 'Ngozi Umeh', status: 'COMPLETED', price: '₦19,000', date: 'Today, 08:03' },
  { trackingCode: 'PCL-2JX5ZCN', user: 'David Eze', driver: 'Ibrahim Sani', status: 'DISPUTED', price: '₦5,200', date: 'Yesterday' },
];

export const driverRows: DriverRow[] = [
  { name: 'Chinedu Okafor', status: 'ACTIVE', kyc: 'APPROVED', rating: '4.9', vehicle: 'VAN · KJA-482XY' },
  { name: 'Ngozi Umeh', status: 'ACTIVE', kyc: 'APPROVED', rating: '4.8', vehicle: 'CAR · LAG-193PQ' },
  { name: 'Ibrahim Sani', status: 'PENDING', kyc: 'SUBMITTED', rating: '4.6', vehicle: 'BIKE · FCT-812RT' },
  { name: 'Aisha Bello', status: 'SUSPENDED', kyc: 'REJECTED', rating: '4.2', vehicle: 'TRUCK · KAD-220XE' },
];

export const notificationRows: NotificationRow[] = [
  { channel: 'All users', title: 'Weekend delivery promo', body: 'Free wallet top-up fee for the first 100 orders.', sentAt: '2 hours ago' },
  { channel: 'Drivers', title: 'Hot zones updated', body: 'High-demand pickup areas are now active in Lagos Island.', sentAt: 'Yesterday' },
  { channel: 'Specific user', title: 'Refund processed', body: 'Order PCL-2JX5ZCN refund completed.', sentAt: 'Yesterday' },
];

export const walletStats = [
  { label: 'Platform balance', value: '₦8.42M', delta: '+11%' },
  { label: 'Commissions earned', value: '₦1.21M', delta: '+8%' },
  { label: 'Pending settlement', value: '₦412K', delta: '-4%' },
  { label: 'Refund reserve', value: '₦95K', delta: 'stable' },
];
