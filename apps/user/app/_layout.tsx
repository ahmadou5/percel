import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { UserRuntime } from "@/components/UserRuntime";
import { useAppPalette, buildNavigationTheme } from "@/lib/theme";
import { initSentry } from "@/lib/sentry";
import { useAuthStore } from "@/store/auth.store";
import { usePreferencesStore } from "@/store/preferences.store";

export { ErrorBoundary } from "@/components/AppErrorBoundary";

SplashScreen.preventAutoHideAsync();
initSentry();
const queryClient = new QueryClient();

function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...FontAwesome.font,
  });

  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);
  const palette = useAppPalette();
  const preferencesLoading = usePreferencesStore((s) => s.isLoading);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    if (loaded && !isAuthLoading && !preferencesLoading) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, isAuthLoading, preferencesLoading]);

  if (!loaded || isAuthLoading || preferencesLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg }}>
        <FontAwesome name="spinner" size={20} color={palette.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <UserRuntime />
        <RootLayoutNav />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayoutWithSentry() {
  initSentry();
  return <RootLayout />;
}

function RootLayoutNav() {
  const palette = useAppPalette();

  return (
    <ThemeProvider value={buildNavigationTheme(palette)}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
