import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';
import { emitDriverEvent } from '@/lib/socket';
import type { ApiResponse, DriverOrder } from '@/lib/types';
import { useDriverStore } from '@/store/driver.store';

export function useAvailableOrders() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['driver-orders'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await http.get<ApiResponse<DriverOrder[]>>('/api/v1/driver/orders');
      return response.data.data;
    },
    staleTime: 10_000,
  });
}

export function useDriverRateOrder() {
  return useMutation({
    mutationFn: async (payload: { orderId: string; driverRating: number; driverComment?: string }) => {
      Sentry.addBreadcrumb({ category: 'dispatch', message: 'driver.customer_rating_submitted', level: 'info', data: { orderId: payload.orderId, rating: payload.driverRating } });
      const response = await http.post<ApiResponse<{ orderId: string }>>(`/api/v1/driver/orders/${payload.orderId}/rate`, {
        driverRating: payload.driverRating,
        driverComment: payload.driverComment,
      });
      return response.data.data;
    },
  });
}

export function useAcceptOrder() {
  const queryClient = useQueryClient();
  const setCurrentOrder = useDriverStore((state) => state.setCurrentOrder);

  return useMutation({
    mutationFn: async (orderId: string) => {
      Sentry.addBreadcrumb({ category: 'dispatch', message: 'driver.order_accept_requested', level: 'info', data: { orderId } });
      const response = await http.post<ApiResponse<{ accepted: boolean; order: DriverOrder }>>(
        `/api/v1/driver/orders/${orderId}/accept`,
      );
      return response.data.data;
    },
    onSuccess: async (data) => {
      await setCurrentOrder(data.order);
      emitDriverEvent('order_status_update', { orderId: data.order.id, status: data.order.status });
      await queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const setCurrentOrder = useDriverStore((state) => state.setCurrentOrder);

  return useMutation({
    mutationFn: async (payload: { orderId: string; status: 'IN_TRANSIT' | 'DELIVERED'; lat?: number; lng?: number }) => {
      Sentry.addBreadcrumb({ category: 'dispatch', message: 'driver.order_status_update_requested', level: 'info', data: { orderId: payload.orderId, status: payload.status } });
      const response = await http.patch<ApiResponse<DriverOrder>>(`/api/v1/driver/orders/${payload.orderId}/status`, {
        status: payload.status,
        lat: payload.lat,
        lng: payload.lng,
      });
      return response.data.data;
    },
    onSuccess: async (order) => {
      emitDriverEvent('order_status_update', { orderId: order.id, status: order.status });
      await setCurrentOrder(order.status === 'COMPLETED' ? null : order);
      await queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
  });
}

export function useDriverOrdersHistory() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['driver-orders-history'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await http.get<ApiResponse<{ data: DriverOrder[] }>>('/api/v1/driver/orders/history');
      return response.data.data.data;
    },
    staleTime: 15_000,
  });
}
