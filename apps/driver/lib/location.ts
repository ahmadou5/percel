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

  const payload = {
    driverId: driver.id,
    lat,
    lng,
    heading,
    speed,
  };

  await useDriverStore.getState().updateLocation({ lat, lng });
  emitDriverEvent('location_update', payload);

  try {
    await http.patch('/api/v1/driver/location', payload);
  } catch {
    // best effort sync
  }
}

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

async function ensureBackgroundTracking() {
  if (!Location) return;

  const foreground = await Location.requestForegroundPermissionsAsync();
  const background = await Location.requestBackgroundPermissionsAsync?.();

  if (foreground.status !== 'granted' || (background && background.status !== 'granted')) {
    return;
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync?.(TASK_NAME);
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy?.Balanced ?? 1,
      deferredUpdatesInterval: 15_000,
      distanceInterval: 25,
      foregroundService: {
        notificationTitle: 'Percel driver tracking',
        notificationBody: 'Live location is being shared while you are online.',
      },
      pausesUpdatesAutomatically: true,
    });
  }

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
}

async function stopBackgroundTracking() {
  if (!Location) return;
  const started = await Location.hasStartedLocationUpdatesAsync?.(TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
}

export function useDriverLocation() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isOnline = useDriverStore((state) => state.isOnline);

  useEffect(() => {
    if (!isAuthenticated || !isOnline) {
      void stopBackgroundTracking();
      return;
    }

    void ensureBackgroundTracking();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void ensureBackgroundTracking();
        return;
      }

      void stopBackgroundTracking();
    });

    const interval = setInterval(() => {
      const location = useDriverStore.getState().currentLocation ?? { lat: 6.5244, lng: 3.3792 };
      void pushLocation(location.lat, location.lng);
    }, 45_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
      void stopBackgroundTracking();
    };
  }, [isAuthenticated, isOnline]);
}

export async function simulateLocation(lat: number, lng: number) {
  await pushLocation(lat, lng);
}
