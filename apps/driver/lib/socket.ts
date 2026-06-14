/* eslint-disable */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useDriverStore } from '@/store/driver.store';

type EventHandler = (payload: any) => void;

const listeners = new Map<string, Set<EventHandler>>();
let socket: any = null;

function requireSocketIoClient() {
  try {
    return require('socket.io-client');
  } catch {
    return null;
  }
}

function requireNetInfo() {
  try {
    return require('@react-native-community/netinfo');
  } catch {
    return null;
  }
}

function getSocketUrl() {
  return process.env.EXPO_PUBLIC_SOCKET_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '';
}

function emitLocal(event: string, payload: any) {
  const handlers = listeners.get(event);
  handlers?.forEach((handler) => {
    try {
      handler(payload);
    } catch {
      // keep listener failures isolated
    }
  });
}

function bindSocketEvents() {
  if (!socket) return;

  ['new_order_available', 'order_cancelled', 'order_status_update', 'driver_location'].forEach((event) => {
    socket.off?.(event);
    socket.on?.(event, (payload: any) => emitLocal(event, payload));
  });
}

export function subscribeDriverSocket(event: string, handler: EventHandler) {
  const handlers = listeners.get(event) ?? new Set<EventHandler>();
  handlers.add(handler);
  listeners.set(event, handlers);

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) listeners.delete(event);
  };
}

export function listenForOrders(handler: EventHandler) {
  return subscribeDriverSocket('new_order_available', handler);
}

export function emitDriverEvent(event: string, payload: any) {
  emitLocal(event, payload);
  socket?.emit?.(event, payload);
}

export function goOnline(payload: { lat?: number; lng?: number } = {}) {
  const driver = useDriverStore.getState().driver;
  if (!driver) return;
  emitDriverEvent('go_online', { driverId: driver.id, ...payload });
}

export function goOffline() {
  const driver = useDriverStore.getState().driver;
  if (!driver) return;
  emitDriverEvent('go_offline', { driverId: driver.id });
}

export function emitLocation(coords: { lat: number; lng: number; heading?: number; speed?: number }) {
  const driver = useDriverStore.getState().driver;
  if (!driver) return;
  emitDriverEvent('location_update', { driverId: driver.id, ...coords });
}

export function connectDriverSocket() {
  const session = useDriverStore.getState();
  if (!session.isAuthenticated || !session.isOnline) return null;

  const io = requireSocketIoClient();
  if (!io?.io && typeof io !== 'function') return null;

  if (!socket) {
    const token = session.tokens?.accessToken;
    const url = `${getSocketUrl().replace(/\/$/, '')}/driver`;
    const createSocket = io.io ?? io;
    socket = createSocket(url, {
      autoConnect: false,
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
    bindSocketEvents();
    socket.connect?.();
    const driver = session.driver ?? null;
    if (driver) {
      socket.emit?.('go_online', {
        driverId: driver.id,
        lat: driver.currentLocation?.lat ?? 0,
        lng: driver.currentLocation?.lng ?? 0,
      });
    }
  }

  return socket;
}

export function disconnectDriverSocket() {
  if (!socket) return;
  const driver = useDriverStore.getState().driver;
  if (driver) {
    socket.emit?.('go_offline', { driverId: driver.id });
    socket.emit?.('driver_offline', { driverId: driver.id });
  }
  socket.disconnect?.();
  socket.removeAllListeners?.();
  socket = null;
}

export function useDriverSocketLifecycle() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isOnline = useDriverStore((state) => state.isOnline);

  useEffect(() => {
    const netInfo = requireNetInfo();
    if (isAuthenticated && isOnline) {
      connectDriverSocket();
    } else {
      disconnectDriverSocket();
    }

    const activeListener = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isAuthenticated && isOnline) {
        connectDriverSocket();
        return;
      }

      disconnectDriverSocket();
    });

    const unsubscribeNetInfo = netInfo?.addEventListener?.((state: { isConnected?: boolean }) => {
      if (state.isConnected && isAuthenticated && isOnline) {
        connectDriverSocket();
      }
    });


    return () => {
      activeListener.remove();
      unsubscribeNetInfo?.();
    };
  }, [isAuthenticated, isOnline]);
}
