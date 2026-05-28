import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddressPicker } from '@/components/order/AddressPicker';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

const sampleAddresses = [
  '12 Admiralty Way, Lekki, Lagos, Nigeria',
  '25 Ikorodu Road, Yaba, Lagos, Nigeria',
  '8B GRA Road, Port Harcourt, Rivers, Nigeria',
];

export default function SendOrderEntryScreen() {
  const router = useRouter();
  const [pickup, setPickup] = useState(sampleAddresses[0]);
  const [delivery, setDelivery] = useState(sampleAddresses[1]);

  const swapAddresses = () => {
    setPickup(delivery);
    setDelivery(pickup);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Send waybill</Text>
        <Text style={styles.title}>Set the pickup and delivery addresses first.</Text>
        <Text style={styles.subtitle}>This build uses a clean address-entry flow that can be swapped to a full Places autocomplete later.</Text>
      </View>

      <AddressPicker label="From" value={pickup} onChangeText={setPickup} placeholder="Pickup address" helperText="Tap to edit pickup location." />

      <View style={styles.swapRow}>
        <View style={styles.swapLine} />
        <Pressable onPress={swapAddresses} style={styles.swapButton}>
          <Text style={styles.swapText}>Swap</Text>
        </Pressable>
        <View style={styles.swapLine} />
      </View>

      <AddressPicker label="To" value={delivery} onChangeText={setDelivery} placeholder="Delivery address" helperText="Tap to edit delivery location." />

      <Pressable onPress={() => router.push({ pathname: '/send/package', params: { pickup, delivery } })} style={styles.primary}>
        <Text style={styles.primaryText}>Get Quote</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.md, lineHeight: 22 },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  swapLine: { flex: 1, height: 1, backgroundColor: Colors.light.border },
  swapButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.card },
  swapText: { color: Colors.light.text, fontWeight: Typography.semibold },
  primary: { minHeight: 52, borderRadius: 16, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
