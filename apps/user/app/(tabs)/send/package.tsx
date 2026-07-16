import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { composeDeliveryAddress, composePickupAddress, formatHubLocation, formatHubType, getHubById, getRouteById } from '@/lib/hubs';
import { formatMoney, orderSizes } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';

export default function PackageDetailsScreen() {
  const router = useRouter();
  const back = useSafeBack('/send/pickup-details');
  const palette = useAppPalette();
  const params = useLocalSearchParams<{
    originHubId?: string;
    destinationHubId?: string;
    routeId?: string;
    localPickupAddress?: string;
    contactName?: string;
    contactPhone?: string;
    pickupNote?: string;
    // Intrastate passthrough
    pickupAddress?: string;
    deliveryAddress?: string;
  }>();

  const originHub = getHubById(params.originHubId);
  const destinationHub = getHubById(params.destinationHubId);
  const route = getRouteById(params.routeId);

  const [size, setSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('SMALL');
  const [fragile, setFragile] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: 'Documents', quantity: 1 }]);

  const isIntrastate = Boolean(params.pickupAddress && params.deliveryAddress && !params.originHubId);

  const pickupPreview = isIntrastate ? params.pickupAddress ?? '' : (originHub ? composePickupAddress(originHub, params.localPickupAddress ?? '') : params.localPickupAddress ?? '');
  const deliveryPreview = isIntrastate ? params.deliveryAddress ?? '' : (destinationHub ? composeDeliveryAddress(destinationHub) : '');
  const routeUnavailable = !isIntrastate && Boolean(originHub && destinationHub && !route);

  const addItem = () => setItems((current) => [...current, { description: '', quantity: 1 }]);
  const updateItem = (index: number, key: 'description' | 'quantity', value: string) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: key === 'quantity' ? Number(value || 1) : value } : item)));
  };
  const removeItem = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable onPress={() => back()} style={({ pressed }) => [styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }, pressed ? { opacity: 0.7 } : null]}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Package</Text>
        <Text style={[styles.title, { color: palette.text }]}>Choose the package size and add the item list.</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>The route is already locked to the chosen hubs. Add the parcel details before the quote step.</Text>
      </View>

      <View style={[styles.routeCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Route summary</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeCopy}>
            <Text style={[styles.routeTitle, { color: palette.text }]}>{originHub ? originHub.name : 'Origin hub missing'}</Text>
            <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>{originHub ? formatHubLocation(originHub) : ''}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: palette.primary + '18' }]}>
            <Text style={[styles.badgeText, { color: palette.primary }]}>{originHub ? formatHubType(originHub) : 'Hub'}</Text>
          </View>
        </View>
        <Text style={styles.arrow}>↓</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeCopy}>
            <Text style={[styles.routeTitle, { color: palette.text }]}>{destinationHub ? destinationHub.name : 'Destination hub missing'}</Text>
            <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>{destinationHub ? formatHubLocation(destinationHub) : ''}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: palette.primary + '18' }]}>
            <Text style={[styles.badgeText, { color: palette.primary }]}>{destinationHub ? formatHubType(destinationHub) : 'Hub'}</Text>
          </View>
        </View>
        {route ? (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Base route fare</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{formatMoney(route.baseFare)}</Text>
          </View>
        ) : (
          <Text style={[styles.routeAlert, { color: palette.error }]}>Route not available yet.</Text>
        )}
        {route ? <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>Estimated transit: {route.estimatedDays} day{route.estimatedDays === 1 ? '' : 's'}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Local pickup</Text>
        <Text style={[styles.cardText, { color: palette.text }]}>{pickupPreview || 'Add the pickup landmark near the origin hub.'}</Text>
        <Text style={[styles.cardSub, { color: palette.textSecondary }]}>{deliveryPreview || 'Destination hub will be used for the interstate leg.'}</Text>
        {params.contactName || params.contactPhone || params.pickupNote ? (
          <View style={styles.metaGroup}>
            {params.contactName ? <Text style={[styles.metaLine, { color: palette.textSecondary }]}>Contact: {params.contactName}{params.contactPhone ? ` • ${params.contactPhone}` : ''}</Text> : null}
            {params.pickupNote ? <Text style={[styles.metaLine, { color: palette.textSecondary }]}>Note: {params.pickupNote}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        {orderSizes.map((option) => {
          const selected = option.size === size;
          return (
            <Pressable key={option.size} onPress={() => setSize(option.size)} style={({ pressed }) => [styles.sizeCard, { backgroundColor: palette.card, borderColor: selected ? palette.primary : palette.border }, selected ? { backgroundColor: palette.primary + '12' } : null, pressed ? { opacity: 0.92 } : null]}>
              <Text style={[styles.sizeLabel, { color: palette.text }]}>{option.label}</Text>
              <Text style={[styles.sizeWeight, { color: palette.textSecondary }]}>{option.weightRange}</Text>
              <Text style={[styles.sizeHint, { color: palette.primary }]}>{option.basePriceHint}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.toggleRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.toggleCopy}>
          <Text style={[styles.toggleTitle, { color: palette.text }]}>Fragile item</Text>
          <Text style={[styles.toggleBody, { color: palette.textSecondary }]}>Mark this if the parcel needs extra handling.</Text>
        </View>
        <Switch value={fragile} onValueChange={setFragile} />
      </View>

      <View style={[styles.itemsCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Items</Text>
          <Pressable onPress={addItem}>
            <Text style={[styles.link, { color: palette.primary }]}>Add item</Text>
          </Pressable>
        </View>
        {items.map((item, index) => (
          <View key={`${index}-${item.description}`} style={[styles.itemRow, { borderBottomColor: palette.border }]}>
            <TextInput
              value={item.description}
              onChangeText={(value) => updateItem(index, 'description', value)}
              placeholder="Description"
              placeholderTextColor={palette.textSecondary}
              style={[styles.itemInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />
            <TextInput
              value={String(item.quantity)}
              onChangeText={(value) => updateItem(index, 'quantity', value)}
              keyboardType="number-pad"
              placeholder="Qty"
              placeholderTextColor={palette.textSecondary}
              style={[styles.itemInput, styles.qtyInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />
            <Pressable onPress={() => removeItem(index)} style={styles.removeButton}>
              <Text style={[styles.removeText, { color: palette.error }]}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={[styles.notesCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional delivery notes"
          placeholderTextColor={palette.textSecondary}
          style={[styles.notesInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
          multiline
        />
      </View>

      <Pressable
        disabled={routeUnavailable}
        onPress={() =>
          router.push({
            pathname: '/send/quote',
            params: {
              originHubId: params.originHubId ?? '',
              destinationHubId: params.destinationHubId ?? '',
              routeId: params.routeId ?? '',
              localPickupAddress: params.localPickupAddress ?? '',
              pickupAddress: params.pickupAddress ?? '',
              deliveryAddress: params.deliveryAddress ?? '',
              contactName: params.contactName ?? '',
              contactPhone: params.contactPhone ?? '',
              pickupNote: params.pickupNote ?? '',
              size,
              fragile: String(fragile),
              notes,
              items: JSON.stringify(items),
            },
          })
        }
        style={({ pressed }) => [styles.primary, { backgroundColor: routeUnavailable ? palette.border : palette.primary }, pressed && !routeUnavailable ? { opacity: 0.9 } : null]}
      >
        <Text style={styles.primaryText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: Spacing.sm },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  routeCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1.1, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  routeCopy: { flex: 1, gap: 4 },
  routeTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  routeMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginTop: Spacing.xs },
  summaryLabel: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  summaryValue: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  routeAlert: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  arrow: { fontSize: Typography.xl, textAlign: 'center', color: '#8B5CF6' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  card: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  cardText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cardSub: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  metaGroup: { gap: 4, paddingTop: 2 },
  metaLine: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  sizeCard: { width: '48%', borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  sizeLabel: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sizeWeight: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  sizeHint: { fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  toggleRow: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  toggleCopy: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  toggleBody: { fontSize: Typography.sm, maxWidth: '85%', fontFamily: Typography.family.regular },
  itemsCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  link: { fontFamily: Typography.family.semibold },
  itemRow: { gap: Spacing.sm, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  itemInput: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: Typography.md, fontFamily: Typography.family.regular },
  qtyInput: { width: 90 },
  removeButton: { alignSelf: 'flex-start' },
  removeText: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  notesCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  notesInput: { minHeight: 100, borderRadius: 14, borderWidth: 1, padding: Spacing.md, fontSize: Typography.md, fontFamily: Typography.family.regular, textAlignVertical: 'top' },
  primary: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
