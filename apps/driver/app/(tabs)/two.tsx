import { useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Clock, DollarSign, Zap } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useAcceptOrder, useAvailableOrders } from '@/hooks/useDriverOrders';
import { subscribeDriverSocket } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({ status, palette }: { status: string; palette: ReturnType<typeof useAppPalette> }) {
  const cfg: Record<string, { label: string; color: string }> = {
    PENDING_MATCH: { label: 'Waiting', color: '#FFD60A' },
    MATCHED:       { label: 'Offered to you', color: palette.primary },
    ACCEPTED:      { label: 'Accepted', color: '#30D158' },
    IN_TRANSIT:    { label: 'In transit', color: '#0A84FF' },
    DELIVERED:     { label: 'Delivered', color: '#30D158' },
    COMPLETED:     { label: 'Completed', color: '#30D158' },
    CANCELLED:     { label: 'Cancelled', color: '#FF453A' },
  };
  const { label, color } = cfg[status] ?? { label: status, color: palette.textSecondary };
  return (
    <View style={[styles.statusBadge, { backgroundColor: hexToRgba(color, 0.14) }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function OrderCard({
  order,
  onAccept,
  accepting,
  palette,
}: {
  order: DriverOrder;
  onAccept: () => void;
  accepting: boolean;
  palette: ReturnType<typeof useAppPalette>;
}) {
  const canAccept = order.status === 'PENDING_MATCH' || order.status === 'MATCHED';

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={[styles.trackingCode, { color: palette.primary }]}>{order.trackingCode}</Text>
          <Text style={[styles.cardSize, { color: palette.text }]}>{order.size} package</Text>
        </View>
        <StatusBadge status={order.status} palette={palette} />
      </View>

      {/* Route */}
      <View style={[styles.routeBox, { backgroundColor: palette.bg }]}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: '#30D158' }]} />
          <View style={styles.routeContent}>
            <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>PICKUP</Text>
            <Text style={[styles.routeAddr, { color: palette.text }]} numberOfLines={2}>
              {order.pickupFormattedAddress}
            </Text>
          </View>
        </View>
        <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: '#FF9F0A' }]} />
          <View style={styles.routeContent}>
            <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>DROPOFF</Text>
            <Text style={[styles.routeAddr, { color: palette.text }]} numberOfLines={2}>
              {order.deliveryFormattedAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { Icon: MapPin,    value: `${order.distanceKm.toFixed(1)} km`,       color: palette.primary },
          { Icon: Clock,     value: `${order.estimatedDurationMin} min`,        color: '#FFD60A' },
          { Icon: DollarSign, value: formatNaira(order.price),                 color: '#30D158' },
        ].map(({ Icon, value, color }) => (
          <View key={value} style={[styles.statChip, { backgroundColor: hexToRgba(color, 0.10) }]}>
            <Icon size={13} color={color} />
            <Text style={[styles.statText, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Accept button — only shown for actionable orders */}
      {canAccept && (
        <Pressable
          onPress={onAccept}
          disabled={accepting}
          style={({ pressed }) => [
            styles.acceptBtn,
            { backgroundColor: palette.primary, opacity: pressed || accepting ? 0.75 : 1 },
          ]}
        >
          {accepting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.acceptBtnText}>Accept job</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function DispatchBoardScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isOnline = useDriverStore((s) => s.isOnline);
  const ordersQuery = useAvailableOrders();
  const acceptOrder = useAcceptOrder();
  const orders = ordersQuery.data ?? [];

  // Live refresh: whenever the socket tells us there's a new order or status change, refetch
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
  }, [queryClient]);

  useEffect(() => {
    const unsub1 = subscribeDriverSocket('new_order_available', invalidate);
    const unsub2 = subscribeDriverSocket('order_status_update', invalidate);
    const unsub3 = subscribeDriverSocket('order_cancelled', invalidate);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [invalidate]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isRefetching}
            onRefresh={() => void ordersQuery.refetch()}
            tintColor={palette.primary}
          />
        }
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 100 }]}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />
          <View style={styles.heroInner}>
            <View>
              <Text style={[styles.heroEyebrow, { color: palette.primary }]}>DISPATCH BOARD</Text>
              <Text style={[styles.heroTitle, { color: palette.text }]}>
                {isOnline ? 'Live jobs in range' : 'Go online to see jobs'}
              </Text>
            </View>
            <View style={[styles.livePill, { backgroundColor: hexToRgba(isOnline ? '#30D158' : palette.textSecondary, 0.14) }]}>
              <View style={[styles.liveDot, { backgroundColor: isOnline ? '#30D158' : palette.textSecondary }]} />
              <Text style={[styles.liveText, { color: isOnline ? '#30D158' : palette.textSecondary }]}>
                {isOnline ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatVal, { color: palette.text }]}>{orders.length}</Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Available</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: palette.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatVal, { color: palette.text }]}>
                {orders.length > 0 ? formatNaira(Math.max(...orders.map((o) => o.price))) : '—'}
              </Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Top payout</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: palette.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatVal, { color: palette.text }]}>
                {orders.length > 0 ? `${Math.min(...orders.map((o) => o.distanceKm)).toFixed(1)} km` : '—'}
              </Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Nearest</Text>
            </View>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Available now</Text>
          <Text style={[styles.sectionCaption, { color: palette.textSecondary }]}>
            {ordersQuery.isFetching ? 'Refreshing…' : 'Pull to refresh'}
          </Text>
        </View>

        {/* Loading state */}
        {ordersQuery.isLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ActivityIndicator color={palette.primary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Loading dispatch board…</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Zap size={28} color={palette.textSecondary} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No live jobs yet</Text>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              {isOnline
                ? 'When a pickup lands within your range, it will appear here automatically.'
                : 'Go online on the Home tab to start receiving jobs.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                accepting={acceptOrder.isPending}
                onAccept={() => acceptOrder.mutate(order.id)}
                palette={palette}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },

  // hero card
  hero: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 16, overflow: 'hidden' },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  heroEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12, fontWeight: '700' },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 0, zIndex: 1 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatVal: { fontSize: 18, fontWeight: '800' },
  heroStatLabel: { fontSize: 11, fontWeight: '500' },
  heroStatDivider: { width: 1, height: 36 },

  // section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionCaption: { fontSize: 12, fontWeight: '500' },

  // list
  list: { gap: 12 },

  // order card
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTopLeft: { flex: 1, gap: 2 },
  trackingCode: { fontSize: 12, fontWeight: '800', letterSpacing: 0 },
  cardSize: { fontSize: 16, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // route
  routeBox: { borderRadius: 16, padding: 12, gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeContent: { flex: 1, gap: 1 },
  routeLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  routeAddr: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  routeLine: { width: 1, height: 14, marginLeft: 4 },

  // stats
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  statText: { fontSize: 12, fontWeight: '700' },

  // accept button
  acceptBtn: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // empty
  emptyCard: { borderRadius: 22, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});
