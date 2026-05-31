import type { NotificationType, UserStatus } from '@prisma/client';

export type UserProfileResponse = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  address: string | null;
  status: UserStatus;
  walletPinSet: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NotificationResponse = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

export type NotificationsFeedResponse = {
  data: NotificationResponse[];
  unreadCount: number;
};

export type UpdateProfileBody = {
  fullName?: string;
  dateOfBirth?: string | null;
  address?: string | null;
};

export type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};
