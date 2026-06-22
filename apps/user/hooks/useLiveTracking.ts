import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { http } from '@/lib/api';
import type { OrderStatus } from '@/lib/order';

export type TrackingLocation = {
  latitude: number;
  longitude: number;
};

export interface TrackingData {
  status: OrderStatus;
  driver: {
    id: string;
    name: string;
    avatar_url: string | null;
    phone: string;
  };
  current_location: TrackingLocation | null;
  destination_location: TrackingLocation;
  route_coordinates: TrackingLocation[];
  origin_hub: string;
  destination_hub: string;
  departed_at: string;
  distance_km: number;
  weight_kg: number;
  estimated_delivery: string;
}

function createMockTracking(): TrackingData {
  const driverLocation = { latitude: 6.5244, longitude: 3.3792 };
  const destinationLocation = { latitude: 6.6018, longitude: 3.3515 };

  return {
    status: 'IN_TRANSIT',
    driver: {
      id: 'mock-driver',
      name: 'Percel Driver',
      avatar_url: null,
      phone: '',
    },
    current_location: driverLocation,
    destination_location: destinationLocation,
    route_coordinates: [
      driverLocation,
      { latitude: 6.545, longitude: 3.371 },
      { latitude: 6.567, longitude: 3.362 },
      { latitude: 6.584, longitude: 3.356 },
      destinationLocation,
    ],
    origin_hub: 'Origin hub',
    destination_hub: 'Destination hub',
    departed_at: new Date().toISOString(),
    distance_km: 8.4,
    weight_kg: 2.5,
    estimated_delivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  };
}

export function useLiveTracking(orderId?: string) {
  const isFocused = useIsFocused();

  return useQuery({
    queryKey: ['tracking', orderId],
    enabled: Boolean(orderId),
    refetchInterval: isFocused ? 10_000 : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      try {
        // TODO: wire to real endpoint once the API exposes live tracking payloads.
        const response = await http.get<{ data: TrackingData }>(`/api/v1/orders/${orderId}/tracking`);
        return response.data.data;
      } catch (error) {
        if (axios.isAxiosError(error) && [404, 501].includes(error.response?.status ?? 0)) {
          return createMockTracking();
        }
        throw error;
      }
    },
  });
}
