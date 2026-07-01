import type { Driver } from '@percel/shared';
import { useMutation } from '@tanstack/react-query';

import { http } from '@/lib/api';
import type { ApiResponse, AuthResponse, DriverProfile } from '@/lib/types';
import { useDriverStore } from '@/store/driver.store';

function driverFromProfile(profile: DriverProfile): Driver {
  return {
    id: profile.id,
    userId: profile.userId,
    licenseNumber: profile.licenseNumber,
    vehicleType: profile.vehicleType,
    vehiclePlate: profile.vehiclePlate,
    vehicleModel: profile.vehicleModel,
    status: profile.status,
    rating: profile.rating,
    totalDeliveries: profile.totalDeliveries,
    isOnline: profile.isOnline,
    currentLocation: {
      lat: profile.currentLat ?? 0,
      lng: profile.currentLng ?? 0,
    },
    createdAt: profile.memberSince,
  };
}

async function fetchAndStoreDriverProfile() {
  const response = await http.get<ApiResponse<DriverProfile>>('/api/v1/driver/profile');
  const driver = driverFromProfile(response.data.data);
  useDriverStore.getState().setDriver(driver);
  return driver;
}

export function useLogin() {
  const setSession = useDriverStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (payload: { identifier: string; password: string }) => {
      const response = await http.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', payload);
      const session = response.data.data;
      await setSession(session);
      const driver = await fetchAndStoreDriverProfile();
      return { ...session, driver };
    },
  });
}

export function useRegisterDriver() {
  const setSession = useDriverStore((state) => state.setSession);

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
      const session = response.data.data;
      await setSession(session);
      const driver = await fetchAndStoreDriverProfile();
      return { ...session, driver };
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
