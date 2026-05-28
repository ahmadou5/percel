import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

type PreferencesState = {
  notificationsEnabled: boolean;
  isLoading: boolean;
};

type PreferencesActions = {
  hydrate: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
};

type PreferencesStore = PreferencesState & PreferencesActions;

const KEY = 'percel_user_notifications_enabled';

let state: PreferencesState = {
  notificationsEnabled: true,
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
  const raw = await SecureStore.getItemAsync(KEY);
  setState({ notificationsEnabled: raw == null ? true : raw === 'true', isLoading: false });
}

async function setNotificationsEnabled(enabled: boolean) {
  state = { ...state, notificationsEnabled: enabled };
  await SecureStore.setItemAsync(KEY, enabled ? 'true' : 'false');
  emit();
}

const actions: PreferencesActions = {
  hydrate,
  setNotificationsEnabled,
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
