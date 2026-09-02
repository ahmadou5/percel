import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';
import { emitDriverEvent } from '@/lib/socket';
import type { ApiResponse, DriverOrder } from '@/lib/types';
import { useDriverStore } from '@/store/driver.store';
import { customEvent } from 'vexo-analytics';

export function useAvailableOrders() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isOnline = useDriverStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['driver-orders'],
    enabled: isAuthenticated && isOnline,
    queryFn: async () => {
      const response = await http.get<ApiResponse<DriverOrder[]>>('/api/v1/driver/orders');
      return response.data.data;
    },
    staleTime: 10_000,
  });
}

export function useDriverActiveOrders() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['driver-orders-active'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await http.get<ApiResponse<DriverOrder[]>>('/api/v1/driver/orders/active');
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
      customEvent('order-accepted', { orderId: data.order.id, amount: data.order.price });
      await setCurrentOrder(data.order);
      emitDriverEvent('order_status_update', { orderId: data.order.id, status: data.order.status });
      await queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-orders-active'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useDeclineOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { orderId: string; reason?: string }) => {
      Sentry.addBreadcrumb({ category: 'dispatch', message: 'driver.order_decline_requested', level: 'info', data: { orderId: payload.orderId } });
      const response = await http.post<ApiResponse<{ declined: boolean; orderId: string }>>(
        `/api/v1/driver/orders/${payload.orderId}/decline`,
        { reason: payload.reason },
      );
      return response.data.data;
    },
    onSuccess: async (data) => {
      emitDriverEvent('order_status_update', { orderId: data.orderId, status: 'DECLINED' });
      await queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const setCurrentOrder = useDriverStore((state) => state.setCurrentOrder);

  return useMutation({
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : String(error);
      const transient = /network|timeout|Could not reach|aborted/i.test(message);
      return transient && failureCount < 2;
    },
    retryDelay: 1500,
    mutationFn: async (payload: { orderId: string; status: 'IN_TRANSIT' | 'DELIVERED'; lat?: number; lng?: number; photoUri?: string }) => {
      Sentry.addBreadcrumb({ category: 'dispatch', message: 'driver.order_status_update_requested', level: 'info', data: { orderId: payload.orderId, status: payload.status } });

      if (payload.photoUri) {
        const formData = new FormData();
        formData.append('status', payload.status);
        if (payload.lat != null) formData.append('lat', String(payload.lat));
        if (payload.lng != null) formData.append('lng', String(payload.lng));
        formData.append('photo', {
          uri: payload.photoUri,
          name: 'delivery-proof.jpg',
          type: 'image/jpeg',
        } as never);
        const response = await http.patch<ApiResponse<DriverOrder>>(`/api/v1/driver/orders/${payload.orderId}/status`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.data;
      }

      const response = await http.patch<ApiResponse<DriverOrder>>(`/api/v1/driver/orders/${payload.orderId}/status`, {
        status: payload.status,
        lat: payload.lat,
        lng: payload.lng,
      });
      return response.data.data;
    },
    onSuccess: async (order) => {
      if (order.status === 'DELIVERED') {
        customEvent('order-delivered', { orderId: order.id });
      }
      emitDriverEvent('order_status_update', { orderId: order.id, status: order.status });
      await setCurrentOrder(order.status === 'COMPLETED' ? null : order);
      await queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-orders-active'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-order-detail', order.id] });
      await queryClient.invalidateQueries({ queryKey: ['driver-orders-history'] });
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

export function useDriverOrderDetail(id: string | null | undefined) {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const currentOrder = useDriverStore((state) => state.currentOrder);

  return useQuery({
    queryKey: ['driver-order-detail', id],
    enabled: isAuthenticated && !!id,
    queryFn: async () => {
      try {
        const response = await http.get<ApiResponse<DriverOrder>>(`/api/v1/driver/orders/${id}`);
        return response.data.data;
      } catch {
        try {
          const fallback = await http.get<ApiResponse<DriverOrder>>(`/api/v1/orders/${id}`);
          return fallback.data.data;
        } catch {
          if (currentOrder && currentOrder.id === id) return currentOrder;
          throw new Error('Order not found');
        }
      }
    },
    // Seed from current order store so the screen renders instantly while fetching
    initialData: () => {
      if (currentOrder && currentOrder.id === id) return currentOrder;
      return undefined;
    },
    staleTime: 10_000,
  });
}
