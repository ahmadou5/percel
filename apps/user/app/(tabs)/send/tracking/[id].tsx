import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Package, Phone } from 'lucide-react-native';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { DriverCard } from '@/components/order/DriverCard';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useConfirmDelivery, useOrderDetail } from '@/hooks/useOrder';
import type { OrderStatus } from '@/lib/order';
import { subscribeToDriverLocation, subscribeToOrderUpdates } from '@/lib/socket';
import { useAppPalette } from '@/lib/theme';

// ─── Status helpers ────────────────────────────────────────────────────────────

function statusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    CREATED: 'Order created',
    PENDING_MATCH: 'Finding driver',
    MATCHED: 'Driver matched',
    ACCEPTED: 'Driver accepted',
    IN_TRANSIT: 'In transit',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed',
  };
  return map[status] ?? status;
}

function statusColor(status: OrderStatus, primary: string): string {
  if (['COMPLETED', 'DELIVERED'].includes(status)) return '#30D158';
  if (status === 'CANCELLED' || status === 'DISPUTED') return '#FF453A';
  if (status === 'IN_TRANSIT') return primary;
  return '#FFD60A';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrackingScreen() {
  const router = useRouter();
  const back = useSafeBack('/orders');
  const palette = useAppPalette();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderQuery = useOrderDetail(id);
  const confirmDelivery = useConfirmDelivery();
  const order = orderQuery.data;

  useEffect(() => {
    if (!order?.id) return;

    const unsubscribeStatus = subscribeToOrderUpdates(order.id, async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    const driverId = order.driver?.id;
    const unsubscribeLocation = driverId
      ? subscribeToDriverLocation(driverId, async () => {
          await queryClient.invalidateQueries({ queryKey: ['order', id] });
        })
      : undefined;

    return () => {
      unsubscribeStatus();
      unsubscribeLocation?.();
    };
  }, [id, order?.id, order?.driver?.id, queryClient]);

  useEffect(() => {
    if (order?.status === 'COMPLETED') {
      router.setParams({});
    }
  }, [order?.status, router]);

  // ── Loading state ────────────────────────────────────────────────────────

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <View style={[styles.loadingCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Package size={36} color={palette.primary} strokeWidth={1.5} />
          <Text style={[styles.loadingTitle, { color: palette.text }]}>Loading order…</Text>
          <Text style={[styles.loadingSubtitle, { color: palette.textSecondary }]}>Fetching your live order details.</Text>
        </View>
      </View>
    );
  }

  const status = order.status as OrderStatus;
  const canConfirm = status === 'DELIVERED';
  const canRate = status === 'DELIVERED' || status === 'COMPLETED';
  const pill = statusColor(status, palette.primary);

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          id="tracking-back-btn"
          onPress={() => back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed ? { opacity: 0.7 } : null,
          ]}
        >
          <ChevronLeft size={20} color={palette.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      {/* Hero / map placeholder */}
      <View style={[styles.mapCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.mapIconWrap}>
          <MapPin size={28} color={palette.primary} strokeWidth={1.5} />
        </View>
        <Text style={[styles.mapTitle, { color: palette.text }]}>Live tracking</Text>
        <Text style={[styles.mapBody, { color: palette.textSecondary }]}>
          Map view is coming. Your driver's location updates in real-time via WebSocket.
        </Text>
      </View>

      {/* Status pill + tracking code */}
      <View style={[styles.statusRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={[styles.pillWrap, { backgroundColor: `${pill}1A` }]}>
          <View style={[styles.pillDot, { backgroundColor: pill }]} />
          <Text style={[styles.pillText, { color: pill }]}>{statusLabel(status)}</Text>
        </View>
        <Text style={[styles.code, { color: palette.textSecondary }]}>{order.trackingCode}</Text>
      </View>

      {/* Driver card */}
      <DriverCard
        driver={order.driver}
        onCall={() => Alert.alert('Call driver', 'Direct calling is wired in the next tracking module release.')}
      />

      {/* Address summary */}
      {(order.pickupFormattedAddress || order.deliveryFormattedAddress) && (
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Route summary</Text>
          {order.pickupFormattedAddress ? (
            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: palette.primary }]} />
              <Text style={[styles.addressText, { color: palette.text }]} numberOfLines={2}>
                {order.pickupFormattedAddress}
              </Text>
            </View>
          ) : null}
          {order.deliveryFormattedAddress ? (
            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: '#30D158' }]} />
              <Text style={[styles.addressText, { color: palette.text }]} numberOfLines={2}>
                {order.deliveryFormattedAddress}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Timeline */}
      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Status timeline</Text>
        <StatusTimeline items={order.statusHistory} />
      </View>

      {/* Actions */}
      {canConfirm && (
        <Pressable
          id="confirm-delivery-btn"
          onPress={async () => {
            try {
              await confirmDelivery.mutateAsync(order.id);
              router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to confirm delivery';
              Alert.alert('Confirm delivery', message);
            }
          }}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: palette.primary },
            pressed ? { opacity: 0.88 } : null,
          ]}
        >
          <Text style={styles.primaryText}>Confirm Delivery</Text>
        </Pressable>
      )}

      {canRate && (
        <Pressable
          id="rate-delivery-btn"
          onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: palette.primary },
            pressed ? { opacity: 0.8 } : null,
          ]}
        >
          <Text style={[styles.secondaryText, { color: palette.primary }]}>
            {order.rating ? 'View Rating' : 'Rate Delivery'}
          </Text>
        </Pressable>
      )}

      {/* Support hint */}
      <Pressable
        id="contact-support-btn"
        onPress={() => Alert.alert('Support', 'In-app support chat is coming soon.')}
        style={({ pressed }) => [styles.ghostRow, pressed ? { opacity: 0.7 } : null]}
      >
        <Phone size={14} color={palette.textSecondary} strokeWidth={1.5} />
        <Text style={[styles.ghostText, { color: palette.textSecondary }]}>Need help with this order?</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Loading
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingCard: { alignItems: 'center', gap: Spacing.md, borderRadius: 24, borderWidth: 1, padding: Spacing.xl, width: '100%' },
  loadingTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  loadingSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center' },

  // Map placeholder
  mapCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.xl, minHeight: 180, justifyContent: 'flex-end', gap: 6 },
  mapIconWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  mapBody: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },

  // Status pill row
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: Spacing.md },
  pillWrap: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: 999 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  code: { fontSize: Typography.sm, fontFamily: Typography.family.regular },

  // Address + timeline section
  sectionCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1.1, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  addressText: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20 },

  // Primary / secondary buttons
  primary: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondary: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'transparent' },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },

  // Ghost support row
  ghostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  ghostText: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
});
