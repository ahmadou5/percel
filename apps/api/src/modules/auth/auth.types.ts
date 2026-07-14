export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  avatarUrl: string | null;
  dateOfBirth: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user?: SafeUser;
  tokens?: AuthTokens;
  requiresVerification?: boolean;
  phone?: string;
  message?: string;
}

export interface PushTokenResponse {
  registered: boolean;
}
