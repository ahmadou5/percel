import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useActiveHubs } from '@/hooks/useOrder';
import { composeDeliveryAddress, composePickupAddress, formatHubLocation, getHubById, getRouteWithHubs } from '@/lib/hubs';
import { useAppPalette } from '@/lib/theme';

export default function PickupDetailsScreen() {
  const router = useRouter();
  const back = useSafeBack('/send');
  const palette = useAppPalette();
  const { data: apiHubs } = useActiveHubs();
  const params = useLocalSearchParams<{
    originHubId?: string;
    destinationHubId?: string;
    routeId?: string;
    // Intrastate passthrough
    pickupAddress?: string;
    deliveryAddress?: string;
    size?: string;
    vehicleType?: string;
  }>();

  const isIntrastate = Boolean(params.pickupAddress && params.deliveryAddress && !params.originHubId);

  const originHub = getHubById(params.originHubId, apiHubs);
  const destinationHub = getHubById(params.destinationHubId, apiHubs);
  const route = getRouteWithHubs(originHub, destinationHub, apiHubs);

  const [localPickupAddress, setLocalPickupAddress] = useState('');
  const [showPickupContact, setShowPickupContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pickupNote, setPickupNote] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  const canContinue = isIntrastate
    ? Boolean(recipientName.trim() && recipientPhone.trim())
    : Boolean(originHub && destinationHub && recipientName.trim() && recipientPhone.trim());

  const preview = useMemo(() => {
    if (isIntrastate) {
      return {
        pickupAddress: params.pickupAddress ?? '',
        deliveryAddress: params.deliveryAddress ?? '',
      };
    }
    if (!originHub || !destinationHub) return null;
    return {
      pickupAddress: composePickupAddress(originHub, localPickupAddress),
      deliveryAddress: composeDeliveryAddress(destinationHub),
    };
  }, [destinationHub, isIntrastate, localPickupAddress, originHub, params.deliveryAddress, params.pickupAddress]);

  const handleContinue = () => {
    const finalContactName = showPickupContact ? contactName : '';
    const finalContactPhone = showPickupContact ? contactPhone : '';
    const finalPickupNote = showPickupContact ? pickupNote : '';

    if (isIntrastate) {
      router.push({
        pathname: '/send/package',
        params: {
          pickupAddress: params.pickupAddress ?? '',
          deliveryAddress: params.deliveryAddress ?? '',
          size: params.size ?? 'SMALL',
          vehicleType: params.vehicleType ?? 'BIKE',
          contactName: finalContactName,
          contactPhone: finalContactPhone,
          pickupNote: finalPickupNote,
          recipientName,
          recipientPhone,
        },
      });
    } else {
      router.push({
        pathname: '/send/package',
        params: {
          originHubId: params.originHubId ?? '',
          destinationHubId: params.destinationHubId ?? '',
          routeId: params.routeId ?? '',
          localPickupAddress,
          contactName: finalContactName,
          contactPhone: finalContactPhone,
          pickupNote: finalPickupNote,
          recipientName,
          recipientPhone,
        },
      });
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => back()} style={({ pressed }) => [styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }, pressed && { opacity: 0.7 }]}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Pickup & Contact Details</Text>
      </View>

      {/* Route card */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: Spacing.xs }]}>Route</Text>

        <View style={styles.routeContainer}>
          <View style={styles.routeConnectorCol}>
            <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
            <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
            <View style={[styles.routeDot, { backgroundColor: palette.primary }]} />
          </View>
          <View style={styles.routeDetailsCol}>
            <View style={styles.routeDetailItem}>
              <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Pickup Location</Text>
              <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                {isIntrastate ? params.pickupAddress : (originHub ? `${originHub.name} (${formatHubLocation(originHub)})` : 'Origin hub')}
              </Text>
            </View>
            <View style={styles.routeDetailItem}>
              <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Delivery Location</Text>
              <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                {isIntrastate ? params.deliveryAddress : (destinationHub ? `${destinationHub.name} (${formatHubLocation(destinationHub)})` : 'Destination hub')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recipient Contact (REQUIRED) */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Recipient Contact</Text>
          <Text style={{ fontSize: 11, fontFamily: Typography.family.bold, color: palette.primary }}>REQUIRED</Text>
        </View>
        <TextInput
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Recipient full name *"
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
        />
        <TextInput
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
          placeholder="Recipient phone number *"
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
        />
      </View>

      {/* Expandable Pickup Contact Card */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 2, paddingRight: Spacing.sm }}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Pickup contact</Text>
            <Text style={{ fontSize: Typography.xs, color: palette.textSecondary, fontFamily: Typography.family.regular }}>
              {showPickupContact ? 'Add sender name and phone number for pickup' : 'Optional (Toggle on to add custom sender contact)'}
            </Text>
          </View>
          <Switch value={showPickupContact} onValueChange={setShowPickupContact} />
        </View>

        {showPickupContact && (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Sender / Pickup contact name"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />
            <TextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholder="Pickup phone number"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />
            <TextInput
              value={pickupNote}
              onChangeText={setPickupNote}
              placeholder="Optional pickup note for driver"
              placeholderTextColor={palette.textSecondary}
              style={[styles.noteInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
              multiline
            />
          </View>
        )}
      </View>

      {/* Landmark (interstate only - OPTIONAL) */}
      {!isIntrastate && (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Pickup landmark</Text>
            <Text style={{ fontSize: 11, fontFamily: Typography.family.medium, color: palette.textSecondary }}>OPTIONAL</Text>
          </View>
          <TextInput
            value={localPickupAddress}
            onChangeText={setLocalPickupAddress}
            placeholder="Landmark or area near origin hub (optional)"
            placeholderTextColor={palette.textSecondary}
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
          />
          <Text style={[styles.helper, { color: palette.textSecondary }]}>Example: Ojuelegba bus stop or Ring Road junction.</Text>
        </View>
      )}

      {preview ? (
        <View style={[styles.previewCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Pickup preview</Text>
          <Text style={[styles.previewText, { color: palette.text }]} numberOfLines={2}>{preview.pickupAddress}</Text>
          <Text style={[styles.previewMeta, { color: palette.textSecondary }]} numberOfLines={1}>{preview.deliveryAddress}</Text>
        </View>
      ) : null}

      <Pressable
        disabled={!canContinue}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: canContinue ? palette.primary : palette.border },
          pressed && canContinue ? { opacity: 0.88 } : null,
        ]}
      >
        <Text style={styles.primaryText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: Spacing.sm },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  routeCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1.1, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  routeText: { fontSize: Typography.md, fontFamily: Typography.family.bold, flex: 1 },
  routeMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  arrow: { fontSize: Typography.xl, textAlign: 'center', color: '#8B5CF6' },
  card: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  routeContainer: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginTop: 4 },
  routeConnectorCol: { alignItems: 'center', width: 16, paddingTop: 4, paddingBottom: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { flex: 1, width: 2, marginVertical: 4 },
  routeDetailsCol: { flex: 1, gap: 16 },
  routeDetailItem: { gap: 2 },
  routeLabel: { fontSize: 11, fontFamily: Typography.family.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold, lineHeight: 18 },
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: Typography.md, fontFamily: Typography.family.regular },
  noteInput: { minHeight: 98, borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, paddingTop: 14, fontSize: Typography.md, fontFamily: Typography.family.regular, textAlignVertical: 'top' },
  helper: { fontSize: Typography.xs, lineHeight: 18 },
  previewCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 4 },
  previewText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  previewMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  primary: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
