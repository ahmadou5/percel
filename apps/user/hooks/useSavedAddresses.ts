import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/api';

type ApiResponse<T> = { data: T; message: string; success: boolean };

export type SavedAddress = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
  formattedAddress: string;
  placeId?: string;
  lat: number;
  lng: number;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
};

const addressKey = ['saved-addresses'];

export function useSavedAddresses() {
  return useQuery({
    queryKey: addressKey,
    queryFn: async () => {
      const response = await http.get<ApiResponse<SavedAddress[]>>('/api/v1/user/addresses');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useCreateSavedAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      label: string;
      formattedAddress: string;
      lat: number;
      lng: number;
      placeId?: string;
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      contactName?: string;
      contactPhone?: string;
    }) => {
      const response = await http.post<ApiResponse<SavedAddress>>('/api/v1/user/addresses', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKey });
    },
  });
}

export function useDeleteSavedAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await http.delete<ApiResponse<{ deleted: boolean }>>(`/api/v1/user/addresses/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKey });
    },
  });
}
