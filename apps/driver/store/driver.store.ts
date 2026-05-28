import type { Driver, DriverLocation } from '@percel/shared';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

import { Sentry } from '@/lib/sentry';
import type { AuthSessionUser, AuthTokens, DriverOrder } from '@/lib/types';

type DriverState = {
  user: AuthSessionUser | null;
  driver: Driver | null;
  tokens: AuthTokens | null;
  isOnline: boolean;
  currentOrder: DriverOrder | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentLocation: DriverLocation | null;
};

type DriverActions = {
  hydrate: () => Promise<void>;
  setSession: (session: { user: AuthSessionUser; tokens: AuthTokens; driver?: Driver | null }) => Promise<void>;
  setUser: (user: AuthSessionUser | null) => void;
  setDriver: (driver: Driver | null) => void;
  setTokens: (tokens: AuthTokens | null) => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => Promise<void>;
  setCurrentOrder: (order: DriverOrder | null) => Promise<void>;
  updateLocation: (location: DriverLocation) => Promise<void>;
  logout: () => Promise<void>;
};

type DriverStore = DriverState & DriverActions;

const USER_KEY = 'percel_driver_user';
const DRIVER_KEY = 'percel_driver_profile';
const TOKENS_KEY = 'percel_driver_tokens';
const ONLINE_KEY = 'percel_driver_online';
const ORDER_KEY = 'percel_driver_current_order';
const LOCATION_KEY = 'percel_driver_location';

let state: DriverState = {
  user: null,
  driver: null,
  tokens: null,
  isOnline: false,
  currentOrder: null,
  isAuthenticated: false,
  isLoading: true,
  currentLocation: null,
};

const listeners = new Set<() => void>();
let snapshot: DriverStore;

function emit() {
  snapshot = { ...state, ...actions };
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<DriverState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function persist() {
  await Promise.all([
    state.user ? SecureStore.setItemAsync(USER_KEY, JSON.stringify(state.user)) : SecureStore.deleteItemAsync(USER_KEY),
    state.driver ? SecureStore.setItemAsync(DRIVER_KEY, JSON.stringify(state.driver)) : SecureStore.deleteItemAsync(DRIVER_KEY),
    state.tokens ? SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(state.tokens)) : SecureStore.deleteItemAsync(TOKENS_KEY),
    SecureStore.setItemAsync(ONLINE_KEY, state.isOnline ? 'true' : 'false'),
    state.currentOrder ? SecureStore.setItemAsync(ORDER_KEY, JSON.stringify(state.currentOrder)) : SecureStore.deleteItemAsync(ORDER_KEY),
    state.currentLocation ? SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(state.currentLocation)) : SecureStore.deleteItemAsync(LOCATION_KEY),
  ]);
}

async function hydrate() {
  setState({ isLoading: true });
  const [rawUser, rawDriver, rawTokens, rawOnline, rawOrder, rawLocation] = await Promise.all([
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(DRIVER_KEY),
    SecureStore.getItemAsync(TOKENS_KEY),
    SecureStore.getItemAsync(ONLINE_KEY),
    SecureStore.getItemAsync(ORDER_KEY),
    SecureStore.getItemAsync(LOCATION_KEY),
  ]);

  const user = rawUser ? (JSON.parse(rawUser) as AuthSessionUser) : null;
  const driver = rawDriver ? (JSON.parse(rawDriver) as Driver) : null;
  const tokens = rawTokens ? (JSON.parse(rawTokens) as AuthTokens) : null;
  const currentOrder = rawOrder ? (JSON.parse(rawOrder) as DriverOrder) : null;
  const currentLocation = rawLocation ? (JSON.parse(rawLocation) as DriverLocation) : null;

  setState({
    user,
    driver,
    tokens,
    currentOrder,
    currentLocation,
    isOnline: rawOnline === 'true' || Boolean(driver?.isOnline),
    isAuthenticated: Boolean(user && tokens),
    isLoading: false,
  });

  Sentry.setUser(user ? { id: user.id, email: user.email } : null);
}

async function setSession(session: { user: AuthSessionUser; tokens: AuthTokens; driver?: Driver | null }) {
  state = {
    ...state,
    user: session.user,
    tokens: session.tokens,
    driver: session.driver ?? state.driver,
    isAuthenticated: true,
  };
  await persist();
  Sentry.setUser({ id: session.user.id, email: session.user.email });
  emit();
}

function setUser(user: AuthSessionUser | null) {
  setState({ user, isAuthenticated: Boolean(user && state.tokens) });
  Sentry.setUser(user ? { id: user.id, email: user.email } : null);
}

function setDriver(driver: Driver | null) {
  setState({ driver, isOnline: Boolean(driver?.isOnline ?? state.isOnline) });
}

async function setTokens(tokens: AuthTokens | null) {
  state = { ...state, tokens, isAuthenticated: Boolean(state.user && tokens) };
  await persist();
  if (!tokens && !state.user) {
    Sentry.setUser(null);
  }
  emit();
}

async function setOnlineStatus(isOnline: boolean) {
  state = {
    ...state,
    isOnline,
    driver: state.driver ? { ...state.driver, isOnline } : state.driver,
  };
  await persist();
  emit();
}

async function setCurrentOrder(order: DriverOrder | null) {
  state = { ...state, currentOrder: order };
  await persist();
  emit();
}

async function updateLocation(location: DriverLocation) {
  state = {
    ...state,
    currentLocation: location,
    driver: state.driver ? { ...state.driver, currentLocation: location } : state.driver,
  };
  await persist();
  emit();
}

async function logout() {
  await Promise.all([
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(DRIVER_KEY),
    SecureStore.deleteItemAsync(TOKENS_KEY),
    SecureStore.deleteItemAsync(ONLINE_KEY),
    SecureStore.deleteItemAsync(ORDER_KEY),
    SecureStore.deleteItemAsync(LOCATION_KEY),
  ]);
  state = {
    user: null,
    driver: null,
    tokens: null,
    isOnline: false,
    currentOrder: null,
    isAuthenticated: false,
    isLoading: false,
    currentLocation: null,
  };
  Sentry.setUser(null);
  emit();
}

const actions: DriverActions = {
  hydrate,
  setSession,
  setUser,
  setDriver,
  setTokens,
  setOnlineStatus,
  setCurrentOrder,
  updateLocation,
  logout,
};

snapshot = { ...state, ...actions };

type UseDriverStore = {
  <T>(selector: (store: DriverStore) => T): T;
  getState: () => DriverStore;
};

export const useDriverStore = ((selector: (store: DriverStore) => unknown) => {
  return useSyncExternalStore(subscribe, () => selector(snapshot), () => selector(snapshot));
}) as UseDriverStore;

useDriverStore.getState = () => snapshot;
