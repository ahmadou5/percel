export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  address: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  walletPinSet: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfilePayload = {
  fullName?: string;
  dateOfBirth?: string | null;
  address?: string | null;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateProfileResult = UserProfile;
export type ChangePasswordResult = { updated: boolean };
export type DeleteAccountResult = { deleted: boolean };
