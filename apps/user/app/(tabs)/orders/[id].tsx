import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CircleArrowRight, MapPin, Package, ShieldCheck } from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { DriverCard } from '@/components/order/DriverCard';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useCancelOrder, useOrderDetail } from '@/hooks/useOrder';
import { useAppPalette } from '@/lib/theme';

function getStatusConfig(status: string) {
  const s = status.toUpperCase();
  if (['CREATED', 'PENDING_MATCH'].includes(s)) {
    return { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', label: 'Pending' };
  }
  if (['MATCHED', 'ACCEPTED', 'IN_TRANSIT'].includes(s)) {
    return { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', label: 'In Transit' };
  }
  if (['DELIVERED', 'COMPLETED'].includes(s)) {
    return { text: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Delivered' };
  }
  return { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', label: s === 'CANCELLED' ? 'Cancelled' : 'Failed' };
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const back = useSafeBack('/orders');
  const palette = useAppPalette();
  const query = useOrderDetail(id);
  const cancelMutation = useCancelOrder();
  const order = query.data;

  const handleCancel = () => {
    if (!order) return;
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This will refund the payment back to your wallet.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(
              { id: order.id, reason: 'User requested cancellation' },
              {
                onSuccess: () => {
                  Alert.alert('Success', 'Your order has been cancelled and refunded.');
                },
                onError: (error) => {
                  const message = error instanceof Error ? error.message : 'Unable to cancel order';
                  Alert.alert('Error', message);
                },
              }
            );
          },
        },
      ]
    );
  };

  const isCancellable = order && ['CREATED', 'PENDING_MATCH', 'MATCHED'].includes(order.status);

  if (query.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.primary} size="large" />
        <Text style={[styles.loading, { color: palette.text }]}>Loading order…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.text }]}>Order not found</Text>
        <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>
          We couldn't load that delivery right now.
        </Text>
        <Pressable
          onPress={() => back()}
          style={[styles.retryButton, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isDone = order.status === 'DELIVERED' || order.status === 'COMPLETED';
  const isActiveDelivery = order.status === 'IN_TRANSIT' || order.status === 'ACCEPTED';
  const statusConfig = getStatusConfig(order.status);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero card */}
      <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.heroTop}>
          <Pressable
            onPress={() => back()}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ChevronLeft size={18} color={palette.text} />
          </Pressable>
          <View style={[styles.heroBadge, { backgroundColor: `${palette.primary}1A` }]}>
            <Package size={18} color={palette.primary} />
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>Order detail</Text>

        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.text }]}>{order.trackingCode}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
            <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: `${palette.primary}0D`, borderColor: palette.border }]}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Price</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>
              ₦{Number(order.price).toLocaleString('en-NG')}
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: `${palette.primary}0D`, borderColor: palette.border }]}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Created</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>
              {new Date(order.createdAt).toLocaleDateString('en-NG')}
            </Text>
          </View>
        </View>
      </View>

      {order.status === 'CANCELLED' && order.cancelReason ? (
        <View style={[styles.cancelReasonCard, { backgroundColor: `${palette.error}0D`, borderColor: `${palette.error}33` }]}>
          <Text style={[styles.cancelReasonTitle, { color: palette.error }]}>Cancellation Reason</Text>
          <Text style={[styles.cancelReasonText, { color: palette.text }]}>{order.cancelReason}</Text>
        </View>
      ) : null}

      {/* Route card */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: Spacing.sm }]}>Route</Text>

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
                {order.pickupFormattedAddress}
              </Text>
            </View>
            <View style={styles.routeDetailItem}>
              <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Delivery Location</Text>
              <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                {order.deliveryFormattedAddress}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Driver card - show if driver is assigned */}
      {order.driver ? (
        <DriverCard
          driver={order.driver}
          onCall={() => Alert.alert('Call driver', 'Driver calling is wired in the tracking prompt.')}
        />
      ) : null}

      {/* Items card */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Items</Text>
        {(order.items ?? []).length ? (
          (order.items ?? []).map((item, index) => (
            <View key={`${item.description}-${index}`} style={[styles.itemRow, { borderTopColor: palette.border }]}>
              <Text style={[styles.itemText, { color: palette.text }]}>{item.description}</Text>
              <Text style={[styles.itemQty, { color: palette.textSecondary }]}>x{item.quantity}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyBodyMuted, { color: palette.textSecondary }]}>
            No item list was attached to this order.
          </Text>
        )}
      </View>

      {/* Status history */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Status history</Text>
        <StatusTimeline items={order.statusHistory} orderStatus={order.status} />
      </View>

      {isActiveDelivery ? (
        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/send/tracking/[id]', params: { id: order.id } } as never)}
          style={({ pressed }) => [
            styles.trackButton,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.trackButtonText}>Track Live</Text>
        </Pressable>
      ) : null}

      {/* Confirm delivery CTA — shown when driver has marked delivered but user hasn't confirmed yet */}
      {order.status === 'DELIVERED' ? (
        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/send/tracking/[id]', params: { id: order.id } } as never)}
          style={({ pressed }) => [
            styles.rateButton,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.rateButtonText}>Confirm Delivery</Text>
        </Pressable>
      ) : null}

      {/* Rate CTA — only available after order is fully COMPLETED */}
      {order.status === 'COMPLETED' ? (
        <Pressable
          onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)}
          style={({ pressed }) => [
            styles.rateButton,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.rateButtonText}>{order.rating ? 'View rating' : 'Rate delivery'}</Text>
        </Pressable>
      ) : null}

      {/* Cancel CTA — only available if order is in a cancellable state */}
      {isCancellable ? (
        <Pressable
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
          style={({ pressed }) => [
            styles.cancelButton,
            { borderColor: palette.error },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.cancelButtonText, { color: palette.error }]}>
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: 10 },
  loading: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  emptyBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 20 },
  emptyBodyMuted: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20 },
  retryButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  heroCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: Typography.family.bold, letterSpacing: -0.5, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  summaryChip: { flex: 1, borderRadius: 16, padding: Spacing.md, gap: 4, borderWidth: 1 },
  summaryLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  routeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  routeConnectorCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  routeDetailsCol: {
    flex: 1,
    gap: Spacing.md,
  },
  routeDetailItem: {
    gap: 2,
  },
  routeLabel: {
    fontSize: 9,
    fontFamily: Typography.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
    lineHeight: 18,
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1 },
  itemText: { fontSize: Typography.md, fontFamily: Typography.family.medium, flex: 1 },
  itemQty: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  trackButton: { borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  trackButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  rateButton: { borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  rateButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  cancelButton: { borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 4 },
  cancelButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cancelReasonCard: { borderRadius: 16, borderWidth: 1, padding: Spacing.md, gap: 4 },
  cancelReasonTitle: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  cancelReasonText: { fontSize: Typography.sm, fontFamily: Typography.family.medium, lineHeight: 20 },
});
