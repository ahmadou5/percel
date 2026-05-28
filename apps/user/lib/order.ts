export type OrderAddress = {
  street: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
};

export type OrderItem = {
  description: string;
  quantity: number;
  weightKg: number;
  fragile: boolean;
};

export type OrderSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type OrderStatus = 'CREATED' | 'PENDING_MATCH' | 'MATCHED' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type OrderDraft = {
  pickupAddress: string;
  deliveryAddress: string;
  size: OrderSize;
  fragile: boolean;
  items: OrderItem[];
  notes: string;
};

export type OrderSummary = {
  id: string;
  userId: string;
  driverId: string | null;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  size: OrderSize;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  price: number;
  currency: string;
  distanceKm: number;
  estimatedDurationMin: number;
  trackingCode: string;
  createdAt: string;
  driver?: {
    id: string;
    userId: string;
    fullName: string;
    rating: number;
    vehicleType: string;
    vehicleModel: string;
    vehiclePlate: string;
    isOnline: boolean;
  } | null;
};

export type Order = OrderSummary;

export type OrderQuoteResponse = {
  size: OrderSize;
  distanceKm: number;
  durationMin: number;
  basePrice: number;
  distanceMultiplier: number;
  surgeMultiplier: number;
  totalPrice: number;
  currency: 'NGN';
  breakdown: {
    sizeLabel: string;
    distanceBand: string;
    surgeApplied: boolean;
  };
};

export type OrderRatingResponse = {
  id: string;
  orderId: string;
  userRating: number;
  userComment: string | null;
  driverRating: number | null;
  driverComment: string | null;
  createdAt: string;
};

export type OrderRateResult = {
  order: OrderSummary;
  rating: OrderRatingResponse;
  driverAverageRating: number;
  driverRatingCount: number;
};

export type OrderListResponse = {
  data: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type OrderDetailResponse = OrderSummary & {
  items: OrderItem[];
  statusHistory: Array<{
    id: string;
    status: OrderStatus;
    note: string | null;
    lat: number | null;
    lng: number | null;
    createdAt: string;
  }>;
  rating: OrderRatingResponse | null;
};

export type TrackingResponse = OrderDetailResponse;

export const orderSizes: Array<{
  size: OrderSize;
  label: string;
  weightRange: string;
  basePriceHint: string;
}> = [
  { size: 'SMALL', label: 'Small', weightRange: '< 5kg', basePriceHint: 'Starts around ₦500' },
  { size: 'MEDIUM', label: 'Medium', weightRange: '5 - 20kg', basePriceHint: 'Starts around ₦1,200' },
  { size: 'LARGE', label: 'Large', weightRange: '> 20kg', basePriceHint: 'Starts around ₦2,500' },
];

export function formatMoney(value: number) {
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function formatDistance(value: number) {
  return `${value.toFixed(1)} km`;
}

export function formatDuration(value: number) {
  if (value < 60) return `${Math.max(1, Math.round(value))} min`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
