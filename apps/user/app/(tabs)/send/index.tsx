import { useRouter } from 'expo-router';
import { ArrowLeftRight, ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { HubPicker } from '@/components/order/HubPicker';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { getRouteWithHubs, listHubs } from '@/lib/hubs';
import { formatMoney } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';
import type { Hub } from '@/types/hubs';

const starterHubs = listHubs();

export default function SendOrderEntryScreen() {
  const router = useRouter();
  const back = useSafeBack('/');
  const palette = useAppPalette();
  const [originHub, setOriginHub] = useState<Hub | null>(starterHubs[0] ?? null);
  const [destinationHub, setDestinationHub] = useState<Hub | null>(starterHubs[1] ?? null);

  const routePreview = useMemo(() => {
    if (!originHub || !destinationHub) return null;
    return getRouteWithHubs(originHub.id, destinationHub.id);
  }, [destinationHub, originHub]);

  const canContinue = Boolean(routePreview && originHub && destinationHub && originHub.id !== destinationHub.id);

  const swapHubs = () => {
    setOriginHub(destinationHub);
    setDestinationHub(originHub);
  };

  const routeMessage = !originHub || !destinationHub
    ? 'Pick both hubs to see the route cost and delivery window.'
    : routePreview
      ? 'This route is live and ready for pickup details.'
      : 'Route not available yet. Choose a supported hub pair.';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed ? { opacity: 0.7 } : null,
          ]}
          onPress={() => back()}
        >
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Send waybill</Text>
        <Text style={[styles.title, { color: palette.text }]}>Choose the hubs for this interstate move.</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Percel moves hub-to-hub. Pick the origin and destination stations first, then add the local pickup details.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <HubPicker
          label="Origin hub"
          value={originHub}
          onSelect={setOriginHub}
          helperText="This is the pickup station where the parcel enters our network."
          disabledHubId={destinationHub?.id}
        />

        <View style={styles.swapRow}>
          <View style={[styles.swapLine, { backgroundColor: palette.border }]} />
          <Pressable
            onPress={swapHubs}
            style={({ pressed }) => [
              styles.swapButton,
              { backgroundColor: palette.bg, borderColor: palette.border },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <ArrowLeftRight size={16} color={palette.primary} />
          </Pressable>
          <View style={[styles.swapLine, { backgroundColor: palette.border }]} />
        </View>

        <HubPicker
          label="Destination hub"
          value={destinationHub}
          onSelect={setDestinationHub}
          helperText="This is the receiving station for the interstate leg."
          disabledHubId={originHub?.id}
        />
      </View>

      {routePreview ? (
        <View style={[styles.previewCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Base fare</Text>
            <Text style={[styles.previewValue, { color: palette.text }]}>{formatMoney(routePreview.baseFare)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Estimated delivery</Text>
            <Text style={[styles.previewValue, { color: palette.text }]}>{routePreview.estimatedDays} day{routePreview.estimatedDays === 1 ? '' : 's'}</Text>
          </View>
          <Text style={[styles.previewNote, { color: palette.textSecondary }]}>{routeMessage}</Text>
        </View>
      ) : (
        <View style={[styles.previewCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Route preview</Text>
          <Text style={[styles.routeMissing, { color: palette.text }]}>{routeMessage}</Text>
        </View>
      )}

      <Pressable
        disabled={!canContinue}
        onPress={() => {
          if (!routePreview || !originHub || !destinationHub) return;
          router.push({
            pathname: '/send/pickup-details',
            params: {
              originHubId: originHub.id,
              destinationHubId: destinationHub.id,
              routeId: routePreview.id,
            },
          });
        }}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: canContinue ? palette.primary : palette.border },
          pressed && canContinue ? { opacity: 0.9 } : null,
        ]}
      >
        <Text style={styles.primaryText}>{canContinue ? 'Continue' : 'Route unavailable'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: Spacing.sm },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  swapLine: { flex: 1, height: 1 },
  swapButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  previewLabel: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  previewValue: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  previewNote: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  routeMissing: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  primary: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
