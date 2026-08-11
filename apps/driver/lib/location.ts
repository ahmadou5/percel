/* eslint-disable */
import { AppState } from 'react-native';
import { useEffect } from 'react';

import { http } from '@/lib/api';
import { emitDriverEvent } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';

type LocationPayload = {
  coords: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
};

const TASK_NAME = 'driver-location';

function requireExpoLocation() {
  try {
    return require('expo-location');
  } catch {
    return null;
  }
}

function requireExpoTaskManager() {
  try {
    return require('expo-task-manager');
  } catch {
    return null;
  }
}

const Location = requireExpoLocation();
const TaskManager = requireExpoTaskManager();

async function pushLocation(lat: number, lng: number, heading = 0, speed = 0) {
  const driver = useDriverStore.getState().driver;
  if (!driver) return;

  const payload = { driverId: driver.id, lat, lng, heading, speed };
  await useDriverStore.getState().updateLocation({ lat, lng });
  emitDriverEvent('location_update', payload);

  try {
    await http.patch('/api/v1/driver/location', payload);
  } catch {
    // best-effort sync; not critical if it fails
  }
}

// Register the background task definition (must happen at module scope)
if (TaskManager?.defineTask) {
  TaskManager.defineTask(
    TASK_NAME,
    async ({ data, error }: { data?: { locations?: LocationPayload[] }; error?: Error }) => {
      if (error || !data?.locations?.length) return;
      const latest = data.locations[data.locations.length - 1];
      await pushLocation(
        latest.coords.latitude,
        latest.coords.longitude,
        latest.coords.heading ?? 0,
        latest.coords.speed ?? 0,
      );
    },
  );
}

/**
 * Attempt to start the background location service.
 *
 * Key invariant: we re-check AppState.currentState === 'active' immediately
 * before calling startLocationUpdatesAsync because there are multiple awaits
 * between the guard at the top of the function and that call.  Android throws
 * "Foreground service cannot be started when the application is in the
 * background" if we violate this.
 */
async function ensureBackgroundTracking() {
  if (!Location) return;

  // ── 1. First early-exit: must be in foreground before we do anything ────
  if (AppState.currentState !== 'active') return;

  try {
    // Request permissions (each is an await — app state may change here)
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') return;

    const background = await Location.requestBackgroundPermissionsAsync?.();
    if (background && background.status !== 'granted') return;

    // ── 2. Second guard: re-verify we are still in the foreground before
    //    starting the service.  This is the critical fix — without it, the
    //    single check at the top can race against the awaits above. ─────────
    if (AppState.currentState !== 'active') return;

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync?.(TASK_NAME);
    if (!alreadyStarted) {
      // ── 3. Third guard: one more check right before the call that throws ──
      if (AppState.currentState !== 'active') return;

      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy?.Balanced ?? 1,
        deferredUpdatesInterval: 15_000,
        distanceInterval: 25,
        foregroundService: {
          notificationTitle: 'Percel — live tracking',
          notificationBody: 'Your location is being shared while you are online.',
        },
        pausesUpdatesAutomatically: true,
      });
    }

    // Push the current position immediately after starting the service
    const current = await Location.getCurrentPositionAsync?.({
      accuracy: Location.Accuracy?.Balanced ?? 1,
    });
    if (current?.coords) {
      await pushLocation(
        current.coords.latitude,
        current.coords.longitude,
        current.coords.heading ?? 0,
        current.coords.speed ?? 0,
      );
    }
  } catch (e: unknown) {
    // Swallow the "cannot start in background" error silently — it is harmless
    // because we will retry when the app returns to foreground.
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes('background')) {
      console.warn('[location] tracking error:', msg);
    }
  }
}

/**
 * Push a one-shot position without trying to start the background service.
 * Safe to call from anywhere because it only uses getCurrentPositionAsync.
 */
async function pushCurrentPosition() {
  if (!Location) return;
  try {
    const current = await Location.getCurrentPositionAsync?.({
      accuracy: Location.Accuracy?.Balanced ?? 1,
    });
    if (current?.coords) {
      await pushLocation(
        current.coords.latitude,
        current.coords.longitude,
        current.coords.heading ?? 0,
        current.coords.speed ?? 0,
      );
    }
  } catch {
    // If the device has no GPS fix yet, ignore — interval will retry
  }
}

async function stopBackgroundTracking() {
  if (!Location) return;
  try {
    const started = await Location.hasStartedLocationUpdatesAsync?.(TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    }
  } catch {
    // ignore
  }
}

export function useDriverLocation() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isOnline = useDriverStore((state) => state.isOnline);

  useEffect(() => {
    if (isAuthenticated) {
      void pushCurrentPosition();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !isOnline) {
      // Driver went offline — stop the background service
      void stopBackgroundTracking();
      return;
    }

    // Try to start background tracking (safe — has three AppState guards)
    void ensureBackgroundTracking();

    // When app comes back to foreground, try to (re-)start the service
    // When app goes to background, we intentionally do NOT stop it — the
    // foreground service notification keeps it alive on Android.
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void ensureBackgroundTracking();
      }
    });

    // Heartbeat: push location every 45 s so the server always has a fresh fix
    // even when the background task fires less frequently.
    const interval = setInterval(() => {
      void pushCurrentPosition();
    }, 45_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [isAuthenticated, isOnline]);
}

export async function simulateLocation(lat: number, lng: number) {
  await pushLocation(lat, lng);
}
