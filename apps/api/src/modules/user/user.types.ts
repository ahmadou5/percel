import type { UserStatus } from '@prisma/client';

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

export type UpdateProfileBody = {
  fullName?: string;
  dateOfBirth?: string | null;
  address?: string | null;
};

export type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};
