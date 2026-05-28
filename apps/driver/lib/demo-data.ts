import type { Driver } from '@percel/shared';

import type { DriverOrder, WalletDetails } from '@/lib/types';

export const demoLocation = {
  lat: 6.5244,
  lng: 3.3792,
};

export const demoDriver: Driver = {
  id: 'driver-demo',
  userId: 'user-demo',
  licenseNumber: 'LIC-004200',
  vehicleType: 'BIKE',
  vehiclePlate: 'LAG-482XY',
  vehicleModel: 'Bajaj Boxer',
  status: 'PENDING_KYC',
  rating: 4.9,
  totalDeliveries: 128,
  isOnline: false,
  currentLocation: demoLocation,
  createdAt: new Date('2026-01-12T08:00:00.000Z').toISOString(),
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export const demoOrders: DriverOrder[] = [
  {
    id: 'order-demo-1',
    trackingCode: 'TRK-91A2E3',
    status: 'MATCHED',
    paymentStatus: 'PAID',
    price: 4200,
    currency: 'NGN',
    size: 'SMALL',
    pickupFormattedAddress: '14 Musa Yar\'Adua Crescent, Lagos',
    deliveryFormattedAddress: '22 Admiralty Way, Lekki Phase 1, Lagos',
    distanceKm: 8.4,
    estimatedDurationMin: 31,
    createdAt: hoursAgo(2),
    driver: null,
  },
  {
    id: 'order-demo-2',
    trackingCode: 'TRK-72F9C1',
    status: 'ACCEPTED',
    paymentStatus: 'PAID',
    price: 6800,
    currency: 'NGN',
    size: 'MEDIUM',
    pickupFormattedAddress: '12 Airport Road, Ikeja',
    deliveryFormattedAddress: '18 Allen Avenue, Ikeja',
    distanceKm: 11.2,
    estimatedDurationMin: 36,
    createdAt: hoursAgo(7),
    driver: null,
  },
  {
    id: 'order-demo-3',
    trackingCode: 'TRK-AB18D4',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    price: 9200,
    currency: 'NGN',
    size: 'LARGE',
    pickupFormattedAddress: '40 Opebi Road, Lagos',
    deliveryFormattedAddress: '16 Bourdillon Road, Ikoyi, Lagos',
    distanceKm: 14.7,
    estimatedDurationMin: 47,
    createdAt: hoursAgo(26),
    driver: null,
  },
];

export const demoWallet: WalletDetails = {
  id: 'wallet-demo',
  userId: 'user-demo',
  balance: 324800,
  ledgerBalance: 341000,
  currency: 'NGN',
  nuban: '0101234567',
  bankName: 'Providus Bank',
  transactions: [
    {
      id: 'tx-demo-1',
      walletId: 'wallet-demo',
      amount: 9200,
      type: 'CREDIT',
      category: 'ORDER_EARNING',
      status: 'COMPLETED',
      reference: 'DRV-TRK-AB18D4',
      description: 'Delivery earning',
      metadata: {},
      createdAt: hoursAgo(26),
    },
    {
      id: 'tx-demo-2',
      walletId: 'wallet-demo',
      amount: 420,
      type: 'DEBIT',
      category: 'COMMISSION',
      status: 'COMPLETED',
      reference: 'COM-TRK-AB18D4',
      description: 'Platform commission',
      metadata: {},
      createdAt: hoursAgo(26),
    },
    {
      id: 'tx-demo-3',
      walletId: 'wallet-demo',
      amount: 6800,
      type: 'CREDIT',
      category: 'ORDER_EARNING',
      status: 'COMPLETED',
      reference: 'DRV-TRK-72F9C1',
      description: 'Accepted order payout',
      metadata: {},
      createdAt: hoursAgo(7),
    },
  ],
};

export const demoEarningsByDay = [
  { label: 'Mon', value: 8200 },
  { label: 'Tue', value: 12400 },
  { label: 'Wed', value: 5400 },
  { label: 'Thu', value: 17800 },
  { label: 'Fri', value: 9600 },
  { label: 'Sat', value: 21400 },
  { label: 'Sun', value: 15300 },
];
