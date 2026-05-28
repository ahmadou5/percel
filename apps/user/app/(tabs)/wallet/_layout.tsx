import { Stack } from 'expo-router';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="topup" options={{ title: 'Top Up' }} />
      <Stack.Screen name="transfer" options={{ title: 'Transfer' }} />
      <Stack.Screen name="bills" options={{ title: 'Bills' }} />
      <Stack.Screen name="airtime" options={{ title: 'Airtime' }} />
      <Stack.Screen name="data" options={{ title: 'Data' }} />
      <Stack.Screen name="electricity" options={{ title: 'Electricity' }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
    </Stack>
  );
}
