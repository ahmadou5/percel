import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AppState, type AppStateStatus } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect, useRef } from "react";
import { router } from "expo-router";

import { useQueryClient } from "@tanstack/react-query";

import { http } from "@/lib/api";
import { subscribeUserSocket, useUserSocketLifecycle } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";
import { usePreferencesStore } from "@/store/preferences.store";
import { useWallet } from "@/hooks/useWallet";

export function UserRuntime() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.tokens?.accessToken);
  const lastRegisteredToken = useRef<string | null>(null);
  const notificationsEnabled = usePreferencesStore((state) => state.notificationsEnabled);
  const walletAccessBiometricEnabled = usePreferencesStore((state) => state.walletAccessBiometricEnabled);
  const allowScreenshots = usePreferencesStore((state) => state.allowScreenshots);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const walletQuery = useWallet();
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
  const walletReady = !walletQuery.isLoading && !walletQuery.isFetching;

  useEffect(() => {
    if (!allowScreenshots) {
      void ScreenCapture.preventScreenCaptureAsync();
    } else {
      void ScreenCapture.allowScreenCaptureAsync();
    }
  }, [allowScreenshots]);

  const queryClient = useQueryClient();

  useUserSocketLifecycle();

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeUserSocket("wallet_updated", () => {
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    });

    return unsubscribe;
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !token || !notificationsEnabled) return;

    let cancelled = false;

    async function registerPushToken() {
      const current = await Notifications.getPermissionsAsync();
      if (cancelled || current.status !== "granted") return;

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
        const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
        if (cancelled || !pushToken || lastRegisteredToken.current === pushToken) return;

        await http.post("/api/v1/user/push-token", { token: pushToken });
        lastRegisteredToken.current = pushToken;
      } catch (error) {
        if (!cancelled) {
          console.warn("Push token registration failed", error);
        }
      }
    }

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, notificationsEnabled, token]);

  useEffect(() => {
    if (isAuthenticated && walletAccessBiometricEnabled && walletReady && walletPinSet && !isUnlocked) {
      router.replace("/auth-lock");
    }
  }, [isAuthenticated, isUnlocked, walletAccessBiometricEnabled, walletPinSet, walletReady]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const auth = useAuthStore.getState();
      if (nextState !== "active") {
        if (auth.isAuthenticated && walletAccessBiometricEnabled && walletPinSet) auth.lock();
        return;
      }

      if (auth.isAuthenticated && walletAccessBiometricEnabled && walletPinSet && !auth.isUnlocked) {
        router.replace("/auth-lock");
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [walletAccessBiometricEnabled, walletPinSet]);

  useEffect(() => {
    async function checkInitialNotification() {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          const data = response.notification.request.content.data;
          if (data) {
            if (data.orderId) {
              router.push(`/orders/${data.orderId}`);
            } else if (data.kind === 'wallet_topup' || data.kind === 'wallet_transfer_in' || data.kind === 'wallet_transfer_out') {
              router.push('/wallet/transactions');
            } else if (data.kind === 'kyc') {
              router.push('/settings/kyc');
            }
          }
        }
      } catch (err) {
        console.warn("Failed to get initial notification response", err);
      }
    }
    void checkInitialNotification();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data) {
        if (data.orderId) {
          router.push(`/orders/${data.orderId}`);
        } else if (data.kind === 'wallet_topup' || data.kind === 'wallet_transfer_in' || data.kind === 'wallet_transfer_out') {
          router.push('/wallet/transactions');
        } else if (data.kind === 'kyc') {
          router.push('/settings/kyc');
        }
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}
