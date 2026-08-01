/* eslint-disable */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/store/auth.store';

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

  ['order_status_update', 'driver_location', 'wallet_updated', 'chat_message', 'typing', 'stop_typing'].forEach((event) => {
    socket.off?.(event);
    socket.on?.(event, (payload: any) => emitLocal(event, payload));
  });
}

export function subscribeUserSocket(event: string, handler: EventHandler) {
  const handlers = listeners.get(event) ?? new Set<EventHandler>();
  handlers.add(handler);
  listeners.set(event, handlers);

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) listeners.delete(event);
  };
}

export function subscribeToOrderUpdates(orderId: string, handler: EventHandler) {
  return subscribeUserSocket('order_status_update', (payload: any) => {
    if (!orderId || payload?.orderId !== orderId) return;
    handler(payload);
  });
}

export function subscribeToDriverLocation(driverId: string, handler: EventHandler) {
  return subscribeUserSocket('driver_location', (payload: any) => {
    if (!driverId || payload?.driverId !== driverId) return;
    handler(payload);
  });
}

export function subscribeToOrderChat(orderId: string, handler: EventHandler) {
  return subscribeUserSocket('chat_message', (payload: any) => {
    if (!orderId || payload?.orderId !== orderId) return;
    handler(payload);
  });
}

export function joinOrderChat(orderId: string) {
  emitUserEvent('join_order_chat', { orderId });
}

export function leaveOrderChat(orderId: string) {
  emitUserEvent('leave_order_chat', { orderId });
}

export function emitTyping(orderId: string, senderType: 'USER' | 'DRIVER' = 'USER') {
  emitUserEvent('typing', { orderId, senderType });
}

export function emitStopTyping(orderId: string, senderType: 'USER' | 'DRIVER' = 'USER') {
  emitUserEvent('stop_typing', { orderId, senderType });
}

export function subscribeToTyping(orderId: string, handler: EventHandler) {
  return subscribeUserSocket('typing', (payload: any) => {
    if (!orderId || payload?.orderId !== orderId) return;
    handler(payload);
  });
}

export function subscribeToStopTyping(orderId: string, handler: EventHandler) {
  return subscribeUserSocket('stop_typing', (payload: any) => {
    if (!orderId || payload?.orderId !== orderId) return;
    handler(payload);
  });
}

export function emitUserEvent(event: string, payload: any) {
  emitLocal(event, payload);
  socket?.emit?.(event, payload);
}

export function connectUserSocket() {
  const session = useAuthStore.getState();
  if (!session.isAuthenticated) return null;

  const io = requireSocketIoClient();
  if (!io?.io && typeof io !== 'function') return null;

  if (!socket) {
    const token = session.tokens?.accessToken;
    const url = `${getSocketUrl().replace(/\/$/, '')}/user`;
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
  }

  return socket;
}

export function disconnectUserSocket() {
  if (!socket) return;
  socket.disconnect?.();
  socket.removeAllListeners?.();
  socket = null;
}

export function useUserSocketLifecycle() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      connectUserSocket();
    } else {
      disconnectUserSocket();
    }

    const activeListener = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isAuthenticated) {
        connectUserSocket();
        return;
      }

      disconnectUserSocket();
    });


    return () => {
      activeListener.remove();
    };
  }, [isAuthenticated]);
}
