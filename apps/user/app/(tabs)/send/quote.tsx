import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { PriceBreakdown } from '@/components/order/PriceBreakdown';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useCreateOrder, useGetQuote } from '@/hooks/useOrder';
import { useWallet } from '@/hooks/useWallet';
import { composeDeliveryAddress, composePickupAddress, formatHubLocation, getHubById, getRouteById } from '@/lib/hubs';
import { formatDistance, formatDuration, formatMoney } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';

type PackageItem = {
  description: string;
  quantity: number;
};

export default function QuoteScreen() {
  const router = useRouter();
  const back = useSafeBack('/send/package');
  const palette = useAppPalette();
  const params = useLocalSearchParams<{
    originHubId?: string;
    destinationHubId?: string;
    routeId?: string;
    localPickupAddress?: string;
    contactName?: string;
    contactPhone?: string;
    pickupNote?: string;
    size?: 'SMALL' | 'MEDIUM' | 'LARGE';
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

  const originHub = getHubById(params.originHubId);
  const destinationHub = getHubById(params.destinationHubId);
  const route = getRouteById(params.routeId);
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
  const walletBalance = Number(walletQuery.data?.balance ?? 0);
  const deliveryType = quoteQuery.data?.deliveryType ?? (isIntrastate ? 'INTRASTATE' : 'INTERSTATE');

  const packageItems = useMemo<PackageItem[]>(() => {
    if (!params.items) return [];
    try {
      const parsed = JSON.parse(params.items) as Array<Partial<PackageItem>>;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => ({
          description: String(item.description ?? '').trim(),
          quantity: Number(item.quantity ?? 1) || 1,
        }))
        .filter((item) => item.description.length > 0 || item.quantity > 0);
    } catch {
      return [];
    }
  }, [params.items]);

  const orderItems = packageItems.length
    ? packageItems.map((item) => ({ description: item.description || 'Package', quantity: Math.max(1, item.quantity), weightKg: 1, fragile }))
    : [{ description: 'Package', quantity: 1, weightKg: 1, fragile }];

  const quote = quoteQuery.data;

  const loadQuote = async () => {
    try {
      if (isIntrastate) {
        await quoteQuery.mutateAsync({
          size,
          pickupAddress,
          deliveryAddress,
        });
      } else {
        if (!originHub || !destinationHub || !route) return;
        await quoteQuery.mutateAsync({
          size,
          originHubId: originHub.id,
          destinationHubId: destinationHub.id,
          routeId: route.id,
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
        originHubId: isIntrastate ? undefined : originHub?.id,
        destinationHubId: isIntrastate ? undefined : destinationHub?.id,
        routeId: isIntrastate ? undefined : route?.id,
        localPickupAddress: isIntrastate ? undefined : (params.localPickupAddress ?? ''),
        pickupAddress: isIntrastate ? pickupAddress : undefined,
        deliveryAddress: isIntrastate ? deliveryAddress : undefined,
        contactName,
        contactPhone,
        pickupNote,
        fragile,
        notes: notes.trim(),
        items: orderItems,
      });
      router.replace({ pathname: '/orders/[id]', params: { id: order.id } } as never);
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
        <Pressable onPress={() => back()} style={({ pressed }) => [styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }, pressed ? { opacity: 0.85 } : null]}>
          <ChevronLeft size={18} color={palette.text} />
          <Text style={[styles.backText, { color: palette.text }]}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Confirm quote</Text>
        <Text style={[styles.title, { color: palette.text }]}>Review the route, price, and wallet balance.</Text>
      </View>

      {routeUnavailable ? <ErrorBanner message="This hub pair is not serviced yet. Go back and choose a supported route." onDismiss={() => quoteQuery.reset()} /> : null}
      {quoteQuery.isError ? <ErrorBanner message="Could not load quote. Check the hubs and route details and try again." onDismiss={() => quoteQuery.reset()} /> : null}

      <View style={[styles.routeCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Route summary</Text>
        {isIntrastate ? (
          <>
            <Text style={[styles.routeTitle, { color: palette.text }]} numberOfLines={2}>{pickupAddress}</Text>
            <Text style={styles.arrow}>↓</Text>
            <Text style={[styles.routeTitle, { color: palette.text }]} numberOfLines={2}>{deliveryAddress}</Text>
            <View style={styles.routeStats}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Estimated delivery</Text>
                <Text style={[styles.statValue, { color: palette.text }]}>~2–4 hours today</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.routeTitle, { color: palette.text }]}>{originHub ? originHub.name : 'Origin hub missing'}</Text>
            <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>{originHub ? formatHubLocation(originHub) : ''}</Text>
            <Text style={styles.arrow}>↓</Text>
            <Text style={[styles.routeTitle, { color: palette.text }]}>{destinationHub ? destinationHub.name : 'Destination hub missing'}</Text>
            <Text style={[styles.routeMeta, { color: palette.textSecondary }]}>{destinationHub ? formatHubLocation(destinationHub) : ''}</Text>
            {route ? (
              <View style={styles.routeStats}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Base route fare</Text>
                  <Text style={[styles.statValue, { color: palette.text }]}>{formatMoney(route.baseFare)}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Estimated transit</Text>
                  <Text style={[styles.statValue, { color: palette.text }]}>{route.estimatedDays} day{route.estimatedDays === 1 ? '' : 's'}</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Pickup summary</Text>
        <Text style={[styles.cardText, { color: palette.text }]}>{pickupAddress || 'Add the pickup landmark near the origin hub.'}</Text>
        <Text style={[styles.cardSub, { color: palette.textSecondary }]}>{deliveryAddress || 'Destination hub will be used for the interstate leg.'}</Text>
        {(contactName || contactPhone || pickupNote) ? (
          <View style={styles.metaGroup}>
            {contactName ? <Text style={[styles.metaLine, { color: palette.textSecondary }]}>Contact: {contactName}{contactPhone ? ` • ${contactPhone}` : ''}</Text> : null}
            {pickupNote ? <Text style={[styles.metaLine, { color: palette.textSecondary }]}>Pickup note: {pickupNote}</Text> : null}
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

          <View style={[styles.metaCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.metaTitle, { color: palette.textSecondary }]}>Estimated delivery time</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>
              {deliveryType === 'INTRASTATE' ? '~2–4 hours today' : formatDuration(quote.durationMin)}
            </Text>
            <Text style={[styles.metaSub, { color: palette.textSecondary }]}>{formatDistance(quote.distanceKm)}</Text>
          </View>

          <View style={[styles.metaCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.metaTitle, { color: palette.textSecondary }]}>Wallet balance</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>{formatMoney(walletBalance)}</Text>
            {!canProceed ? <Text style={[styles.warning, { color: palette.error }]}>Top up your wallet before confirming this order.</Text> : null}
          </View>

          <View style={[styles.metaCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.metaTitle, { color: palette.textSecondary }]}>Route handling</Text>
            <Text style={[styles.metaValue, { color: palette.text }]}>Hub-driven pricing</Text>
            <Text style={[styles.metaSub, { color: palette.textSecondary }]}>The server now prices and creates this order from the selected hubs, not from geocoded hub names.</Text>
          </View>

          <Pressable disabled={!canProceed} onPress={submitOrder} style={({ pressed }) => [styles.primary, { backgroundColor: canProceed ? palette.primary : palette.border }, pressed && canProceed ? { opacity: 0.9 } : null]}>
            <Text style={styles.primaryText}>{createOrder.isPending ? 'Creating order…' : `Pay ${formatMoney(quote.totalPrice)} from Wallet`}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
    <AppModal config={modalConfig} onClose={hideModal} />
  </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  backButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
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
  cardText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cardSub: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  metaGroup: { gap: 4, paddingTop: 2 },
  metaLine: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  metaCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 4 },
  metaTitle: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  metaValue: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  metaSub: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  warning: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  primary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
