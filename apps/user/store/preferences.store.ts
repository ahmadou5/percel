import { useSyncExternalStore } from "react";

// Safe AsyncStorage wrapper to prevent startup crashes when the native module is missing (e.g. in outdated native builds or web/test environments)
let nativeAsyncStorage: any = null;
try {
  nativeAsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  // Safe fallback when native module throws during load
}

const memoryStorage = new Map<string, string>();
const AsyncStorage = {
  getItem: async (key: string) => {
    try {
      if (!nativeAsyncStorage) return memoryStorage.get(key) ?? null;
      return await nativeAsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (!nativeAsyncStorage) {
        memoryStorage.set(key, value);
        return;
      }
      await nativeAsyncStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (!nativeAsyncStorage) {
        memoryStorage.delete(key);
        return;
      }
      await nativeAsyncStorage.removeItem(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};

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
  allowScreenshots: boolean;
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
  setAllowScreenshots: (enabled: boolean) => Promise<void>;
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
const ALLOW_SCREENSHOTS_KEY = "percel_user_allow_screenshots";

let state: PreferencesState = {
  themeMode: "system",
  customTheme: DEFAULT_CUSTOM_THEME,
  notificationsEnabled: false,
  notificationsReminderDismissedAt: null,
  walletAccessBiometricEnabled: false,
  confirmTransactionsBiometricEnabled: false,
  appLockEnabled: false,
  allowScreenshots: false,
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
  const [themeModeRaw, customThemeRaw, notificationsRaw, notificationsReminderRaw, walletAccessBiometricRaw, confirmTransactionsBiometricRaw, appLockRaw, allowScreenshotsRaw] = await Promise.all([
    AsyncStorage.getItem(THEME_MODE_KEY),
    AsyncStorage.getItem(CUSTOM_THEME_KEY),
    AsyncStorage.getItem(NOTIFICATIONS_KEY),
    AsyncStorage.getItem(NOTIFICATIONS_REMINDER_KEY),
    AsyncStorage.getItem(WALLET_ACCESS_BIOMETRIC_KEY),
    AsyncStorage.getItem(CONFIRM_TRANSACTIONS_BIOMETRIC_KEY),
    AsyncStorage.getItem(APP_LOCK_KEY),
    AsyncStorage.getItem(ALLOW_SCREENSHOTS_KEY),
  ]);

  setState({
    themeMode: themeModeRaw === "light" || themeModeRaw === "dark" || themeModeRaw === "custom" ? themeModeRaw : "system",
    customTheme: parseCustomTheme(customThemeRaw),
    notificationsEnabled: notificationsRaw == null ? false : notificationsRaw === "true",
    notificationsReminderDismissedAt: notificationsReminderRaw ? Number(notificationsReminderRaw) || null : null,
    walletAccessBiometricEnabled: walletAccessBiometricRaw == null ? false : walletAccessBiometricRaw === "true",
    confirmTransactionsBiometricEnabled: confirmTransactionsBiometricRaw == null ? false : confirmTransactionsBiometricRaw === "true",
    appLockEnabled: appLockRaw == null ? false : appLockRaw === "true",
    allowScreenshots: allowScreenshotsRaw == null ? false : allowScreenshotsRaw === "true",
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

async function setAllowScreenshots(enabled: boolean) {
  state = { ...state, allowScreenshots: enabled };
  await AsyncStorage.setItem(ALLOW_SCREENSHOTS_KEY, enabled ? "true" : "false");
  emit();
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
  setAllowScreenshots,
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
