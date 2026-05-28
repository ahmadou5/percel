import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { Sentry } from '@/lib/sentry';

export type AuthUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setTokens: (tokens: AuthTokens | null) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = 'percel_auth_tokens';
const USER_KEY = 'percel_auth_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => {
    set({ user, isAuthenticated: Boolean(user && get().tokens) });
    Sentry.setUser(user ? { id: user.id, email: user.email } : null);
  },
  setTokens: async (tokens) => {
    if (tokens) {
      await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    set({ tokens, isAuthenticated: Boolean(tokens && get().user) });
    if (!tokens && !get().user) {
      Sentry.setUser(null);
    }
  },
  hydrate: async () => {
    set({ isLoading: true });
    const [rawTokens, rawUser] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    const tokens = rawTokens ? (JSON.parse(rawTokens) as AuthTokens) : null;
    const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;

    set({ user, tokens, isAuthenticated: Boolean(user && tokens), isLoading: false });
    Sentry.setUser(user ? { id: user.id, email: user.email } : null);
  },
  logout: async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
    Sentry.setUser(null);
  },
}));

export async function persistUser(user: AuthUser | null) {
  if (user) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}
