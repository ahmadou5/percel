import { Redirect } from 'expo-router';

import { useDriverStore } from '@/store/driver.store';

export default function AuthIndex() {
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const driverStatus = useDriverStore((state) => state.driver?.status);

  if (isAuthenticated && driverStatus === 'ACTIVE') {
    return <Redirect href="/(tabs)" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(kyc)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
