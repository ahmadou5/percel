import type { Driver } from '@percel/shared';
import { useMutation } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { demoDriver, demoLocation } from '@/lib/demo-data';
import type { ApiResponse, AuthResponse } from '@/lib/types';
import { useDriverStore } from '@/store/driver.store';

export function useLogin() {
  const setSession = useDriverStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (payload: { identifier: string; password: string }) => {
      const response = await http.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', payload);
      return response.data.data;
    },
    onSuccess: async (session) => {
      await setSession(session);
    },
  });
}

export function useRegisterDriver() {
  const setSession = useDriverStore((state) => state.setSession);
  const setDriver = useDriverStore((state) => state.setDriver);

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      phone: string;
      password: string;
      fullName: string;
      vehicleType: 'BIKE' | 'CAR' | 'VAN' | 'TRUCK';
      vehiclePlate: string;
      vehicleModel: string;
      licenseNumber: string;
    }) => {
      const response = await http.post<ApiResponse<AuthResponse>>('/api/v1/auth/register/driver', payload);
      return { ...response.data.data, payload };
    },
    onSuccess: async ({ user, tokens, payload }) => {
      const driver: Driver = {
        ...demoDriver,
        id: `driver-${user.id}`,
        userId: user.id,
        vehicleType: payload.vehicleType,
        vehiclePlate: payload.vehiclePlate,
        vehicleModel: payload.vehicleModel,
        licenseNumber: payload.licenseNumber,
        currentLocation: demoLocation,
        status: 'PENDING_KYC',
        isOnline: false,
      };

      await setSession({ user, tokens, driver });
      await setDriver(driver);
    },
  });
}

export function useLogout() {
  const logout = useDriverStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      await http.post<ApiResponse<{ loggedOut: boolean }>>('/api/v1/auth/logout');
    },
    onSettled: async () => {
      await logout();
    },
  });
}
