import { Stack } from 'expo-router';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: '700' }, headerShown: false
      
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="topup" options={{ title: 'Top Up',  headerShown: false }} />
      <Stack.Screen name="transfer" options={{ title: 'Transfer',  headerShown: false }} />
      <Stack.Screen name="bills" options={{ title: 'Bills',  headerShown: false }} />
      <Stack.Screen name="airtime" options={{ title: 'Airtime', headerShown: false }} />
      <Stack.Screen name="data" options={{ title: 'Data', headerShown: false }} />
      <Stack.Screen name="tv" options={{ title: 'TV Subscription', headerShown: false }} />
      <Stack.Screen name="electricity" options={{ title: 'Electricity',  headerShown: false }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions',  headerShown: false }} />
      <Stack.Screen name="callback" options={{ title: 'Payment Status',  headerShown: false }} />
    </Stack>
  );
}
