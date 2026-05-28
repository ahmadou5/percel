import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import 'react-native-reanimated';

import { DriverRuntime } from '@/components/DriverRuntime';
import { useColorScheme } from '@/components/useColorScheme';
import { Sentry, initSentry } from '@/lib/sentry';
import { useDriverStore } from '@/store/driver.store';

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
    ...FontAwesome.font,
  });

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const hydrate = useDriverStore((state) => state.hydrate);
  const isLoading = useDriverStore((state) => state.isLoading);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (loaded && !isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  if (!loaded || isLoading) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DriverRuntime />
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(kyc)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
