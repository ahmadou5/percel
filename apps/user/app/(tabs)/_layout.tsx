import { Redirect, Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { useAuthStore } from "@/store/auth.store";

export { ErrorBoundary } from "@/components/AppErrorBoundary";

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Create",
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Settings",
        }}
      />
      <Tabs.Screen name="wallet" options={{ href: null }} />
     
    </Tabs>
  );
}
