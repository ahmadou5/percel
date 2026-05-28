export type NotificationType = 'ORDER_UPDATE' | 'PAYMENT' | 'SYSTEM' | 'PROMO';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
