import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

import { useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { subscribeUserSocket, useUserSocketLifecycle } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { useWallet } from '@/hooks/useWallet';

export function UserRuntime() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.tokens?.accessToken);
  const lastRegisteredToken = useRef<string | null>(null);
  const notificationsEnabled = usePreferencesStore((state) => state.notificationsEnabled);
  const hydratePreferences = usePreferencesStore((state) => state.hydrate);
  const appLockEnabled = usePreferencesStore((state) => state.appLockEnabled);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const walletQuery = useWallet();
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
  const walletReady = !walletQuery.isLoading && !walletQuery.isFetching;

  const queryClient = useQueryClient();

  useUserSocketLifecycle();

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeUserSocket('wallet_updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    });

    return unsubscribe;
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    if (!isAuthenticated || !token || !notificationsEnabled) return;

    let cancelled = false;

    async function registerPushToken() {
      const current = await Notifications.getPermissionsAsync();
      const next = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (cancelled || next.status !== 'granted') return;

      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
        const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
        if (cancelled || !pushToken || lastRegisteredToken.current === pushToken) return;

        await http.post('/api/v1/user/push-token', { token: pushToken });
        lastRegisteredToken.current = pushToken;
      } catch (error) {
        if (!cancelled) {
          console.warn('Push token registration failed', error);
        }
      }
    }

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, notificationsEnabled]);

  useEffect(() => {
    if (isAuthenticated && appLockEnabled && walletReady && walletPinSet && !isUnlocked) {
      router.replace('/auth-lock');
    }
  }, [appLockEnabled, isAuthenticated, isUnlocked, walletPinSet, walletReady]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const auth = useAuthStore.getState();
      if (nextState !== 'active') {
        if (auth.isAuthenticated && appLockEnabled && walletPinSet) auth.lock();
        return;
      }

      if (auth.isAuthenticated && appLockEnabled && walletPinSet && !auth.isUnlocked) {
        router.replace('/auth-lock');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [appLockEnabled, walletPinSet]);

  return null;
}
