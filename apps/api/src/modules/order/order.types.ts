import type { OrderSize, OrderStatus, PaymentStatus } from '@prisma/client';

export interface AddressInput {
  street: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
}

export interface OrderItemInput {
  description: string;
  quantity: number;
  weightKg: number;
  fragile?: boolean;
  imageUrl?: string | null;
}

export interface OrderQuote {
  size: OrderSize;
  distanceKm: number;
  durationMin: number;
  basePrice: number;
  distanceMultiplier: number;
  surgeMultiplier: number;
  totalPrice: number;
  currency: 'NGN';
  deliveryType?: 'INTERSTATE' | 'INTRASTATE';
  breakdown: {
    sizeLabel: string;
    distanceBand: string;
    surgeApplied: boolean;
  };
}

export interface OrderSummary {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  price: number;
  currency: string;
  size: OrderSize;
  deliveryType?: 'INTERSTATE' | 'INTRASTATE';
  courierLat?: number | null;
  courierLng?: number | null;
  etaMinutes?: number | null;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  distanceKm: number;
  estimatedDurationMin: number;
  createdAt: string;
  cancelReason?: string | null;
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
  customer?: {
    id: string;
    fullName: string;
    phone: string;
    avatarUrl: string | null;
  } | null;
}

export interface OrderRatingResponse {
  id: string;
  orderId: string;
  userRating: number;
  userComment: string | null;
  driverRating: number | null;
  driverComment: string | null;
  createdAt: string;
}

export interface OrderRateResult {
  order: OrderSummary;
  rating: OrderRatingResponse;
  driverAverageRating: number;
  driverRatingCount: number;
}
