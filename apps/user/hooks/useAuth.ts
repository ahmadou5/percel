import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { persistUser, useAuthStore } from '@/store/auth.store';
import { Sentry } from '@/lib/sentry';

type AuthTokens = { accessToken: string; refreshToken: string };
type AuthUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
};

type AuthResponse = {
  data: {
    user?: AuthUser;
    tokens?: AuthTokens;
    requiresVerification?: boolean;
    phone?: string;
    message?: string;
  };
};

async function persistSession(data: AuthResponse['data']) {
  if (data.tokens && data.user) {
    await useAuthStore.getState().setTokens(data.tokens);
    useAuthStore.getState().setUser(data.user);
    useAuthStore.getState().unlock();
    await persistUser(data.user);
    Sentry.addBreadcrumb({ category: 'auth', message: 'auth.session_created', level: 'info', data: { userId: data.user.id } });
  }
}

export function useLogin(
  options?: UseMutationOptions<AuthResponse, Error, { identifier: string; password: string }> & {
    onRequiresVerification?: (phone: string) => void;
  },
) {
  const { onSuccess: userOnSuccess, onRequiresVerification, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: { identifier: string; password: string }) => {
      const response = await http.post<AuthResponse>('/api/v1/auth/login', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      if (data.data.requiresVerification && data.data.phone) {
        onRequiresVerification?.(data.data.phone);
        return;
      }
      await persistSession(data.data);
      await userOnSuccess?.(data, vars, onMutateResult, ctx);
    },
  });
}

export function useRegister(
  options?: UseMutationOptions<
    AuthResponse,
    Error,
    { email: string; phone: string; password: string; fullName: string; referralCode?: string }
  > & {
    onRequiresVerification?: (phone: string) => void;
  },
) {
  const { onSuccess: userOnSuccess, onRequiresVerification, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: {
      email: string;
      phone: string;
      password: string;
      fullName: string;
      referralCode?: string;
    }) => {
      const response = await http.post<AuthResponse>('/api/v1/auth/register', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      if (data.data.requiresVerification && data.data.phone) {
        onRequiresVerification?.(data.data.phone);
        return;
      }
      await persistSession(data.data);
      await userOnSuccess?.(data, vars, onMutateResult, ctx);
    },
  });
}

export function useVerifyOTP(
  options?: UseMutationOptions<AuthResponse, Error, { phone: string; otp: string }> & {
    onVerified?: () => void;
  },
) {
  const { onSuccess: userOnSuccess, onVerified, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: { phone: string; otp: string }) => {
      const response = await http.post<AuthResponse>('/api/v1/auth/verify-otp', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      await persistSession(data.data);
      onVerified?.();
      await userOnSuccess?.(data, vars, onMutateResult, ctx);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (identifier: string) =>
      http.post('/api/v1/auth/forgot-password', { identifier }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; newPassword: string }) =>
      http.post('/api/v1/auth/reset-password', payload),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => http.post('/api/v1/auth/logout'),
    onSettled: async () => {
      Sentry.addBreadcrumb({ category: 'auth', message: 'auth.logout', level: 'info' });
      await useAuthStore.getState().logout();
    },
  });
}

export function useRefreshToken() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().tokens?.refreshToken;
      if (!refreshToken) throw new Error('No refresh token');
      const response = await http.post<AuthTokens>('/api/v1/auth/refresh', {
        refreshToken,
      });
      return response.data;
    },
    onSuccess: async (tokens) => {
      await useAuthStore.getState().setTokens(tokens as unknown as AuthTokens);
    },
  });
}
