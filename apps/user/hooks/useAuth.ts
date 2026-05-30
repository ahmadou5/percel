import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { persistUser, useAuthStore } from '@/store/auth.store';
import { Sentry } from '@/lib/sentry';

type AuthResponse = {
  data: {
    user: { id: string; email: string; phone: string; fullName: string; avatarUrl?: string | null; dateOfBirth?: string | null; address?: string | null };
    tokens: { accessToken: string; refreshToken: string };
  };
};

export function useLogin(
  options?: UseMutationOptions<AuthResponse, Error, { identifier: string; password: string }>,
) {
  const { onSuccess: userOnSuccess, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: { identifier: string; password: string }) => {
      const response = await http.post<AuthResponse>('/api/v1/auth/login', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      await useAuthStore.getState().setTokens(data.data.tokens);
      useAuthStore.getState().setUser(data.data.user);
      useAuthStore.getState().unlock();
      await persistUser(data.data.user);
      Sentry.addBreadcrumb({ category: 'auth', message: 'auth.register_success', level: 'info', data: { userId: data.data.user.id } });
      Sentry.addBreadcrumb({ category: 'auth', message: 'auth.login_success', level: 'info', data: { userId: data.data.user.id } });
      await userOnSuccess?.(data, vars, onMutateResult, ctx);
    },
  });
}

export function useRegister(
  options?: UseMutationOptions<
    AuthResponse,
    Error,
    { email: string; phone: string; password: string; fullName: string }
  >,
) {
  const { onSuccess: userOnSuccess, ...mutationOptions } = options ?? {};
  return useMutation({
    ...mutationOptions,
    mutationFn: async (payload: {
      email: string;
      phone: string;
      password: string;
      fullName: string;
    }) => {
      const response = await http.post<AuthResponse>('/api/v1/auth/register', payload);
      return response.data;
    },
    onSuccess: async (data, vars, onMutateResult, ctx) => {
      await useAuthStore.getState().setTokens(data.data.tokens);
      useAuthStore.getState().setUser(data.data.user);
      useAuthStore.getState().unlock();
      await persistUser(data.data.user);
      Sentry.addBreadcrumb({ category: 'auth', message: 'auth.register_success', level: 'info', data: { userId: data.data.user.id } });
      Sentry.addBreadcrumb({ category: 'auth', message: 'auth.login_success', level: 'info', data: { userId: data.data.user.id } });
      await userOnSuccess?.(data, vars, onMutateResult, ctx);
    },
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
      const response = await http.post<AuthResponse['data']['tokens']>('/api/v1/auth/refresh', {
        refreshToken,
      });
      return response.data;
    },
    onSuccess: async (tokens) => {
      await useAuthStore.getState().setTokens(tokens);
    },
  });
}
