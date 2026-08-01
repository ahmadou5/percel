export type ApiError = {
  code: string;
  message: string;
  field?: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
  errors: ApiError[];
};

export type AuthSessionUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user?: AuthSessionUser;
  tokens?: AuthTokens;
  requiresVerification?: boolean;
  phone?: string;
  email?: string;
  message?: string;
};

export type DriverOrderStatus =
  | 'CREATED'
  | 'PENDING_MATCH'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type DriverOrderSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export type DriverOrderDriver = {
  id: string;
  userId: string;
  fullName: string;
  rating: number;
  vehicleType: string;
  vehicleModel: string;
  vehiclePlate: string;
  isOnline: boolean;
};

export type DriverOrderCustomer = {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
};

export type DriverOrder = {
  id: string;
  trackingCode: string;
  status: DriverOrderStatus;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  price: number;
  currency: string;
  size: DriverOrderSize;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  notes?: string | null;
  distanceKm: number;
  estimatedDurationMin: number;
  createdAt: string;
  driver?: DriverOrderDriver | null;
  customer?: DriverOrderCustomer | null;
  items?: Array<{ description: string; quantity: number; weightKg?: number; fragile?: boolean; imageUrl?: string | null }>;
};

export type WalletTransaction = {
  id: string;
  walletId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  category:
    | 'TOP_UP'
    | 'ORDER_PAYMENT'
    | 'ORDER_EARNING'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'AIRTIME'
    | 'DATA'
    | 'ELECTRICITY'
    | 'COMMISSION'
    | 'REFUND';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  reference: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WalletDetails = {
  id: string;
  userId: string;
  balance: number;
  ledgerBalance: number;
  currency: 'NGN';
  nuban: string | null;
  bankName: string | null;
  transactions: WalletTransaction[];
};

export type DriverKycSummary = {
  id: string;
  ninNumber: string;
  bvnNumber: string;
  licenseImageUrl: string | null;
  selfieUrl: string | null;
  vehicleImageUrl: string | null;
  smileJobId: string | null;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

export type DriverProfile = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status: 'PENDING_KYC' | 'KYC_SUBMITTED' | 'ACTIVE' | 'SUSPENDED' | 'OFFLINE' | 'ONLINE';
  kycStatus: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  vehicleType: 'BIKE' | 'CAR' | 'VAN' | 'TRUCK';
  vehiclePlate: string;
  vehicleModel: string;
  licenseNumber: string;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationAt: string | null;
  memberSince: string;
  kyc: DriverKycSummary;
  stats: {
    totalDeliveries: number;
    rating: number;
    memberSince: string;
  };
};
