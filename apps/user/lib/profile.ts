export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  address: string | null;
  ninNumber: string | null;
  ninVerified: boolean;
  bvnNumber: string | null;
  bvnVerified: boolean;
  kycMethod: 'NIN' | 'BVN' | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  walletPinSet: boolean;
  kycComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfilePayload = {
  fullName?: string;
  dateOfBirth?: string | null;
  address?: string | null;
  kycMethod?: 'NIN' | 'BVN' | null;
};

export type VerifyNinPayload = {
  nin: string;
};

export type VerifyBvnPayload = {
  bvn: string;
};

export type VerifyKycResult = UserProfile;

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateProfileResult = UserProfile;
export type ChangePasswordResult = { updated: boolean };
export type DeleteAccountResult = { deleted: boolean };
