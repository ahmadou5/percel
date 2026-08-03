import type { Driver, VehicleType } from '@percel/shared';
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

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

async function persistDriverSession(session: AuthResponse) {
  if (session.tokens && session.user) {
    const setSession = useDriverStore.getState().setSession;
    await setSession({ user: session.user, tokens: session.tokens });
    await fetchAndStoreDriverProfile();
  }
}

export function useLogin(
  options?: UseMutationOptions<ApiResponse<AuthResponse>, Error, { identifier: string; password: string }> & {
    onRequiresVerification?: (phone: string) => void;
  }
) {
  const { onSuccess, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: { identifier: string; password: string }) => {
      const response = await http.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      const session = data.data;
      await persistDriverSession(session);
      await onSuccess?.(data, vars, onMutateResult, ctx);
    }
  });
}

export function useRegisterDriver(
  options?: UseMutationOptions<ApiResponse<AuthResponse>, Error, {
    email: string;
    phone: string;
    password: string;
    fullName: string;
    vehicleType: VehicleType;
    vehiclePlate: string;
    vehicleModel: string;
    licenseNumber: string;
  }> & {
    onRequiresVerification?: (phone: string) => void;
  }
) {
  const { onSuccess, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: {
      email: string;
      phone: string;
      password: string;
      fullName: string;
      vehicleType: VehicleType;
      vehiclePlate: string;
      vehicleModel: string;
      licenseNumber: string;
    }) => {
      const response = await http.post<ApiResponse<AuthResponse>>('/api/v1/auth/register/driver', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      const session = data.data;
      await persistDriverSession(session);
      await onSuccess?.(data, vars, onMutateResult, ctx);
    }
  });
}

export function useVerifyOTP(
  options?: UseMutationOptions<ApiResponse<AuthResponse>, Error, { email?: string; phone?: string; otp: string }> & {
    onVerified?: () => void;
  }
) {
  const { onSuccess, onVerified, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: { email?: string; phone?: string; otp: string }) => {
      const response = await http.post<ApiResponse<AuthResponse>>('/api/v1/auth/verify-otp', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      await persistDriverSession(data.data);
      onVerified?.();
      await onSuccess?.(data, vars, onMutateResult, ctx);
    }
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (identifier: string) =>
      http.post<ApiResponse<{ accepted: boolean }>>('/api/v1/auth/forgot-password', { identifier }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; newPassword: string }) =>
      http.post<ApiResponse<{ accepted: boolean }>>('/api/v1/auth/reset-password', payload),
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
