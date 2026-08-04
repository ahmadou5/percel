import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DriverTicketCategory =
  | 'WRONG_CHARGE'
  | 'FAILED_ORDER'
  | 'PAYMENT_ISSUE'
  | 'DRIVER_CONDUCT'
  | 'ACCOUNT_ISSUE'
  | 'OTHER';

export type DriverSupportMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
};

export type DriverSupportTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userRole: string;
  orderId?: string | null;
  category: DriverTicketCategory;
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
  messages: DriverSupportMessage[];
};

export function useDriverSupportTickets() {
  return useQuery<DriverSupportTicket[]>({
    queryKey: ['driver-support-tickets'],
    queryFn: async () => {
      const res = await api.get('/support/tickets');
      return res.data.data;
    },
  });
}

export function useDriverSupportTicketDetails(id?: string) {
  return useQuery<DriverSupportTicket>({
    queryKey: ['driver-support-tickets', id],
    queryFn: async () => {
      if (!id) throw new Error('Ticket ID is required');
      const res = await api.get(`/support/tickets/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function useCreateDriverSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      orderId?: string;
      category: DriverTicketCategory;
      subject: string;
      description: string;
      refundRequested?: boolean;
      refundAmount?: number;
    }) => {
      const res = await api.post('/support/tickets', { ...payload, userRole: 'DRIVER' });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-support-tickets'] });
    },
  });
}

export function useSendDriverSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { text: string; senderName?: string }) => {
      const res = await api.post(`/support/tickets/${ticketId}/messages`, { ...payload, senderRole: 'DRIVER' });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-support-tickets', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['driver-support-tickets'] });
    },
  });
}
