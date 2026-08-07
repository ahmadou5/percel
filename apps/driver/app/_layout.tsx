import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View, Image, LogBox, NativeModules } from 'react-native';
import 'react-native-reanimated';
import { vexo } from 'vexo-analytics';

if (typeof self === 'undefined') {
  (global as any).self = global;
}

let LogRocket: any = null;
try {
  LogRocket = require('@logrocket/react-native')?.default || require('@logrocket/react-native');
} catch {
  // Safe fallback for web/SSG export
}

LogBox.ignoreAllLogs();

import { DriverRuntime } from '@/components/DriverRuntime';
import { MaintenanceOverlay } from '@/components/MaintenanceOverlay';
import { Sentry, initSentry, isSentryInitialized } from '@/lib/sentry';
import { useDriverStore } from '@/store/driver.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { useAppPalette, buildNavigationTheme, isLight } from '@/lib/theme';
import { StatusBar } from 'expo-status-bar';

import { ThemedSplashScreen } from '@/components/ThemedSplashScreen';
import { PRESET_THEMES } from '@/constants/theme-presets';

export { ErrorBoundary } from '@/components/AppErrorBoundary';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();
initSentry();
vexo('1d748634-e842-4103-97e1-9ea3ef10abbb')


const queryClient = new QueryClient();

function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...FontAwesome.font,
  });

  const hydrate = useDriverStore((state) => state.hydrate);
  const isLoading = useDriverStore((state) => state.isLoading);

  const hydratePreferences = usePreferencesStore((state) => state.hydrate);
  const preferencesLoading = usePreferencesStore((state) => state.isLoading);
  const activePresetId = usePreferencesStore((state) => state.activePresetId);
  const palette = useAppPalette();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (LogRocket && (NativeModules.RNLogRocket || NativeModules.LogRocket)) {
      try {
        LogRocket.init('wcpsf8/percel');
      } catch {}
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    void hydratePreferences();
  }, []);

  useEffect(() => {
    if (loaded && !isLoading && !preferencesLoading) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, isLoading, preferencesLoading]);

  if (!loaded || isLoading || preferencesLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg }}>
        <Image
          source={require("../assets/images/splash-icon.png")}
          style={{ width: 84, height: 84, resizeMode: "contain", marginBottom: 20 }}
        />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isLight(palette.bg) ? 'dark' : 'light'} />
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

export default function RootLayoutWithSentry() {
  if (!isSentryInitialized()) {
    return <RootLayout />;
  }

  const WrappedRootLayout = Sentry.wrap(RootLayout);
  return <WrappedRootLayout />;
}

function RootLayoutNav() {
  const palette = useAppPalette();

  return (
    <ThemeProvider value={buildNavigationTheme(palette)}>
      <DriverRuntime />
      <MaintenanceOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(kyc)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/security" />
        <Stack.Screen name="settings/preferences" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/vehicle" />
        <Stack.Screen name="support/index" />
        <Stack.Screen name="support/create" />
        <Stack.Screen name="support/[id]" />
        <Stack.Screen name="auth-lock" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
