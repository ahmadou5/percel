import { Stack } from 'expo-router';

export default function SendLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="index" options={{ title: 'New Order' }} />
      <Stack.Screen name="package" options={{ title: 'Package Details' }} />
      <Stack.Screen name="quote" options={{ title: 'Confirm Quote' }} />
      <Stack.Screen name="tracking/[id]" options={{ title: 'Tracking' }} />
    </Stack>
  );
}
