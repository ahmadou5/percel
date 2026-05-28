import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';
import type { ApiResponse, DriverProfile } from '@/lib/types';
import { useDriverStore } from '@/store/driver.store';

export function useDriverProfile() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['driver-profile'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await http.get<ApiResponse<DriverProfile>>('/api/v1/driver/profile');
      return response.data.data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { vehicleType: 'BIKE' | 'CAR' | 'VAN' | 'TRUCK'; vehiclePlate: string; vehicleModel: string }) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'driver.vehicle_profile_update_requested', level: 'info' });
      const response = await http.patch<ApiResponse<DriverProfile>>('/api/v1/driver/profile/vehicle', payload);
      return response.data.data;
    },
    onSuccess: async (profile) => {
      queryClient.setQueryData(['driver-profile'], profile);
      const current = useDriverStore.getState().driver;
      if (current) {
        useDriverStore.getState().setDriver({
          ...current,
          vehicleType: profile.vehicleType,
          vehiclePlate: profile.vehiclePlate,
          vehicleModel: profile.vehicleModel,
        });
      }
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'driver.password_change_requested', level: 'info' });
      const response = await http.post<ApiResponse<{ updated: boolean }>>('/api/v1/user/password', payload);
      return response.data.data;
    },
  });
}
