import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth.store';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (isAuthenticated) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
