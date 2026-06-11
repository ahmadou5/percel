import { useRouter } from 'expo-router';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeftRight, ChevronLeft, MapPin } from 'lucide-react-native';

import { AddressPicker } from '@/components/order/AddressPicker';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

const sampleAddresses = [
  '12 Admiralty Way, Lekki, Lagos, Nigeria',
  '25 Ikorodu Road, Yaba, Lagos, Nigeria',
  '8B GRA Road, Port Harcourt, Rivers, Nigeria',
];

export default function SendOrderEntryScreen() {
  const router = useRouter();
  const back = useSafeBack('/');
  const palette = useAppPalette();
  const [pickup, setPickup] = useState(sampleAddresses[0]);
  const [delivery, setDelivery] = useState(sampleAddresses[1]);

  const swapAddresses = () => {
    setPickup(delivery);
    setDelivery(pickup);
  };

  const canContinue = pickup.trim().length > 4 && delivery.trim().length > 4;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back button */}
       <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => back()}
        >
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      {/* Hero copy */}
      <View style={styles.hero}>
       
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Send waybill</Text>
        <Text style={[styles.title, { color: palette.text }]}>Where is the package going?</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          Set the pickup and delivery addresses to get an instant delivery quote.
        </Text>
      </View>

      {/* Address inputs */}
      <View style={[styles.addressCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {/* Pickup */}
        <View style={styles.addressRow}>
          <View style={[styles.dotWrap, { backgroundColor: `${palette.primary}1A` }]}>
            <View style={[styles.dotInner, { backgroundColor: palette.primary }]} />
          </View>
          <View style={styles.addressField}>
            <AddressPicker
              label="Pickup address"
              value={pickup}
              onChangeText={setPickup}
              placeholder="Where should we pick it up?"
              helperText="Enter the full pickup address"
            />
          </View>
        </View>

        {/* Swap divider */}
        <View style={styles.swapRow}>
          <View style={[styles.swapLine, { backgroundColor: palette.border }]} />
          <Pressable
            onPress={swapAddresses}
            style={({ pressed }) => [
              styles.swapButton,
              { borderColor: palette.border, backgroundColor: pressed ? `${palette.primary}1A` : palette.bg },
            ]}
          >
            <ArrowLeftRight size={16} color={palette.primary} />
          </Pressable>
          <View style={[styles.swapLine, { backgroundColor: palette.border }]} />
        </View>

        {/* Delivery */}
        <View style={styles.addressRow}>
          <View style={[styles.dotWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <MapPin size={14} color="#10B981" />
          </View>
          <View style={styles.addressField}>
            <AddressPicker
              label="Delivery address"
              value={delivery}
              onChangeText={setDelivery}
              placeholder="Where should we deliver it?"
              helperText="Enter the full delivery address"
            />
          </View>
        </View>
      </View>

      {/* CTA */}
      <Pressable
        onPress={() => router.push({ pathname: '/send/package', params: { pickup, delivery } })}
        disabled={!canContinue}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: canContinue ? palette.primary : palette.border },
          pressed && canContinue && { opacity: 0.88 },
        ]}
      >
        <Text style={styles.primaryText}>Get Quote</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: Spacing.sm, paddingTop: Spacing.sm },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Typography.family.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.md,
    lineHeight: 22,
    fontFamily: Typography.family.regular,
  },
  addressCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  addressRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dotWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    flexShrink: 0,
  },
  dotInner: { width: 8, height: 8, borderRadius: 4 },
  addressField: { flex: 1 },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: 4 },
  swapLine: { flex: 1, height: 1 },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  primaryText: {
    color: '#FFFFFF',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
