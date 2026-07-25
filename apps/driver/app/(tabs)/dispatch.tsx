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
import { MapPin, Radar, Zap } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useAcceptOrder, useAvailableOrders, useDeclineOrder } from '@/hooks/useDriverOrders';
import { subscribeDriverSocket } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';
import { DispatchOrderCard } from '@/components/orders/DispatchOrderCard';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function DispatchBoardScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isOnline = useDriverStore((s) => s.isOnline);
  const ordersQuery = useAvailableOrders();
  const acceptOrder = useAcceptOrder();
  const declineOrder = useDeclineOrder();
  const orders = ordersQuery.data ?? [];

  // Live refresh on socket events
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: 120 }]}
      >
        {/* ── Hero ── */}
        <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />

          <View style={styles.heroInner}>
            <View style={{ flex: 1 }}>
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

          {/* Stats chips */}
          <View style={[styles.heroStats, { borderTopColor: palette.border }]}>
            <View style={[styles.heroStatChip, { backgroundColor: hexToRgba(palette.primary, 0.1) }]}>
              <Radar size={14} color={palette.primary} />
              <Text style={[styles.heroStatVal, { color: palette.text }]}>{orders.length}</Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Available</Text>
            </View>
            <View style={[styles.heroStatChip, { backgroundColor: hexToRgba('#30D158', 0.1) }]}>
              <Zap size={14} color="#30D158" />
              <Text style={[styles.heroStatVal, { color: '#30D158' }]}>
                {orders.length > 0 ? formatNaira(Math.max(...orders.map((o) => o.price))) : '—'}
              </Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Top payout</Text>
            </View>
            <View style={[styles.heroStatChip, { backgroundColor: hexToRgba('#FFD60A', 0.1) }]}>
              <MapPin size={14} color="#FFD60A" />
              <Text style={[styles.heroStatVal, { color: '#FFD60A' }]}>
                {orders.length > 0 ? `${Math.min(...orders.map((o) => o.distanceKm)).toFixed(1)} km` : '—'}
              </Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Nearest</Text>
            </View>
          </View>
        </View>

        {/* ── Section header ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Available now</Text>
          {ordersQuery.isFetching && !ordersQuery.isLoading && (
            <View style={[styles.refreshPill, { backgroundColor: hexToRgba(palette.primary, 0.1) }]}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={[styles.refreshText, { color: palette.primary }]}>Refreshing</Text>
            </View>
          )}
        </View>

        {/* ── Content ── */}
        {ordersQuery.isLoading ? (
          <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={[styles.stateText, { color: palette.textSecondary }]}>Loading dispatch board…</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.emptyIconRing, { borderColor: hexToRgba(palette.primary, 0.15) }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <Radar size={30} color={palette.primary} />
              </View>
            </View>
            <View style={styles.emptyCopy}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No live jobs yet</Text>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                {isOnline
                  ? 'When a pickup lands within your range, it will appear here automatically.'
                  : 'Go online on the Home tab to start receiving jobs.'}
              </Text>
            </View>
            {!isOnline && (
              <Pressable
                onPress={() => router.push('/(tabs)/home')}
                style={({ pressed }) => [
                  styles.goOnlineBtn,
                  { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.goOnlineBtnText}>Go online on Home</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {orders.map((order) => (
              <DispatchOrderCard
                key={order.id}
                order={order}
                accepting={acceptOrder.isPending}
                declining={declineOrder.isPending}
                onAccept={() => acceptOrder.mutate(order.id)}
                onDecline={() =>
                  declineOrder.mutate({ orderId: order.id, reason: 'Driver declined from dispatch board' })
                }
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
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },

  // ── hero ──
  hero: { borderRadius: 24, borderWidth: 1, padding: Spacing.xl, gap: Spacing.md, overflow: 'hidden' },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, zIndex: 1 },
  heroEyebrow: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle: { fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_700Bold' },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    zIndex: 1,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  heroStatChip: {
    flex: 1,
    borderRadius: 14,
    padding: Spacing.sm,
    gap: 2,
    alignItems: 'center',
  },
  heroStatVal: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  heroStatLabel: { fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium' },

  // ── section header ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  refreshPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  refreshText: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_500Medium' },

  // ── list ──
  list: { gap: Spacing.md },

  // ── state card ──
  stateCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xl,
  },
  stateText: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },

  // ── empty state ──
  emptyIconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: { alignItems: 'center', gap: Spacing.xs },
  emptyTitle: { fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  emptyText: {
    fontSize: Typography.sm,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  goOnlineBtn: {
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goOnlineBtnText: { color: '#fff', fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
});
