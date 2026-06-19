export type AppNotificationType = 'ORDER_UPDATE' | 'PAYMENT' | 'SYSTEM' | 'PROMO';

export type AppNotification = {
  id: string;
  userId: string;
  type: AppNotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

export type NotificationFeedResponse = {
  data: AppNotification[];
  unreadCount: number;
};

export function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
