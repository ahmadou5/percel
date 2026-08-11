import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/api';
import { useDriverLocation } from '@/lib/location';
import { subscribeDriverSocket, useDriverSocketLifecycle } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';
import { usePreferencesStore } from '@/store/preferences.store';

import { NewOrderAlertModal } from '@/components/orders/NewOrderAlertModal';
import { LocationPermissionModal } from '@/components/ui/LocationPermissionModal';

export function DriverRuntime() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const token = useDriverStore((state) => state.tokens?.accessToken);
  const isUnlocked = useDriverStore((state) => state.isUnlocked);
  const appLockEnabled = usePreferencesStore((state) => state.appLockEnabled);
  const allowScreenshots = usePreferencesStore((state) => state.allowScreenshots);
  const lastRegisteredToken = useRef<string | null>(null);

  const queryClient = useQueryClient();

  useDriverLocation();
  useDriverSocketLifecycle();

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeDriverSocket('wallet_updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return unsubscribe;
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    if (!allowScreenshots) {
      void ScreenCapture.preventScreenCaptureAsync();
    } else {
      void ScreenCapture.allowScreenCaptureAsync();
    }
  }, [allowScreenshots]);

  useEffect(() => {
    if (isAuthenticated && appLockEnabled && !isUnlocked) {
      router.replace('/auth-lock');
    }
  }, [appLockEnabled, isAuthenticated, isUnlocked]);

  const lastBackgroundTimeRef = useRef<number | null>(null);
  const LOCK_GRACE_PERIOD_MS = 300000; // 5 minutes

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const auth = useDriverStore.getState();
      
      if (nextState === 'background' || nextState === 'inactive') {
        if (!lastBackgroundTimeRef.current) {
          lastBackgroundTimeRef.current = Date.now();
        }
        return;
      }

      if (nextState === 'active') {
        const bgDuration = lastBackgroundTimeRef.current ? Date.now() - lastBackgroundTimeRef.current : 0;
        lastBackgroundTimeRef.current = null;

        if (auth.isBiometricPromptActive || bgDuration < LOCK_GRACE_PERIOD_MS) {
          return;
        }

        if (auth.isAuthenticated && appLockEnabled && !auth.isUnlocked) {
          auth.lock();
          setTimeout(() => {
            router.replace('/auth-lock');
          }, 100);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [appLockEnabled]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let cancelled = false;

    async function registerPushToken() {
      const current = await Notifications.getPermissionsAsync();
      const next = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (cancelled || next.status !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
      const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      if (cancelled || !pushToken || lastRegisteredToken.current === pushToken) return;

      await http.post('/api/v1/auth/push-token', { token: pushToken });
      lastRegisteredToken.current = pushToken;
    }

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Register CHAT_MESSAGE notification category with quick reply inline action
    void Notifications.setNotificationCategoryAsync('CHAT_MESSAGE', [
      {
        identifier: 'REPLY',
        buttonTitle: 'Reply',
        textInput: {
          submitButtonTitle: 'Send',
          placeholder: 'Type a message...',
        },
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'OPEN',
        buttonTitle: 'Open Chat',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const actionId = response.actionIdentifier;
      const userText = (response as any).userText as string | undefined;

      if (actionId === 'REPLY' && userText && data?.orderId) {
        http.post(`/api/v1/orders/${data.orderId}/messages`, { text: userText }).catch((err) => {
          console.warn('Driver quick reply send failed:', err);
        });
        return;
      }

      if (data?.orderId) {
        router.push(`/(tabs)/orders/${String(data.orderId)}`);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
      <NewOrderAlertModal />
      <LocationPermissionModal />
    </>
  );
}
