import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';
import type { Order, OrderDetailResponse, OrderDraft, OrderListResponse, OrderQuoteResponse, OrderRateResult, TrackingResponse } from '@/lib/order';
import type { Hub } from '@/types/hubs';

export function useActiveHubs() {
  return useQuery<Hub[]>({
    queryKey: ['hubs', 'active'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await http.get<{ data: Hub[] }>('/api/v1/hubs');
      return response.data.data;
    },
  });
}

export function useReverseGeocode() {
  return useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      const response = await http.post<{ data: { formattedAddress: string; city: string; state: string } }>(
        '/api/v1/orders/reverse-geocode',
        coords,
      );
      return response.data.data;
    },
  });
}

export function usePlaceAutocomplete() {
  return useMutation({
    mutationFn: async (payload: string | { input: string; lat?: number; lng?: number }) => {
      const params = typeof payload === 'string' ? { input: payload } : payload;
      const response = await http.get<{ data: Array<{ description: string; placeId: string; mainText: string; secondaryText: string }> }>(
        '/api/v1/orders/autocomplete',
        { params }
      );
      return response.data.data;
    },
  });
}

export function usePlaceDetails() {
  return useMutation({
    mutationFn: async (placeId: string) => {
      const response = await http.get<{
        data: {
          street: string;
          city: string;
          state: string;
          country: string;
          lat: number;
          lng: number;
          formattedAddress: string;
          placeId: string;
        };
      }>('/api/v1/orders/place-details', { params: { placeId } });
      return response.data.data;
    },
  });
}

export function useGetQuote() {
  return useMutation({
    mutationFn: async (payload: {
      size: 'SMALL' | 'MEDIUM' | 'LARGE';
      originHubId?: string;
      destinationHubId?: string;
      routeId?: string;
      localPickupAddress?: string;
      pickupAddress?: string;
      deliveryAddress?: string;
      pickupLat?: number;
      pickupLng?: number;
      deliveryLat?: number;
      deliveryLng?: number;
    }) => {
      const response = await http.post<{ data: OrderQuoteResponse }>('/api/v1/orders/quote', payload);
      return response.data.data;
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OrderDraft) => {
      Sentry.addBreadcrumb({ category: 'order', message: 'order.create_requested', level: 'info', data: { size: payload.size } });
      const response = await http.post<{ data: Order }>('/api/v1/orders', payload);
      Sentry.addBreadcrumb({ category: 'order', message: 'order.created', level: 'info', data: { orderId: response.data.data.id } });
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useOrders() {
  return useInfiniteQuery<OrderListResponse>({
    queryKey: ['orders'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await http.get<{ data: OrderListResponse }>('/api/v1/orders', {
        params: { page: pageParam, limit: 20 },
      });
      return response.data.data;
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination) return undefined;

      const next = pagination.page + 1;
      return next <= pagination.totalPages ? next : undefined;
    },
  });
}

export function useOrderDetail(id?: string) {
  return useQuery({
    queryKey: ['order', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await http.get<{ data: OrderDetailResponse }>(`/api/v1/orders/${id}`);
      return response.data.data;
    },
  });
}

export function useTrackOrder(code?: string) {
  return useQuery({
    queryKey: ['order-track', code],
    enabled: Boolean(code),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ['CREATED', 'PENDING_MATCH', 'MATCHED', 'ACCEPTED', 'IN_TRANSIT'].includes(status) ? 5000 : false;
    },
    queryFn: async () => {
      const response = await http.get<{ data: TrackingResponse }>(`/api/v1/orders/track/${code}`);
      return response.data.data;
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      Sentry.addBreadcrumb({ category: 'order', message: 'order.cancel_requested', level: 'info', data: { orderId: id } });
      const response = await http.post<{ data: OrderDetailResponse }>(`/api/v1/orders/${id}/cancel`, { reason });
      return response.data.data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      Sentry.addBreadcrumb({ category: 'order', message: 'order.confirm_requested', level: 'info', data: { orderId: id } });
      const response = await http.post<{ data: OrderDetailResponse }>(`/api/v1/orders/${id}/confirm`);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useRateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; userRating: number; userComment?: string }) => {
      Sentry.addBreadcrumb({ category: 'order', message: 'order.rate_submitted', level: 'info', data: { orderId: payload.id, rating: payload.userRating } });
      const response = await http.post<{ data: OrderRateResult }>(`/api/v1/orders/${payload.id}/rate`, {
        userRating: payload.userRating,
        userComment: payload.userComment,
      });
      return response.data.data;
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['order-track'] });
    },
  });
}
