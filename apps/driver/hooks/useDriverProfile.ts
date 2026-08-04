import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { VehicleType } from '@percel/shared';

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
    mutationFn: async (payload: { vehicleType: VehicleType; vehiclePlate: string; vehicleModel: string }) => {
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

export function useUpdateAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'driver.avatar_update_requested', level: 'info' });
      const response = await http.post<ApiResponse<{ avatarUrl: string }>>('/api/v1/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData<DriverProfile | undefined>(['driver-profile'], (current) =>
        current ? { ...current, avatarUrl: data.avatarUrl } : current,
      );
      const store = useDriverStore.getState();
      if (store.user) {
        store.setUser({ ...store.user, avatarUrl: data.avatarUrl });
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

export function useToggleOnlineStatus() {
  const setOnlineStatus = useDriverStore((s) => s.setOnlineStatus);

  return useMutation({
    mutationFn: async (payload: { isOnline: boolean; lat?: number; lng?: number }) => {
      Sentry.addBreadcrumb({
        category: 'driver',
        message: payload.isOnline ? 'driver.going_online' : 'driver.going_offline',
        level: 'info',
        data: { lat: payload.lat, lng: payload.lng },
      });
      const response = await http.patch<ApiResponse<{ isOnline: boolean }>>('/api/v1/driver/status', payload);
      return response.data.data;
    },
    onSuccess: async (data) => {
      // Sync local store with backend-confirmed state
      await setOnlineStatus(data.isOnline);
    },
    onError: async (_err, variables) => {
      // Revert the optimistic local update if the API call failed
      await setOnlineStatus(!variables.isOnline);
    },
  });
}

// ── In-app Verification ───────────────────────────────────────────────────────

export function useRequestEmailVerification() {
  return useMutation({
    mutationFn: async () => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'driver.email_verify_requested', level: 'info' });
      const response = await http.post<ApiResponse<{ sent: boolean }>>('/api/v1/auth/email/verify/request');
      return response.data.data;
    },
  });
}

export function useConfirmEmailVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otp: string) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'driver.email_verify_confirmed', level: 'info' });
      const response = await http.post<ApiResponse<{ verified: boolean }>>('/api/v1/auth/email/verify/confirm', { otp });
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      const store = useDriverStore.getState();
      if (store.user) {
        const nextUser = { ...store.user, emailVerified: true };
        await store.setUser(nextUser);
      }
    },
  });
}

export function useRequestPhoneVerification() {
  return useMutation({
    mutationFn: async () => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'driver.phone_verify_requested', level: 'info' });
      const response = await http.post<ApiResponse<{ sent: boolean }>>('/api/v1/auth/phone/verify/request');
      return response.data.data;
    },
  });
}

export function useConfirmPhoneVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otp: string) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'driver.phone_verify_confirmed', level: 'info' });
      const response = await http.post<ApiResponse<{ verified: boolean }>>('/api/v1/auth/phone/verify/confirm', { otp });
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      const store = useDriverStore.getState();
      if (store.user) {
        const nextUser = { ...store.user, phoneVerified: true };
        await store.setUser(nextUser);
      }
    },
  });
}

export function useVerifyDriverBvn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      bvn: string;
      accountNumber?: string;
      bankCode?: string;
      firstName?: string;
      lastName?: string;
    }) => {
      Sentry.addBreadcrumb({ category: 'kyc', message: 'driver.bvn_verify_requested', level: 'info' });
      const response = await http.post<ApiResponse<{
        verified: boolean;
        message?: string;
        virtualAccount?: { accountNumber: string; bankName: string; accountName: string };
      }>>('/api/v1/driver/kyc/verify-bvn', payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useSubmitVehicleVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      vehicleType: 'BIKE' | 'TRICYCLE' | 'CAR';
      vehiclePlate: string;
      vehicleModel: string;
      licenseImageUrl?: string;
      selfieUrl?: string;
      vehicleImageUrl?: string;
    }) => {
      Sentry.addBreadcrumb({ category: 'kyc', message: 'driver.vehicle_verification_submitted', level: 'info' });
      const response = await http.post<ApiResponse<DriverProfile>>('/api/v1/driver/vehicle-verification', payload);
      return response.data.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(['driver-profile'], data);
      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
  });
}
