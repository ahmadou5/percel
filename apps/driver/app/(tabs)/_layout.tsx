import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@percel/shared/constants';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useDriverStore } from '@/store/driver.store';

export { ErrorBoundary } from '@/components/AppErrorBoundary';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isLoading = useDriverStore((state) => state.isLoading);
  const driverStatus = useDriverStore((state) => state.driver?.status);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (driverStatus !== 'ACTIVE') {
    return <Redirect href="/(kyc)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} /> }} />
      <Tabs.Screen name="active" options={{ title: 'Active', tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} /> }} />
    </Tabs>
  );
}
