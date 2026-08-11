import FontAwesome from "@expo/vector-icons/FontAwesome";
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Image, View, LogBox, NativeModules } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
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

import { TourGuideProvider } from '@wrack/react-native-tour-guide';
import { CustomTooltip } from '@/components/ui/CustomTooltip';
import { UserRuntime } from "@/components/UserRuntime";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { NetworkBanner } from "@/components/ui/NetworkBanner";
import { useAppPalette, buildNavigationTheme, isLight } from "@/lib/theme";
import { StatusBar } from "expo-status-bar";
import { initSentry } from "@/lib/sentry";
import { useAuthStore } from "@/store/auth.store";
import { usePreferencesStore } from "@/store/preferences.store";

export { ErrorBoundary } from "@/components/AppErrorBoundary";

let codePush: any = null;
try {
  codePush = require("@code-push-next/react-native-code-push");
} catch {
  // Safe fallback when running in web or dev mode without native CodePush binary
}


vexo('37952d92-e7de-4b19-ac09-ed62a5e1e8fb')
// Show notifications as banners even when the app is in the foreground.
// Without this handler, Expo silently discards foreground notifications.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
    if (LogRocket && (NativeModules.RNLogRocket || NativeModules.LogRocket)) {
      try {
        LogRocket.init('wcpsf8/percel-user');
      } catch {}
    }
  }, []);
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
        <Image
          source={require("../assets/images/icons/icon-blue.png")}
          style={{ width: 84, height: 84, resizeMode: "contain", marginBottom: 20 }}
        />

      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TourGuideProvider tooltipComponent={CustomTooltip} borderRadius={16} dismissOnPress={true}>
          <StatusBar style={isLight(palette.bg) ? "dark" : "light"} />
          <UserRuntime />
          <RootLayoutNav />
        </TourGuideProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutWithSentry() {
  initSentry();
  return <RootLayout />;
}

const codePushOptions = {
  checkFrequency: codePush?.CheckFrequency?.ON_APP_RESUME ?? 1,
  installMode: codePush?.InstallMode?.ON_NEXT_RESUME ?? 1,
};

export default (codePush && !__DEV__) ? codePush(codePushOptions)(RootLayoutWithSentry) : RootLayoutWithSentry;

function RootLayoutNav() {
  const palette = useAppPalette();

  return (
    <ThemeProvider value={buildNavigationTheme(palette)}>
      <NetworkBanner />
      <MaintenanceOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings/location" />
      </Stack>
    </ThemeProvider>
  );
}
