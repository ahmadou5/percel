import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { DriverRuntime } from '@/components/DriverRuntime';
import { Sentry, initSentry, isSentryInitialized } from '@/lib/sentry';
import { useDriverStore } from '@/store/driver.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { useAppPalette, buildNavigationTheme } from '@/lib/theme';

export { ErrorBoundary } from '@/components/AppErrorBoundary';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();
initSentry();

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
  const palette = useAppPalette();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    if (loaded && !isLoading && !preferencesLoading) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, isLoading, preferencesLoading]);

  if (!loaded || isLoading || preferencesLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator size="small" color={palette.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DriverRuntime />
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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(kyc)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth-lock" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
