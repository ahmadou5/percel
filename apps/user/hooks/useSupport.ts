import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TicketCategory =
  | 'WRONG_CHARGE'
  | 'FAILED_ORDER'
  | 'LATE_DELIVERY'
  | 'DAMAGED_PACKAGE'
  | 'DRIVER_CONDUCT'
  | 'PAYMENT_ISSUE'
  | 'ACCOUNT_ISSUE'
  | 'OTHER';

export type SupportMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userRole: string;
  orderId?: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  refundRequested: boolean;
  refundAmount?: number | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    trackingCode: string;
    price: number;
    status: string;
  } | null;
  messages: SupportMessage[];
};

export function useSupportTickets() {
  return useQuery<SupportTicket[]>({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const res = await api.get('/support/tickets');
      return res.data.data;
    },
  });
}

export function useSupportTicketDetails(id?: string) {
  return useQuery<SupportTicket>({
    queryKey: ['support-tickets', id],
    queryFn: async () => {
      if (!id) throw new Error('Ticket ID is required');
      const res = await api.get(`/support/tickets/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      orderId?: string;
      category: TicketCategory;
      subject: string;
      description: string;
      refundRequested?: boolean;
      refundAmount?: number;
      userRole?: 'USER' | 'DRIVER';
    }) => {
      const res = await api.post('/support/tickets', payload);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export function useSendSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { text: string; senderName?: string; senderRole?: string }) => {
      const res = await api.post(`/support/tickets/${ticketId}/messages`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['support-tickets', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}
