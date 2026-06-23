import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { subscribeToDriverLocation } from '@/lib/socket';
import type { OrderStatus } from '@/lib/order';
import { useEffect } from 'react';

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
  origin_location: TrackingLocation;
  destination_location: TrackingLocation;
  route_coordinates: TrackingLocation[];
  origin_hub: string;
  destination_hub: string;
  departed_at: string;
  distance_km: number;
  weight_kg: number;
  estimated_delivery: string;
}

export function useLiveTracking(orderId?: string, driverId?: string) {
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tracking', orderId],
    enabled: Boolean(orderId),
    // Poll every 30 seconds as a safety net; real-time updates come via socket below
    refetchInterval: isFocused ? 30_000 : false,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<TrackingData> => {
      const response = await http.get<{ data: TrackingData }>(`/api/v1/orders/${orderId}/tracking`);
      return response.data.data;
    },
  });

  // Subscribe to socket driver_location events and immediately patch the cached
  // TrackingData so the map marker moves without waiting for the next poll.
  useEffect(() => {
    if (!driverId || !orderId) return;

    const unsubscribe = subscribeToDriverLocation(driverId, (payload: { lat: number; lng: number }) => {
      if (!payload?.lat || !payload?.lng) return;

      queryClient.setQueryData<TrackingData>(['tracking', orderId], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_location: {
            latitude: payload.lat,
            longitude: payload.lng,
          },
        };
      });
    });

    return unsubscribe;
  }, [driverId, orderId, queryClient]);

  return query;
}
