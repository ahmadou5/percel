import { useRouter } from 'expo-router';
import { ArrowLeftRight, ChevronLeft, MapPin, Truck, Sparkles } from 'lucide-react-native';
import { useMemo, useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { HubPicker } from '@/components/order/HubPicker';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { getRouteWithHubs, listHubs } from '@/lib/hubs';
import { formatMoney } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';
import type { Hub } from '@/types/hubs';
import { useGetQuote } from '@/hooks/useOrder';

const starterHubs = listHubs();

export default function SendOrderEntryScreen() {
  const router = useRouter();
  const back = useSafeBack('/');
  const palette = useAppPalette();
  const quoteQuery = useGetQuote();

  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [originHub, setOriginHub] = useState<Hub | null>(starterHubs[0] ?? null);
  const [destinationHub, setDestinationHub] = useState<Hub | null>(starterHubs[1] ?? null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);

  // Swap pickup & delivery address values
  const swapAddresses = () => {
    const temp = pickupAddress;
    setPickupAddress(deliveryAddress);
    setDeliveryAddress(temp);
    setQuoteData(null);
    setErrorMsg(null);
  };

  // Swap hubs for interstate fallback
  const swapHubs = () => {
    setOriginHub(destinationHub);
    setDestinationHub(originHub);
  };

  const routePreview = useMemo(() => {
    if (!originHub || !destinationHub) return null;
    return getRouteWithHubs(originHub.id, destinationHub.id);
  }, [destinationHub, originHub]);

  // Trigger auto-quote when address fields change
  useEffect(() => {
    if (pickupAddress.trim().length > 5 && deliveryAddress.trim().length > 5) {
      const delayDebounce = setTimeout(async () => {
        setErrorMsg(null);
        try {
          const res = await quoteQuery.mutateAsync({
            size: 'SMALL',
            pickupAddress: pickupAddress.trim(),
            deliveryAddress: deliveryAddress.trim(),
          });
          setQuoteData(res);
        } catch (err: any) {
          setErrorMsg(err.message || 'Unable to fetch route details. Try another address.');
          setQuoteData(null);
        }
      }, 1000);

      return () => clearTimeout(delayDebounce);
    } else {
      setQuoteData(null);
    }
  }, [pickupAddress, deliveryAddress]);

  const deliveryType = quoteData?.deliveryType ?? 'INTERSTATE';
  const isIntrastate = deliveryType === 'INTRASTATE';

  const canContinue = isIntrastate
    ? Boolean(quoteData && pickupAddress.trim() && deliveryAddress.trim())
    : Boolean(routePreview && originHub && destinationHub && originHub.id !== destinationHub.id);

  const handleContinue = () => {
    if (!canContinue) return;
    
    if (isIntrastate) {
      router.push({
        pathname: '/send/pickup-details',
        params: {
          pickupAddress: pickupAddress.trim(),
          deliveryAddress: deliveryAddress.trim(),
          size: 'SMALL',
        },
      });
    } else {
      if (!routePreview || !originHub || !destinationHub) return;
      router.push({
        pathname: '/send/pickup-details',
        params: {
          originHubId: originHub.id,
          destinationHubId: destinationHub.id,
          routeId: routePreview.id,
          localPickupAddress: pickupAddress.trim() || undefined,
        },
      });
    }
  };

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
        <Text style={[styles.title, { color: palette.text }]}>Where is the package going?</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Enter the pickup and delivery addresses. We'll automatically match the route and show rates.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Input
          label="Pickup Address"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          placeholder="Enter pickup address"
        />

        <View style={styles.swapRow}>
          <View style={[styles.swapLine, { backgroundColor: palette.border }]} />
          <Pressable
            onPress={swapAddresses}
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

        <Input
          label="Delivery Address"
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          placeholder="Enter delivery address"
        />
      </View>

      {quoteQuery.isPending && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={palette.primary} />
          <Text style={[styles.loaderText, { color: palette.textSecondary }]}>Detecting delivery route...</Text>
        </View>
      )}

      {errorMsg && <ErrorBanner message={errorMsg} />}

      {quoteData && isIntrastate && (
        <View style={[styles.previewCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.previewHeader}>
            <Sparkles size={18} color={palette.primary} />
            <Text style={[styles.previewTitle, { color: palette.text }]}>Local same-state delivery inferred</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Estimated Delivery</Text>
            <Text style={[styles.previewValue, { color: palette.text }]}>~2-4 hours today</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Pricing Quote</Text>
            <Text style={[styles.previewValue, { color: palette.text }]}>{formatMoney(quoteData.totalPrice)}</Text>
          </View>
        </View>
      )}

      {quoteData && !isIntrastate && (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.previewHeader}>
            <Truck size={18} color={palette.primary} />
            <Text style={[styles.previewTitle, { color: palette.text }]}>Interstate Waybill Required</Text>
          </View>
          <Text style={[styles.previewNote, { color: palette.textSecondary }]}>
            Since this shipment crosses state boundaries, it will route through our hubs. Please select your preferred hubs below:
          </Text>

          <HubPicker
            label="Origin hub"
            value={originHub}
            onSelect={setOriginHub}
            helperText="The pickup station where the parcel enters our network."
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
            helperText="The receiving station for the interstate leg."
            disabledHubId={originHub?.id}
          />

          {routePreview && (
            <View style={[styles.previewCard, { backgroundColor: palette.bg, borderColor: palette.border, borderStyle: 'dashed' }]}>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Base Hub Price</Text>
                <Text style={[styles.previewValue, { color: palette.text }]}>{formatMoney(routePreview.baseFare)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Estimated Delivery</Text>
                <Text style={[styles.previewValue, { color: palette.text }]}>{routePreview.estimatedDays} day{routePreview.estimatedDays === 1 ? '' : 's'}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <Pressable
        disabled={!canContinue}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: canContinue ? palette.primary : palette.border },
          pressed && canContinue ? { opacity: 0.9 } : null,
        ]}
      >
        <Text style={styles.primaryText}>{canContinue ? 'Continue' : 'Enter Route Details'}</Text>
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
  loaderContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', padding: 8 },
  loaderText: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  previewCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  previewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  previewLabel: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  previewValue: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  previewNote: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular, marginBottom: 8 },
  primary: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
