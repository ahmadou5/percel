import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';
import type {
  ChangePasswordPayload,
  ChangePasswordResult,
  DeleteAccountResult,
  UpdateProfilePayload,
  UpdateProfileResult,
  UserProfile,
} from '@/lib/profile';
import { persistUser, useAuthStore } from '@/store/auth.store';

type ApiResponse<T> = { data: T; message: string; success: boolean; errors: unknown[] };

const profileKey = ['user-profile'];

export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      const response = await http.get<ApiResponse<UserProfile>>('/api/v1/user/profile');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'user.profile_update_requested', level: 'info' });
      const response = await http.patch<ApiResponse<UpdateProfileResult>>('/api/v1/user/profile', payload);
      return response.data.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: profileKey });
      const previous = queryClient.getQueryData<UserProfile>(profileKey);
      if (previous) {
        queryClient.setQueryData<UserProfile>(profileKey, {
          ...previous,
          ...payload,
          dateOfBirth: payload.dateOfBirth === undefined ? previous.dateOfBirth : payload.dateOfBirth,
          address: payload.address === undefined ? previous.address : payload.address,
        });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(profileKey, context.previous);
      }
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(profileKey, data);
      const auth = useAuthStore.getState();
      if (auth.user) {
        const nextUser = {
          ...auth.user,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl ?? auth.user.avatarUrl ?? null,
          dateOfBirth: data.dateOfBirth ?? auth.user.dateOfBirth ?? null,
          address: data.address ?? auth.user.address ?? null,
        };
        auth.setUser(nextUser);
        await persistUser(nextUser);
      }
    },
  });
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'user.avatar_update_requested', level: 'info' });
      const response = await http.post<ApiResponse<{ avatarUrl: string }>>('/api/v1/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData<UserProfile | undefined>(profileKey, (current) =>
        current ? { ...current, avatarUrl: data.avatarUrl } : current,
      );
      const auth = useAuthStore.getState();
      if (auth.user) {
        const nextUser = { ...auth.user, avatarUrl: data.avatarUrl };
        auth.setUser(nextUser);
        await persistUser(nextUser);
      }
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'user.password_change_requested', level: 'info' });
      const response = await http.post<ApiResponse<ChangePasswordResult>>('/api/v1/user/password', payload);
      return response.data.data;
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      Sentry.addBreadcrumb({ category: 'profile', message: 'user.account_delete_requested', level: 'info' });
      const response = await http.delete<ApiResponse<DeleteAccountResult>>('/api/v1/user/account');
      return response.data.data;
    },
    onSuccess: async () => {
      await useAuthStore.getState().logout();
      queryClient.clear();
    },
  });
}
