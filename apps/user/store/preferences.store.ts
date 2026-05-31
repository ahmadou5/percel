import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

type PreferencesState = {
  notificationsEnabled: boolean;
  appLockEnabled: boolean;
  isLoading: boolean;
};

type PreferencesActions = {
  hydrate: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
};

type PreferencesStore = PreferencesState & PreferencesActions;

const NOTIFICATIONS_KEY = 'percel_user_notifications_enabled';
const APP_LOCK_KEY = 'percel_user_app_lock_enabled';

let state: PreferencesState = {
  notificationsEnabled: true,
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

async function hydrate() {
  setState({ isLoading: true });
  const [notificationsRaw, appLockRaw] = await Promise.all([
    SecureStore.getItemAsync(NOTIFICATIONS_KEY),
    SecureStore.getItemAsync(APP_LOCK_KEY),
  ]);

  setState({
    notificationsEnabled: notificationsRaw == null ? true : notificationsRaw === 'true',
    appLockEnabled: appLockRaw == null ? false : appLockRaw === 'true',
    isLoading: false,
  });
}

async function setNotificationsEnabled(enabled: boolean) {
  state = { ...state, notificationsEnabled: enabled };
  await SecureStore.setItemAsync(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
  emit();
}

async function setAppLockEnabled(enabled: boolean) {
  state = { ...state, appLockEnabled: enabled };
  await SecureStore.setItemAsync(APP_LOCK_KEY, enabled ? 'true' : 'false');
  emit();
}

const actions: PreferencesActions = {
  hydrate,
  setNotificationsEnabled,
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
