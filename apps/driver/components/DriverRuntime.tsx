import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { http } from '@/lib/api';
import { useDriverLocation } from '@/lib/location';
import { useDriverSocketLifecycle } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';

export function DriverRuntime() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const token = useDriverStore((state) => state.tokens?.accessToken);
  const lastRegisteredToken = useRef<string | null>(null);

  useDriverLocation();
  useDriverSocketLifecycle();

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

      await http.post('/api/v1/user/push-token', { token: pushToken });
      lastRegisteredToken.current = pushToken;
    }

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  return null;
}
