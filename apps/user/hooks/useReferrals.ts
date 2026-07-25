import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { Sentry } from '@/lib/sentry';

type ApiResponse<T> = { data: T; message: string; success: boolean; errors: unknown[] };

export type ReferralEntry = {
  id: string;
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'EXPIRED';
  bonus: number;
  inviteeName: string;
  inviteeAvatar: string | null;
  joinedAt: string;
  createdAt: string;
};

export type ReferralStats = {
  code: string;
  totalReferred: number;
  pending: number;
  qualified: number;
  rewarded: number;
  unclaimedBonus?: number;
  totalEarned: number;
  inviterBonus: number;
  inviteeBonus: number;
  referrals: ReferralEntry[];
};

const referralKey = ['referral-stats'];

export function useReferralStats() {
  return useQuery({
    queryKey: referralKey,
    queryFn: async () => {
      const response = await http.get<ApiResponse<ReferralStats>>('/api/v1/referrals');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useReferralCode() {
  return useQuery({
    queryKey: ['referral-code'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<{ code: string }>>('/api/v1/referrals/code');
      return response.data.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useApplyReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      Sentry.addBreadcrumb({ category: 'referral', message: 'referral.apply_code', level: 'info' });
      const response = await http.post<ApiResponse<{ applied: boolean; inviterName: string }>>(
        '/api/v1/referrals/apply',
        { code: code.trim().toUpperCase() },
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKey });
    },
  });
}

export function useClaimReferralRewards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await http.post<ApiResponse<{ claimedAmount: number; count: number }>>('/api/v1/referrals/claim');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKey });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}
