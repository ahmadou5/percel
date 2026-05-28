import type { Address, OrderSize, OrderStatus } from './order.types';

export interface DriverLocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  message: string;
  timestamp: string;
}

export interface NewOrderAvailable {
  orderId: string;
  pickupAddress: Address;
  deliveryAddress: Address;
  size: OrderSize;
  price: number;
  distance: number;
}

export enum SocketEvents {
  DRIVER_LOCATION_UPDATE = 'driver:location:update',
  ORDER_STATUS_UPDATE = 'order:status:update',
  NEW_ORDER_AVAILABLE = 'order:new:available',
  ORDER_ACCEPTED = 'order:accepted',
  ORDER_REJECTED = 'order:rejected',
  ORDER_ASSIGNED = 'order:assigned',
  ORDER_DELIVERED = 'order:delivered',
  WALLET_UPDATED = 'wallet:updated',
  NOTIFICATION = 'notification:new',
}
