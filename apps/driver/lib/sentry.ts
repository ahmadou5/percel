import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? Constants.expoConfig?.extra?.sentryDsn ?? '';

let initialized = false;

export function initSentry() {
  if (initialized || !dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });

  initialized = true;
}

export function isSentryInitialized() {
  return initialized;
}

export { Sentry };
