import { Stack } from 'expo-router';
import React from 'react';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="transfer" />
      <Stack.Screen name="topup" />
      <Stack.Screen name="airtime" />
      <Stack.Screen name="data" />
      <Stack.Screen name="electricity" />
      <Stack.Screen name="tv" />
      <Stack.Screen name="transactions" />
    </Stack>
  );
}
