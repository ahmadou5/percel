import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

export type ThemeMode = "system" | "light" | "dark" | "custom";

export type CustomTheme = {
  accent: string;
  background: string;
};

type PreferencesState = {
  themeMode: ThemeMode;
  customTheme: CustomTheme;
  notificationsEnabled: boolean;
  notificationsReminderDismissedAt: number | null;
  walletAccessBiometricEnabled: boolean;
  confirmTransactionsBiometricEnabled: boolean;
  appLockEnabled: boolean;
  isLoading: boolean;
};

type PreferencesActions = {
  hydrate: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setCustomTheme: (theme: CustomTheme) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setNotificationsReminderDismissedAt: (timestamp: number | null) => Promise<void>;
  setWalletAccessBiometricEnabled: (enabled: boolean) => Promise<void>;
  setConfirmTransactionsBiometricEnabled: (enabled: boolean) => Promise<void>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
};

type PreferencesStore = PreferencesState & PreferencesActions;

const DEFAULT_CUSTOM_THEME: CustomTheme = {
  accent: "#14B8A6",
  background: "#06161A",
};

const THEME_MODE_KEY = "percel_user_theme_mode";
const CUSTOM_THEME_KEY = "percel_user_custom_theme";
const NOTIFICATIONS_KEY = "percel_user_notifications_enabled";
const NOTIFICATIONS_REMINDER_KEY = "percel_user_notifications_reminder_dismissed_at";
const WALLET_ACCESS_BIOMETRIC_KEY = "percel_user_wallet_access_biometric_enabled";
const CONFIRM_TRANSACTIONS_BIOMETRIC_KEY = "percel_user_confirm_transactions_biometric_enabled";
const APP_LOCK_KEY = "percel_user_app_lock_enabled";

let state: PreferencesState = {
  themeMode: "system",
  customTheme: DEFAULT_CUSTOM_THEME,
  notificationsEnabled: false,
  notificationsReminderDismissedAt: null,
  walletAccessBiometricEnabled: false,
  confirmTransactionsBiometricEnabled: false,
  appLockEnabled: false,
  isLoading: true,
};

const listeners = new Set<() => void>();
let snapshot: PreferencesStore;

function emit() {
  snapshot = { ...state, ...actions };
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<PreferencesState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parseCustomTheme(raw: string | null): CustomTheme {
  if (!raw) return DEFAULT_CUSTOM_THEME;
  try {
    const parsed = JSON.parse(raw) as Partial<CustomTheme>;
    if (typeof parsed.accent === "string" && typeof parsed.background === "string") {
      return { accent: parsed.accent, background: parsed.background };
    }
  } catch {
    // Ignore malformed persisted theme data and fall back to defaults.
  }
  return DEFAULT_CUSTOM_THEME;
}

async function hydrate() {
  setState({ isLoading: true });
  const [themeModeRaw, customThemeRaw, notificationsRaw, notificationsReminderRaw, walletAccessBiometricRaw, confirmTransactionsBiometricRaw, appLockRaw] = await Promise.all([
    AsyncStorage.getItem(THEME_MODE_KEY),
    AsyncStorage.getItem(CUSTOM_THEME_KEY),
    AsyncStorage.getItem(NOTIFICATIONS_KEY),
    AsyncStorage.getItem(NOTIFICATIONS_REMINDER_KEY),
    AsyncStorage.getItem(WALLET_ACCESS_BIOMETRIC_KEY),
    AsyncStorage.getItem(CONFIRM_TRANSACTIONS_BIOMETRIC_KEY),
    AsyncStorage.getItem(APP_LOCK_KEY),
  ]);

  setState({
    themeMode: themeModeRaw === "light" || themeModeRaw === "dark" || themeModeRaw === "custom" ? themeModeRaw : "system",
    customTheme: parseCustomTheme(customThemeRaw),
    notificationsEnabled: notificationsRaw == null ? false : notificationsRaw === "true",
    notificationsReminderDismissedAt: notificationsReminderRaw ? Number(notificationsReminderRaw) || null : null,
    walletAccessBiometricEnabled: walletAccessBiometricRaw == null ? false : walletAccessBiometricRaw === "true",
    confirmTransactionsBiometricEnabled: confirmTransactionsBiometricRaw == null ? false : confirmTransactionsBiometricRaw === "true",
    appLockEnabled: appLockRaw == null ? false : appLockRaw === "true",
    isLoading: false,
  });
}

async function setThemeMode(mode: ThemeMode) {
  state = { ...state, themeMode: mode };
  await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  emit();
}

async function setCustomTheme(theme: CustomTheme) {
  state = { ...state, customTheme: theme };
  await AsyncStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(theme));
  emit();
}

async function setNotificationsEnabled(enabled: boolean) {
  state = { ...state, notificationsEnabled: enabled };
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? "true" : "false");
  emit();
}

async function setNotificationsReminderDismissedAt(timestamp: number | null) {
  state = { ...state, notificationsReminderDismissedAt: timestamp };
  if (timestamp == null) {
    await AsyncStorage.removeItem(NOTIFICATIONS_REMINDER_KEY);
  } else {
    await AsyncStorage.setItem(NOTIFICATIONS_REMINDER_KEY, String(timestamp));
  }
  emit();
}

async function setWalletAccessBiometricEnabled(enabled: boolean) {
  state = { ...state, walletAccessBiometricEnabled: enabled, appLockEnabled: enabled };
  await AsyncStorage.setItem(WALLET_ACCESS_BIOMETRIC_KEY, enabled ? "true" : "false");
  await AsyncStorage.setItem(APP_LOCK_KEY, enabled ? "true" : "false");
  emit();
}

async function setConfirmTransactionsBiometricEnabled(enabled: boolean) {
  state = { ...state, confirmTransactionsBiometricEnabled: enabled };
  await AsyncStorage.setItem(CONFIRM_TRANSACTIONS_BIOMETRIC_KEY, enabled ? "true" : "false");
  emit();
}

async function setAppLockEnabled(enabled: boolean) {
  await setWalletAccessBiometricEnabled(enabled);
}

const actions: PreferencesActions = {
  hydrate,
  setThemeMode,
  setCustomTheme,
  setNotificationsEnabled,
  setNotificationsReminderDismissedAt,
  setWalletAccessBiometricEnabled,
  setConfirmTransactionsBiometricEnabled,
  setAppLockEnabled,
};

snapshot = { ...state, ...actions };

type UsePreferencesStore = {
  <T>(selector: (store: PreferencesStore) => T): T;
  getState: () => PreferencesStore;
};

export const usePreferencesStore = ((selector: (store: PreferencesStore) => unknown) => {
  return useSyncExternalStore(subscribe, () => selector(snapshot), () => selector(snapshot));
}) as UsePreferencesStore;

usePreferencesStore.getState = () => snapshot;
