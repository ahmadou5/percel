export type OrderStatus =
  | 'CREATED'
  | 'PENDING_MATCH'
  | 'MATCHED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderStatusHistoryItem {
  id: string;
  status: OrderStatus;
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
}

export interface DriverDetails {
  id: string;
  userId?: string;
  fullName: string;
  rating: number;
  vehicleType: string;
  vehicleModel?: string | null;
  vehiclePlate?: string | null;
  isOnline: boolean;
}

export interface CustomerDetails {
  id: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface TrackedOrder {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  price: number;
  currency: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'BULK';
  deliveryType: 'INTRASTATE' | 'INTERSTATE';
  courierLat?: number | null;
  courierLng?: number | null;
  etaMinutes?: number | null;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  distanceKm: number;
  estimatedDurationMin?: number | null;
  createdAt: string;
  cancelReason?: string | null;
  notes?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  driver?: DriverDetails | null;
  customer?: CustomerDetails | null;
  statusHistory?: OrderStatusHistoryItem[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://percelapi-production.up.railway.app';

export async function fetchTrackedOrder(trackingCode: string): Promise<TrackedOrder> {
  const cleanCode = trackingCode.trim().toUpperCase();
  const url = `${API_BASE_URL}/orders/track/${encodeURIComponent(cleanCode)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Order #${cleanCode} was not found. Please check your Order ID or Tracking Code.`);
    }
    throw new Error(`Unable to fetch tracking data (HTTP ${res.status}). Please try again.`);
  }

  const json = await res.json();

  // If Fastify wraps in data object
  const data = json.data ?? json;

  return data as TrackedOrder;
}
