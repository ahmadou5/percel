import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import type { ApiResponse } from '@/lib/types';
import type { NotificationFeedResponse } from '@/lib/notifications';
import { useDriverStore } from '@/store/driver.store';

const notificationsKey = ['notifications'];

export function useNotifications(limit = 30) {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: [...notificationsKey, limit],
    enabled: isAuthenticated,
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
      const response = await http.patch<ApiResponse<{ updated: number }>>('/api/v1/user/notifications/read-all');
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}
