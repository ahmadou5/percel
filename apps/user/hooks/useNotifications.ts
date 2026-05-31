import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';
import type { NotificationFeedResponse } from '@/lib/notifications';

type ApiResponse<T> = { data: T; message: string; success: boolean; errors: unknown[] };

const notificationsKey = ['notifications'];

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: [...notificationsKey, limit],
    queryFn: async () => {
      const response = await http.get<ApiResponse<NotificationFeedResponse>>('/api/v1/user/notifications', {
        params: { limit },
      });
      return response.data.data;
    },
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      Sentry.addBreadcrumb({ category: 'notifications', message: 'notifications.mark_read_requested', level: 'info', data: { notificationId } });
      const response = await http.patch<ApiResponse<{ updated: boolean }>>(`/api/v1/user/notifications/${notificationId}/read`);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      Sentry.addBreadcrumb({ category: 'notifications', message: 'notifications.mark_all_read_requested', level: 'info' });
      const response = await http.patch<ApiResponse<{ updated: number }>>('/api/v1/user/notifications/read-all');
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}
