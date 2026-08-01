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
  paymentProvider?: 'PAYSTACK' | 'MONNIFY' | 'SQUAD';
  dailyLimit?: number;
  dailyTransferUsage?: number;
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
  summary?: {
    totalCredits: number;
    totalDebits: number;
  };
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
export const discos = ['Eko', 'Ikeja', 'Abuja', 'Kano', 'Port Harcourt'] as const;

export const billTypes = [
  { key: 'airtime', label: 'Airtime', description: 'Top up any phone', href: '/(tabs)/wallet/airtime' as const },
  { key: 'data', label: 'Data', description: 'Bundles & plans', href: '/(tabs)/wallet/data' as const },
  { key: 'electricity', label: 'Electricity', description: 'Pay power bills', href: '/(tabs)/wallet/electricity' as const },
  { key: 'tv', label: 'Cable TV', description: 'Sub DStv, GOtv', href: '/(tabs)/wallet/tv' as const },
] as const;

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

export function formatTransactionTitle(
  description?: string | null,
  category?: string | null,
  type?: 'CREDIT' | 'DEBIT' | string | null,
  metadata?: Record<string, any> | null
): string {
  const desc = (description || '').trim();
  const descLower = desc.toLowerCase();
  const cat = (category || '').toUpperCase();

  if (
    cat === 'TOP_UP' ||
    descLower.includes('funding') ||
    descLower.includes('top up') ||
    descLower.includes('topup') ||
    descLower.includes('settlement')
  ) {
    if (descLower.includes('monnify')) return 'Wallet Top Up (Monnify)';
    if (descLower.includes('paystack')) return 'Wallet Top Up (Paystack)';
    if (descLower.includes('squad')) return 'Wallet Top Up (Squad)';
    return 'Wallet Top Up';
  }

  if (
    cat === 'TV' ||
    descLower.includes('subscription') ||
    descLower.includes('dstv') ||
    descLower.includes('gotv') ||
    descLower.includes('startimes') ||
    descLower.includes('showmax')
  ) {
    let brand = '';
    if (descLower.includes('dstv')) brand = 'DStv';
    else if (descLower.includes('gotv')) brand = 'GOtv';
    else if (descLower.includes('startimes')) brand = 'StarTimes';
    else if (descLower.includes('showmax')) brand = 'Showmax';

    let plan = '';
    if (descLower.includes('ppadi') || descLower.includes('padi')) plan = 'Padi';
    else if (descLower.includes('yanga')) plan = 'Yanga';
    else if (descLower.includes('confam')) plan = 'Confam';
    else if (descLower.includes('compact-plus')) plan = 'Compact Plus';
    else if (descLower.includes('compact')) plan = 'Compact';
    else if (descLower.includes('premium')) plan = 'Premium';
    else if (descLower.includes('jolli')) plan = 'Jolli';
    else if (descLower.includes('jinja')) plan = 'Jinja';

    if (brand && plan) return `${brand} ${plan} Subscription`;
    if (brand) return `${brand} Subscription`;
    return 'TV Subscription';
  }

  if (cat === 'DATA' || descLower.includes('data')) {
    let network = '';
    if (descLower.includes('etisalat') || descLower.includes('9mobile')) network = '9mobile';
    else if (descLower.includes('mtn')) network = 'MTN';
    else if (descLower.includes('airtel')) network = 'Airtel';
    else if (descLower.includes('glo')) network = 'Glo';

    if (network) return `${network} Data Plan`;
    return 'Data Plan';
  }

  if (cat === 'AIRTIME' || descLower.includes('airtime')) {
    let network = '';
    if (descLower.includes('etisalat') || descLower.includes('9mobile')) network = '9mobile';
    else if (descLower.includes('mtn')) network = 'MTN';
    else if (descLower.includes('airtel')) network = 'Airtel';
    else if (descLower.includes('glo')) network = 'Glo';

    if (network) return `${network} Airtime`;
    return 'Airtime Top Up';
  }

  if (cat === 'ELECTRICITY' || descLower.includes('electricity')) {
    let disco = '';
    if (descLower.includes('eko')) disco = 'Eko';
    else if (descLower.includes('ikeja')) disco = 'Ikeja';
    else if (descLower.includes('abuja')) disco = 'Abuja';
    else if (descLower.includes('kano')) disco = 'Kano';
    else if (descLower.includes('port harcourt') || descLower.includes('ph')) disco = 'Port Harcourt';

    if (disco) return `${disco} Electricity Bill`;
    return 'Electricity Bill';
  }

  if (descLower.includes('bank transfer') || descLower.includes('bank-transfer')) {
    if (metadata?.bankName) return `Bank Transfer (${metadata.bankName})`;
    return 'Bank Transfer';
  }

  if (cat === 'TRANSFER_IN' || descLower.includes('transfer from') || (cat === 'TRANSFER_OUT' && type === 'CREDIT')) {
    return 'Wallet Transfer Received';
  }

  if (cat === 'TRANSFER_OUT' || descLower.includes('transfer to') || descLower.includes('inter-app transfer')) {
    return 'Wallet Transfer';
  }

  if (cat === 'ORDER_PAYMENT' || descLower.includes('order payment')) {
    return 'Order Payment';
  }
  if (cat === 'ORDER_EARNING' || descLower.includes('order earning') || descLower.includes('driver order earning')) {
    return 'Driver Order Earning';
  }
  if (cat === 'REFUND' || descLower.includes('refund')) {
    return 'Order Refund';
  }
  if (cat === 'COMMISSION' || descLower.includes('commission')) {
    return 'Commission Fee';
  }

  if (!desc) return cat ? titleize(cat) : 'Transaction';

  return desc
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function safeBalance(balance?: number | null) {
  return Number(balance ?? 0);
}
