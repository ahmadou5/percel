import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { composeDeliveryAddress, composePickupAddress, formatHubLocation, getHubById, getRouteById } from '@/lib/hubs';
import { useAppPalette } from '@/lib/theme';

export default function PickupDetailsScreen() {
  const router = useRouter();
  const back = useSafeBack('/send');
  const palette = useAppPalette();
  const params = useLocalSearchParams<{
    originHubId?: string;
    destinationHubId?: string;
    routeId?: string;
    // Intrastate passthrough
    pickupAddress?: string;
    deliveryAddress?: string;
    size?: string;
  }>();

  const isIntrastate = Boolean(params.pickupAddress && params.deliveryAddress && !params.originHubId);

  const originHub = getHubById(params.originHubId);
  const destinationHub = getHubById(params.destinationHubId);
  const route = getRouteById(params.routeId);

  const [localPickupAddress, setLocalPickupAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pickupNote, setPickupNote] = useState('');

  const canContinue = isIntrastate
    ? Boolean(contactName.trim() && contactPhone.trim())
    : Boolean(originHub && destinationHub && route && localPickupAddress.trim() && contactName.trim() && contactPhone.trim());

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
    if (isIntrastate) {
      router.push({
        pathname: '/send/package',
        params: {
          pickupAddress: params.pickupAddress ?? '',
          deliveryAddress: params.deliveryAddress ?? '',
          size: params.size ?? 'SMALL',
          contactName,
          contactPhone,
          pickupNote,
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
          contactName,
          contactPhone,
          pickupNote,
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
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Pickup details</Text>
        {isIntrastate ? (
          <Text style={[styles.title, { color: palette.text }]}>Add your pickup contact for the courier.</Text>
        ) : (
          <Text style={[styles.title, { color: palette.text }]}>Add the local pickup details near the chosen hub.</Text>
        )}
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          {isIntrastate
            ? 'We have your addresses. Just tell us who the courier should contact at the pickup point.'
            : 'We keep the interstate move hub-to-hub and capture only the local pickup point here.'}
        </Text>
      </View>

      {/* Route / address summary */}
      <View style={[styles.routeCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>{isIntrastate ? 'Delivery route' : 'Selected route'}</Text>
        {isIntrastate ? (
          <>
            <View style={styles.addrRow}>
              <MapPin size={14} color={palette.primary} />
              <Text style={[styles.routeText, { color: palette.text }]} numberOfLines={2}>{params.pickupAddress}</Text>
            </View>
            <Text style={styles.arrow}>↓</Text>
            <View style={styles.addrRow}>
              <MapPin size={14} color={palette.error ?? '#EF4444'} />
              <Text style={[styles.routeText, { color: palette.text }]} numberOfLines={2}>{params.deliveryAddress}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.routeText, { color: palette.text }]}>{originHub ? originHub.name : 'Origin hub not selected'}</Text>
            <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>{originHub ? formatHubLocation(originHub) : ''}</Text>
            <Text style={styles.arrow}>↓</Text>
            <Text style={[styles.routeText, { color: palette.text }]}>{destinationHub ? destinationHub.name : 'Destination hub not selected'}</Text>
            <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>{destinationHub ? formatHubLocation(destinationHub) : ''}</Text>
          </>
        )}
      </View>

      {/* Landmark (interstate only) */}
      {!isIntrastate && (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Pickup landmark</Text>
          <TextInput
            value={localPickupAddress}
            onChangeText={setLocalPickupAddress}
            placeholder="Landmark, street, or area near the origin hub"
            placeholderTextColor={palette.textSecondary}
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
          />
          <Text style={[styles.helper, { color: palette.textSecondary }]}>Example: Ojuelegba bus stop or Ring Road junction.</Text>
        </View>
      )}

      {/* Contact */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Pickup contact</Text>
        <TextInput
          value={contactName}
          onChangeText={setContactName}
          placeholder="Contact name"
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
        />
        <TextInput
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          placeholder="Phone number"
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
        />
        <TextInput
          value={pickupNote}
          onChangeText={setPickupNote}
          placeholder="Optional note for the driver"
          placeholderTextColor={palette.textSecondary}
          style={[styles.noteInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
          multiline
        />
      </View>

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
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: Typography.md, fontFamily: Typography.family.regular },
  noteInput: { minHeight: 98, borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, paddingTop: 14, fontSize: Typography.md, fontFamily: Typography.family.regular, textAlignVertical: 'top' },
  helper: { fontSize: Typography.xs, lineHeight: 18 },
  previewCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 4 },
  previewText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  previewMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  primary: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
