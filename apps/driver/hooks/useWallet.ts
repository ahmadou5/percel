import { useQuery } from '@tanstack/react-query';

import { http } from '@/lib/api';
import type { ApiResponse, WalletDetails } from '@/lib/types';
import { useDriverStore } from '@/store/driver.store';

export function useWallet() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['wallet'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await http.get<ApiResponse<WalletDetails>>('/api/v1/wallet');
      return response.data.data;
    },
    staleTime: 15_000,
  });
}
