export type WalletTransactionCategory =
  | 'TOP_UP'
  | 'ORDER_PAYMENT'
  | 'ORDER_EARNING'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'AIRTIME'
  | 'DATA'
  | 'ELECTRICITY'
  | 'TV'
  | 'COMMISSION'
  | 'REFUND';

export type WalletTransactionType = 'CREDIT' | 'DEBIT';
export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export type Wallet = {
  id: string;
  userId: string;
  balance: number;
  ledgerBalance: number;
  currency: 'NGN';
  nuban: string | null;
  bankName: string | null;
  bankCode?: string | null;
  kycComplete?: boolean;
};

export type WalletTransaction = {
  id: string;
  walletId: string;
  amount: number;
  type: WalletTransactionType;
  category: WalletTransactionCategory;
  status: WalletTransactionStatus;
  reference: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
};

export type WalletDetails = Wallet & {
  walletPinSet: boolean;
  transactions?: WalletTransaction[];
};

export type WalletTransactionsResponse = {
  data: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WalletApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
  errors: Array<{ code?: string; message: string; field?: string }>;
};

export type WalletTransactionsQuery = {
  category?: string;
  page?: number;
  limit?: number;
};

export type ProviderService = {
  serviceID: string;
  name: string;
  minimium_amount?: string;
  maximum_amount?: string;
  product_type?: string;
  image?: string;
  logo?: string | null;
  logoUrl?: string | null;
};

export type ProviderVariation = {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice?: string;
};

export type ProviderValidation = {
  Customer_Name?: string;
  Address?: string;
  Meter_Number?: string;
  MeterNumber?: string;
  Account_Number?: string;
  Can_Vend?: string;
  Meter_Type?: string;
  WrongBillersCode?: boolean;
  Min_Purchase_Amount?: number | string;
  Customer_Account_Type?: string;
};

export type BankDirectoryItem = {
  name: string;
  code: string;
  slug?: string | null;
  longcode?: string | null;
  country?: string | null;
  currency?: string | null;
  type?: string | null;
};

export const walletCategories = [
  { key: 'ALL', label: 'All', tone: 'muted' as const },
  { key: 'TOP_UP', label: 'Top up', tone: 'success' as const },
  { key: 'ORDER_PAYMENT', label: 'Orders', tone: 'danger' as const },
  { key: 'ORDER_EARNING', label: 'Earnings', tone: 'primary' as const },
  { key: 'TRANSFER_IN', label: 'Sent to me', tone: 'success' as const },
  { key: 'TRANSFER_OUT', label: 'Sent out', tone: 'danger' as const },
  { key: 'AIRTIME', label: 'Airtime', tone: 'warning' as const },
  { key: 'DATA', label: 'Data', tone: 'warning' as const },
  { key: 'ELECTRICITY', label: 'Electricity', tone: 'warning' as const },
  { key: 'TV', label: 'TV', tone: 'warning' as const },
  { key: 'REFUND', label: 'Refunds', tone: 'success' as const },
  { key: 'COMMISSION', label: 'Commission', tone: 'primary' as const },
] as const;

export const telecomNetworks = ['MTN', 'Airtel', 'Glo', '9mobile'] as const;

export const billTypes = [
  { key: 'airtime', label: 'Airtime', description: 'Top up any phone', href: '/wallet/airtime' as const },
  { key: 'data', label: 'Data', description: 'Bundles and plans', href: '/wallet/data' as const },
  { key: 'electricity', label: 'Electricity', description: 'Pay power bills', href: '/wallet/electricity' as const },
] as const;

export const dataPlans = [
  { label: 'Daily', value: 'daily', amount: 300 },
  { label: 'Weekly', value: 'weekly', amount: 1200 },
  { label: 'Monthly', value: 'monthly', amount: 5000 },
  { label: 'Family', value: 'family', amount: 10000 },
] as const;

export const discos = ['Eko', 'Ikeja', 'Abuja', 'Kano', 'Port Harcourt'] as const;

export function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function formatTxnDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function titleize(value: string) {
  if (value === 'TV') return 'TV';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function safeBalance(balance?: number | null) {
  return Number(balance ?? 0);
}

export function buildSearchPreview(phone: string) {
  const compact = phone.replace(/\D/g, '');
  if (!compact) return 'Recipient preview will appear here.';
  return `${compact.slice(0, 4)} ${compact.slice(4, 7)} ${compact.slice(7, 11)}`.trim();
}
