export type OrderStatus =
  | 'CREATED'
  | 'PENDING_MATCH'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type OrderSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
}

export interface OrderItem {
  description: string;
  quantity: number;
  weightKg: number;
  fragile: boolean;
}

export interface Order {
  id: string;
  userId: string;
  driverId: string | null;
  pickupAddress: Address;
  deliveryAddress: Address;
  size: OrderSize;
  items: OrderItem[];
  status: OrderStatus;
  price: number;
  distance: number;
  estimatedDuration: number;
  trackingCode: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note: string;
  timestamp: string;
}

export interface PriceQuote {
  size: OrderSize;
  distance: number;
  basePrice: number;
  distanceMultiplier: number;
  totalPrice: number;
  currency: string;
}
