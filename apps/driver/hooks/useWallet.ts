import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { http } from '@/lib/api';
import {
  type BankDirectoryItem,
  type ProviderService,
  type ProviderValidation,
  type ProviderVariation,
  type WalletApiResponse,
  type WalletDetails,
  type WalletTransactionsQuery,
  type WalletTransactionsResponse,
} from '@/lib/wallet';
import { useDriverStore } from '@/store/driver.store';

type TopUpResult = { authorizationUrl: string; reference: string };
type TopUpFlowResult = TopUpResult & { authResult: { type: string; url?: string } };
type TransferResult = { reference: string; amount: number; toPhone: string };
type ResolveBankResult = { bankCode: string; bankName: string; accountNumber: string; accountName: string };
type ResolveTransferRecipientResult = { phone: string; fullName: string; walletId: string; avatarUrl?: string | null };
type ResolveAirtimeProviderResult = { phone: string; serviceID: string; providerName: string; confidence: 'high' | 'low' };
type BankTransferResult = { reference: string; amount: number; bankName: string; accountName: string; accountNumber: string; recipientCode: string; status: string };
type SetTransferPinResult = { updated: boolean };
type VerifyTransferPinResult = { verified: boolean };
type BillResult = { reference: string; status: string };

type WalletResponse = WalletApiResponse<WalletDetails>;
type TopUpResponse = WalletApiResponse<TopUpResult>;
type TransferResponse = WalletApiResponse<TransferResult>;
type ResolveBankResponse = WalletApiResponse<ResolveBankResult>;
type ResolveTransferRecipientResponse = WalletApiResponse<ResolveTransferRecipientResult>;
type ResolveAirtimeProviderResponse = WalletApiResponse<ResolveAirtimeProviderResult>;
type BankTransferResponse = WalletApiResponse<BankTransferResult>;
type BillResponse = WalletApiResponse<BillResult>;
type ProviderServicesResponse = WalletApiResponse<ProviderService[]>;
type ProviderVariationsResponse = WalletApiResponse<ProviderVariation[]>;
type ProviderValidationResponse = WalletApiResponse<ProviderValidation>;

type MutationOptions<TData, TVariables> = UseMutationOptions<TData, Error, TVariables>;

export function useWallet() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isLoading = useDriverStore((state) => state.isLoading);

  return useQuery({
    queryKey: ['wallet'],
    enabled: isAuthenticated && !isLoading,
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
    queryFn: async ({ pageParam }) =>
      (await http.get<{ data: WalletTransactionsResponse }>('/api/v1/wallet/transactions', {
        params: {
          page: pageParam,
          limit: filters.limit ?? 20,
          category: filters.category && filters.category !== 'ALL' ? filters.category : undefined,
        },
      })).data.data,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination) return undefined;
      const nextPage = pagination.page + 1;
      return nextPage <= pagination.totalPages ? nextPage : undefined;
    },
  });
}

function invalidateWallet(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] }),
  ]);
}

export function useTopUp(options?: MutationOptions<TopUpFlowResult, { amount: number; callbackUrl?: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async ({ amount, callbackUrl }) => {
      const response = await http.post<TopUpResponse>('/api/v1/wallet/topup', {
        amount,
        callbackUrl: callbackUrl ?? Linking.createURL('/(tabs)/wallet'),
      });
      const authorizationUrl = response.data.data.authorizationUrl;
      if (!authorizationUrl) {
        throw new Error('Paystack checkout URL was not returned.');
      }

      const authResult = await WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        callbackUrl ?? Linking.createURL('/(tabs)/wallet')
      );
      return {
        authorizationUrl,
        reference: response.data.data.reference,
        authResult: {
          type: authResult.type,
          url: 'url' in authResult ? authResult.url : undefined,
        },
      };
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateWallet(queryClient);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useVerifyTopUp(options?: MutationOptions<WalletApiResponse<{ status: 'success' | 'failed' | 'pending'; amount: number; reference: string }>, { reference: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async ({ reference }) => {
      return (await http.get<WalletApiResponse<{ status: 'success' | 'failed' | 'pending'; amount: number; reference: string }>>(`/api/v1/wallet/topup/verify/${reference}`)).data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (data.data.status === 'success') {
        await invalidateWallet(queryClient);
      }
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useTransfer(options?: MutationOptions<TransferResponse, { toPhone: string; amount: number; description?: string; pin: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<TransferResponse>('/api/v1/wallet/transfer', payload)).data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateWallet(queryClient);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useLookupBankAccount(options?: MutationOptions<ResolveBankResponse, { bankCode: string; accountNumber: string }>) {
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<ResolveBankResponse>('/api/v1/wallet/bank/lookup', payload)).data;
    },
  });
}

export function useAccountLookup(accountNumber: string, bankCode: string) {
  const [debounced, setDebounced] = useState({ accountNumber: '', bankCode: '' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced({
        accountNumber: accountNumber.trim().replace(/\s/g, ''),
        bankCode: bankCode.trim(),
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [accountNumber, bankCode]);

  return useQuery({
    queryKey: ['bank-account-lookup', debounced.bankCode, debounced.accountNumber],
    enabled: debounced.bankCode.length >= 3 && debounced.accountNumber.length >= 10,
    retry: false,
    queryFn: async () => {
      return (await http.post<ResolveBankResponse>('/api/v1/wallet/bank/lookup', debounced)).data.data;
    },
  });
}

export function useResolveTransferRecipient(options?: MutationOptions<ResolveTransferRecipientResponse, { phone: string }>) {
  return useMutation({
    ...options,
    mutationFn: async (payload) => (await http.post<ResolveTransferRecipientResponse>('/api/v1/wallet/transfer/resolve', payload)).data,
  });
}

export function useResolveAirtimeProvider(options?: MutationOptions<ResolveAirtimeProviderResponse, { phone: string }>) {
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<ResolveAirtimeProviderResponse>('/api/v1/wallet/airtime/resolve', payload)).data;
    },
  });
}

export function useBankTransfer(options?: MutationOptions<BankTransferResponse, { bankCode: string; accountNumber: string; amount: number; description?: string; pin: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<BankTransferResponse>('/api/v1/wallet/bank-transfer', payload)).data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateWallet(queryClient);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useSetTransferPin(options?: MutationOptions<WalletApiResponse<SetTransferPinResult>, { currentPin?: string; newPin: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async (payload) => (await http.put<WalletApiResponse<SetTransferPinResult>>('/api/v1/wallet/pin', payload)).data,
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
    mutationFn: async (payload) => (await http.post<WalletApiResponse<SetTransferPinResult>>('/api/v1/wallet/pin/reset', payload)).data,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useVerifyTransferPin(options?: MutationOptions<WalletApiResponse<VerifyTransferPinResult>, { pin: string }>) {
  return useMutation({
    ...options,
    mutationFn: async (payload) => (await http.post<WalletApiResponse<VerifyTransferPinResult>>('/api/v1/wallet/pin/verify', payload)).data,
  });
}

export function useBuyAirtime(options?: MutationOptions<BillResponse, { phone: string; amount: number; network: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<BillResponse>('/api/v1/wallet/bills/airtime', payload)).data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateWallet(queryClient);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useBuyData(options?: MutationOptions<BillResponse, { phone: string; plan: string; network: string; amount: number; variationCode: string; serviceID?: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<BillResponse>('/api/v1/wallet/bills/data', payload)).data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateWallet(queryClient);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useBuyElectricity(options?: MutationOptions<BillResponse, { meterNumber: string; amount: number; disco: string; type?: 'prepaid' | 'postpaid' }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<BillResponse>('/api/v1/wallet/bills/electricity', payload)).data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateWallet(queryClient);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useBanks(provider?: string) {
  return useQuery({
    queryKey: ['banks', provider],
    queryFn: async () =>
      (
        await http.get<WalletApiResponse<BankDirectoryItem[]>>('/api/v1/wallet/banks', {
          params: { provider },
        })
      ).data.data,
    staleTime: 15 * 60_000,
  });
}

export function useProviderServices(identifier: 'airtime' | 'data' | 'tv-subscription' | 'electricity-bill') {
  return useQuery({
    queryKey: ['provider-services', identifier],
    queryFn: async () => (await http.get<ProviderServicesResponse>('/api/v1/wallet/providers', { params: { identifier } })).data.data,
    staleTime: 5 * 60_000,
  });
}

export function useProviderVariations(serviceID?: string) {
  return useQuery({
    queryKey: ['provider-variations', serviceID],
    enabled: Boolean(serviceID),
    queryFn: async () => (await http.get<ProviderVariationsResponse>(`/api/v1/wallet/providers/${serviceID}/variations`)).data.data,
    staleTime: 5 * 60_000,
  });
}

export function useValidateProviderAccount() {
  return useMutation({
    mutationFn: async (payload: { serviceID: string; billersCode: string; type?: 'prepaid' | 'postpaid' }) =>
      (await http.post<ProviderValidationResponse>('/api/v1/wallet/providers/validate', payload)).data.data,
  });
}

export function useBuyTv(options?: MutationOptions<BillResponse, { smartcardNumber: string; amount: number; provider: string; variationCode: string; phone?: string }>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      return (await http.post<BillResponse>('/api/v1/wallet/bills/tv', payload)).data;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidateWallet(queryClient);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
