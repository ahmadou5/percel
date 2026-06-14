import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useDriverStore } from '@/store/driver.store';

export { ErrorBoundary } from '@/components/AppErrorBoundary';

export default function TabLayout() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isLoading = useDriverStore((state) => state.isLoading);
  const driverStatus = useDriverStore((state) => state.driver?.status);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (driverStatus !== 'ACTIVE') return <Redirect href="/(kyc)" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home"     options={{ title: 'Home' }} />
      <Tabs.Screen name="active"   options={{ title: 'Active' }} />
      <Tabs.Screen name="history"  options={{ title: 'History' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
    </Tabs>
  );
}
