import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, Clock, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { PriceBreakdown } from '@/components/order/PriceBreakdown';
import { OrderSuccessModal } from '@/components/order/OrderSuccessModal';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useCreateOrder, useGetQuote, useActiveHubs } from '@/hooks/useOrder';
import { useWallet } from '@/hooks/useWallet';
import { composeDeliveryAddress, composePickupAddress, formatHubLocation, getHubById, getRouteWithHubs } from '@/lib/hubs';
import { formatDistance, formatDuration, formatMoney } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';
import type { Order } from '@/lib/order';

type PackageItem = {
  description: string;
  quantity: number;
  imageUrl?: string;
};

export default function QuoteScreen() {
  const router = useRouter();
  const back = useSafeBack('/send/package');
  const palette = useAppPalette();
  const { data: apiHubs } = useActiveHubs();
  const params = useLocalSearchParams<{
    originHubId?: string;
    destinationHubId?: string;
    routeId?: string;
    localPickupAddress?: string;
    contactName?: string;
    contactPhone?: string;
    pickupNote?: string;
    recipientName?: string;
    recipientPhone?: string;
    size?: 'SMALL' | 'MEDIUM' | 'LARGE';
    vehicleType?: string;
    fragile?: string;
    notes?: string;
    items?: string;
    // Intrastate passthrough
    pickupAddress?: string;
    deliveryAddress?: string;
  }>();
  const walletQuery = useWallet();
  const quoteQuery = useGetQuote();
  const createOrder = useCreateOrder();
  const { config: modalConfig, hide: hideModal, alert: showAlert } = useAppModal();
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  const originHub = getHubById(params.originHubId, apiHubs);
  const destinationHub = getHubById(params.destinationHubId, apiHubs);
  const route = getRouteWithHubs(originHub, destinationHub, apiHubs);
  const isIntrastate = Boolean(params.pickupAddress && params.deliveryAddress && !params.originHubId);
  const pickupAddress = isIntrastate
    ? (params.pickupAddress ?? '')
    : (originHub ? composePickupAddress(originHub, params.localPickupAddress ?? '') : params.localPickupAddress ?? '');
  const deliveryAddress = isIntrastate
    ? (params.deliveryAddress ?? '')
    : (destinationHub ? composeDeliveryAddress(destinationHub) : '');
  const size = params.size ?? 'SMALL';
  const fragile = params.fragile === 'true';
  const notes = params.notes ?? '';
  const pickupNote = params.pickupNote ?? '';
  const contactName = params.contactName ?? '';
  const contactPhone = params.contactPhone ?? '';
  const recipientName = params.recipientName ?? '';
  const recipientPhone = params.recipientPhone ?? '';
  const walletBalance = Number(walletQuery.data?.balance ?? 0);
  const deliveryType = quoteQuery.data?.deliveryType ?? (isIntrastate ? 'INTRASTATE' : 'INTERSTATE');

  const headerBack = () => {

    router.back();
  };

  const packageItems = useMemo<PackageItem[]>(() => {
    if (!params.items) return [];
    try {
      const parsed = JSON.parse(params.items) as Array<Partial<PackageItem>>;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => ({
          description: String(item.description ?? '').trim(),
          quantity: Number(item.quantity ?? 1) || 1,
          imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        }))
        .filter((item) => item.description.length > 0 || item.quantity > 0 || item.imageUrl);
    } catch {
      return [];
    }
  }, [params.items]);

  const orderItems = packageItems.length
    ? packageItems.map((item) => ({
      description: item.description || 'Package',
      quantity: Math.max(1, item.quantity),
      weightKg: 1,
      fragile,
      imageUrl: item.imageUrl ?? null,
    }))
    : [{ description: 'Package', quantity: 1, weightKg: 1, fragile, imageUrl: null }];

  const quote = quoteQuery.data;
  const vehicleType = (params.vehicleType === 'TRICYCLE' || params.vehicleType === 'CAR' || params.vehicleType === 'VAN' || params.vehicleType === 'TRUCK'
    ? params.vehicleType
    : 'BIKE') as 'BIKE' | 'TRICYCLE' | 'CAR' | 'VAN' | 'TRUCK';

  const loadQuote = async () => {
    try {
      if (isIntrastate) {
        await quoteQuery.mutateAsync({
          size,
          vehicleType,
          pickupAddress,
          deliveryAddress,
        });
      } else {
        if (!originHub || !destinationHub) return;
        await quoteQuery.mutateAsync({
          size,
          vehicleType,
          originHubId: originHub.id,
          destinationHubId: destinationHub.id,
          routeId: route?.id,
          localPickupAddress: params.localPickupAddress ?? '',
          pickupAddress,
          deliveryAddress,
        });
      }
    } catch (error) {
      showAlert('Quote failed', error instanceof Error ? error.message : 'Unable to generate quote.', 'error');
    }
  };

  useEffect(() => {
    loadQuote();
  }, [params.originHubId, params.destinationHubId, params.routeId, params.pickupAddress, params.deliveryAddress, size]);

  const submitOrder = async () => {
    if (!quote) return;
    try {
      const order = await createOrder.mutateAsync({
        size,
        vehicleType,
        originHubId: isIntrastate ? undefined : originHub?.id,
        destinationHubId: isIntrastate ? undefined : destinationHub?.id,
        routeId: isIntrastate ? undefined : route?.id,
        localPickupAddress: isIntrastate ? undefined : (params.localPickupAddress ?? ''),
        pickupAddress: pickupAddress || undefined,
        deliveryAddress: deliveryAddress || undefined,
        contactName,
        contactPhone,
        pickupNote,
        recipientName,
        recipientPhone,
        fragile,
        notes: notes.trim(),
        items: orderItems,
      });
      setSuccessOrder(order);
    } catch (error) {
      showAlert('Order failed', error instanceof Error ? error.message : 'Unable to create order.', 'error');
    }
  };

  const canProceed = Boolean(quote) && walletBalance >= Number(quote?.totalPrice ?? 0) && !createOrder.isPending;
  const routeUnavailable = !isIntrastate && Boolean(originHub && destinationHub && !route);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={headerBack}>
            <ArrowLeft size={18} color={palette.text} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Confirm quote</Text>

        </View>

        {routeUnavailable ? <ErrorBanner message="This hub pair is not serviced yet. Go back and choose a supported route." onDismiss={() => quoteQuery.reset()} /> : null}
        {quoteQuery.isError ? <ErrorBanner message="Could not load quote. Check the hubs and route details and try again." onDismiss={() => quoteQuery.reset()} /> : null}

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
                  {pickupAddress}
                </Text>
              </View>
              <View style={styles.routeDetailItem}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Delivery Location</Text>
                <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                  {deliveryAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Package & Contact summary</Text>
          <Text style={[styles.cardText, { color: palette.text }]}>{pickupAddress || 'Origin hub'}</Text>
          <Text style={[styles.cardSub, { color: palette.textSecondary }]}>To: {deliveryAddress || 'Destination hub'}</Text>
          <Text style={[styles.cardSub, { color: palette.primary, fontFamily: Typography.family.bold, marginTop: 4 }]}>Recipient: {recipientName}{recipientPhone ? ` (${recipientPhone})` : ''}</Text>
          {(contactName || contactPhone || pickupNote) ? (
            <View style={styles.metaGroup}>
              {contactName ? <Text style={[styles.metaLine, { color: palette.textSecondary }]}>Pickup Contact: {contactName}{contactPhone ? ` • ${contactPhone}` : ''}</Text> : null}
              {pickupNote ? <Text style={[styles.metaLine, { color: palette.textSecondary }]}>Pickup note: {pickupNote}</Text> : null}
            </View>
          ) : null}

          {packageItems.some((item) => item.imageUrl) ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={[styles.metaLine, { color: palette.textSecondary, fontFamily: Typography.family.bold }]}>Attached Package Photos:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {packageItems.map((item, idx) =>
                  item.imageUrl ? (
                    <View key={`img-${idx}`} style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: palette.border }}>
                      <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />
                    </View>
                  ) : null
                )}
              </View>
            </View>
          ) : null}
        </View>

        {!quote ? (
          <Pressable
            disabled={!route}
            onPress={loadQuote}
            style={({ pressed }) => [styles.primary, { backgroundColor: route ? palette.primary : palette.border }, pressed && route ? { opacity: 0.9 } : null]}
          >
            <Text style={styles.primaryText}>{quoteQuery.isPending ? 'Calculating…' : route ? 'Get quote' : 'Route unavailable'}</Text>
          </Pressable>
        ) : (
          <>
            <PriceBreakdown quote={quote} walletBalance={walletBalance} />

            {/* Redesigned Estimated Delivery Time Card */}
            <View style={[styles.redesignedCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${palette.primary}18` }]}>
                  <Clock size={20} color={palette.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardHeaderTitle, { color: palette.textSecondary }]}>Estimated Delivery</Text>
                  <Text style={[styles.cardHeaderValue, { color: palette.text }]}>
                    {deliveryType === 'INTRASTATE' ? '~2–4 Hours Today' : formatDuration(quote.durationMin)}
                  </Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: '#10B98118' }]}>
                  <Text style={[styles.badgePillText, { color: '#10B981' }]}>
                    {deliveryType === 'INTRASTATE' ? 'Fast Express' : formatDistance(quote.distanceKm)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Redesigned Wallet Balance Card */}
            <View style={[styles.redesignedCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: canProceed ? `${palette.primary}18` : `${palette.error}18` }]}>
                  <Wallet size={20} color={canProceed ? palette.primary : palette.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardHeaderTitle, { color: palette.textSecondary }]}>Wallet Balance</Text>
                  <Text style={[styles.cardHeaderValue, { color: palette.text }]}>{formatMoney(walletBalance)}</Text>
                </View>
                {canProceed ? (
                  <View style={[styles.badgePill, { backgroundColor: '#10B98118' }]}>
                    <Text style={[styles.badgePillText, { color: '#10B981' }]}>Sufficient</Text>
                  </View>
                ) : (
                  <View style={[styles.badgePill, { backgroundColor: `${palette.error}18` }]}>
                    <Text style={[styles.badgePillText, { color: palette.error }]}>Low Balance</Text>
                  </View>
                )}
              </View>
              {!canProceed ? (
                <Text style={[styles.warningText, { color: palette.error }]}>
                  Top up your wallet balance before confirming this order.
                </Text>
              ) : null}
            </View>

            <Pressable disabled={!canProceed} onPress={submitOrder} style={({ pressed }) => [styles.primary, { backgroundColor: canProceed ? palette.primary : palette.border }, pressed && canProceed ? { opacity: 0.9 } : null]}>
              <Text style={styles.primaryText}>{createOrder.isPending ? 'Creating order…' : `Pay ${formatMoney(quote.totalPrice)} from Wallet`}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <AppModal config={modalConfig} onClose={hideModal} />
      <OrderSuccessModal
        visible={Boolean(successOrder)}
        trackingCode={successOrder?.trackingCode ?? ''}
        totalPrice={Number(successOrder?.price ?? 0)}
        deliveryType={successOrder?.deliveryType as 'INTRASTATE' | 'INTERSTATE' ?? 'INTERSTATE'}
        estimatedPickup={isIntrastate ? '8–15 mins' : undefined}
        estimatedHubArrival={!isIntrastate ? (route ? `${route.estimatedDays} day${route.estimatedDays === 1 ? '' : 's'}` : '1–2 days') : undefined}
        onClose={() => {
          setSuccessOrder(null);
          if (router.canDismiss()) {
            router.dismissAll();
          }
          router.replace('/(tabs)/orders');
        }}
        onTrackOrder={() => {
          const targetId = successOrder?.id;
          setSuccessOrder(null);
          if (router.canDismiss()) {
            router.dismissAll();
          }
          if (targetId) {
            router.replace({ pathname: '/(tabs)/send/tracking/[id]', params: { id: targetId } } as never);
          } else {
            router.replace('/(tabs)/orders');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  backText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  hero: { gap: Spacing.sm },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1.1, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  routeCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  routeTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  routeMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  routeStats: { gap: 6, paddingTop: Spacing.xs },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  statLabel: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  statValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  arrow: { color: '#8B5CF6', fontSize: Typography.xl, alignSelf: 'center' },
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
  cardText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cardSub: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  metaGroup: { gap: 4, paddingTop: 2 },
  metaLine: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  metaCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 4 },
  metaTitle: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  metaValue: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  metaSub: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  warning: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  redesignedCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardHeaderTitle: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  cardHeaderValue: { fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 1 },
  badgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePillText: { fontSize: 11, fontFamily: Typography.family.bold },
  warningText: { fontSize: Typography.xs, fontFamily: Typography.family.medium, marginTop: 4 },
  primary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
