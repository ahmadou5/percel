import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';
import {
  type ProviderService,
  type ProviderValidation,
  type ProviderVariation,
  type WalletApiResponse,
  type WalletDetails,
  type WalletTransactionsQuery,
  type WalletTransactionsResponse,
} from '@/lib/wallet';

type TopUpResult = {
  authorizationUrl: string;
  reference: string;
};

type TransferResult = {
  reference: string;
  amount: number;
  toPhone: string;
};

type ResolveBankResult = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

type BankTransferResult = {
  reference: string;
  amount: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  recipientCode: string;
  status: string;
};

type SetTransferPinResult = {
  updated: boolean;
};

type VerifyTransferPinResult = {
  verified: boolean;
};

type BillResult = {
  reference: string;
  status: string;
};

type ProviderServicesResponse = WalletApiResponse<ProviderService[]>;
type ProviderVariationsResponse = WalletApiResponse<ProviderVariation[]>;
type ProviderValidationResponse = WalletApiResponse<ProviderValidation>;

type WalletResponse = WalletApiResponse<WalletDetails>;
type TopUpResponse = WalletApiResponse<TopUpResult>;
type TransferResponse = WalletApiResponse<TransferResult>;
type ResolveBankResponse = WalletApiResponse<ResolveBankResult>;
type BankTransferResponse = WalletApiResponse<BankTransferResult>;
type BillResponse = WalletApiResponse<BillResult>;

type MutationOptions<TData, TVariables> = UseMutationOptions<TData, Error, TVariables>;

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await http.get<WalletResponse>('/api/v1/wallet');
      return response.data.data;
    },
    staleTime: 15_000,
  });
}

export function useTransactions(filters: WalletTransactionsQuery = {}) {
  return useInfiniteQuery<WalletTransactionsResponse>({
    queryKey: ['wallet-transactions', filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await http.get<{ data: WalletTransactionsResponse }>('/api/v1/wallet/transactions', {
        params: {
          page: pageParam,
          limit: filters.limit ?? 20,
          category: filters.category && filters.category !== 'ALL' ? filters.category : undefined,
        },
      });

      return response.data.data;
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination) return undefined;

      const nextPage = pagination.page + 1;
      return nextPage <= pagination.totalPages ? nextPage : undefined;
    },
  });
}

export function useTopUp(options?: MutationOptions<TopUpResponse, { amount: number; callbackUrl?: string }>) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ amount, callbackUrl }) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.topup_requested', level: 'info', data: { amount } });
      const response = await http.post<TopUpResponse>('/api/v1/wallet/topup', {
        amount,
        callbackUrl: callbackUrl ?? Linking.createURL('/wallet'),
      });

      const { authorizationUrl } = response.data.data;
      if (authorizationUrl) {
        await WebBrowser.openAuthSessionAsync(authorizationUrl, callbackUrl ?? Linking.createURL('/wallet'));
      }

      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useTransfer(
  options?: MutationOptions<TransferResponse, { toPhone: string; amount: number; description?: string; pin: string }>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.transfer_requested', level: 'info', data: { amount: payload.amount, toPhone: payload.toPhone } });
      const response = await http.post<TransferResponse>('/api/v1/wallet/transfer', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useResolveBankAccount(options?: MutationOptions<ResolveBankResponse, { bankCode: string; accountNumber: string }>) {
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.bank_resolve_requested', level: 'info', data: payload });
      const response = await http.post<ResolveBankResponse>('/api/v1/wallet/bank/resolve', payload);
      return response.data;
    },
  });
}

export function useBankTransfer(options?: MutationOptions<BankTransferResponse, { bankCode: string; accountNumber: string; amount: number; description?: string; pin: string }>) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.bank_transfer_requested', level: 'info', data: { amount: payload.amount, bankCode: payload.bankCode } });
      const response = await http.post<BankTransferResponse>('/api/v1/wallet/bank-transfer', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useSetTransferPin(
  options?: MutationOptions<WalletApiResponse<SetTransferPinResult>, { currentPin?: string; newPin: string }>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.pin_set_requested', level: 'info' });
      const response = await http.put<WalletApiResponse<SetTransferPinResult>>('/api/v1/wallet/pin', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useResetTransferPin(options?: MutationOptions<WalletApiResponse<SetTransferPinResult>, { currentPin: string }>) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.pin_reset_requested', level: 'info' });
      const response = await http.post<WalletApiResponse<SetTransferPinResult>>('/api/v1/wallet/pin/reset', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useVerifyTransferPin(options?: MutationOptions<WalletApiResponse<VerifyTransferPinResult>, { pin: string }>) {
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.pin_verify_requested', level: 'info' });
      const response = await http.post<WalletApiResponse<VerifyTransferPinResult>>('/api/v1/wallet/pin/verify', payload);
      return response.data;
    },
  });
}

export function useBuyAirtime(options?: MutationOptions<BillResponse, { phone: string; amount: number; network: string }>) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.airtime_purchase_requested', level: 'info', data: { amount: payload.amount, network: payload.network } });
      const response = await http.post<BillResponse>('/api/v1/wallet/bills/airtime', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useBuyData(
  options?: MutationOptions<BillResponse, { phone: string; plan: string; network: string; amount: number; variationCode: string; serviceID?: string }>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.data_purchase_requested', level: 'info', data: { amount: payload.amount, network: payload.network } });
      const response = await http.post<BillResponse>('/api/v1/wallet/bills/data', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useBuyElectricity(
  options?: MutationOptions<BillResponse, { meterNumber: string; amount: number; disco: string; type?: 'prepaid' | 'postpaid' }>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.electricity_payment_requested', level: 'info', data: { amount: payload.amount, disco: payload.disco } });
      const response = await http.post<BillResponse>('/api/v1/wallet/bills/electricity', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}


export function useProviderServices(identifier: 'airtime' | 'data' | 'tv-subscription' | 'electricity-bill') {
  return useQuery({
    queryKey: ['provider-services', identifier],
    queryFn: async () => {
      const response = await http.get<ProviderServicesResponse>('/api/v1/wallet/providers', {
        params: { identifier },
      });
      return response.data.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useProviderVariations(serviceID?: string) {
  return useQuery({
    queryKey: ['provider-variations', serviceID],
    enabled: Boolean(serviceID),
    queryFn: async () => {
      const response = await http.get<ProviderVariationsResponse>(`/api/v1/wallet/providers/${serviceID}/variations`);
      return response.data.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useValidateProviderAccount() {
  return useMutation({
    mutationFn: async (payload: { serviceID: string; billersCode: string; type?: 'prepaid' | 'postpaid' }) => {
      const response = await http.post<ProviderValidationResponse>('/api/v1/wallet/providers/validate', payload);
      return response.data.data;
    },
  });
}

export function useBuyTv(options?: MutationOptions<BillResponse, { smartcardNumber: string; amount: number; provider: string; variationCode: string; phone?: string }>) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      Sentry.addBreadcrumb({ category: 'wallet', message: 'wallet.tv_purchase_requested', level: 'info', data: { amount: payload.amount, provider: payload.provider } });
      const response = await http.post<BillResponse>('/api/v1/wallet/bills/tv', payload);
      return response.data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
