import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Search, Wallet, ArrowRight } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { router } from 'expo-router';

import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useDriverOrdersHistory } from '@/hooks/useDriverOrders';
import { subscribeDriverSocket } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';
import { DispatchOrderCard } from '@/components/orders/DispatchOrderCard';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { DriverOrder } from '@/lib/types';

type Filter = 'ALL' | 'COMPLETED' | 'CANCELLED';

const FILTER_OPTIONS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

function filterOrders(orders: DriverOrder[], filter: Filter, query: string): DriverOrder[] {
  let list = orders;
  if (filter === 'COMPLETED') {
    list = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
  } else if (filter === 'CANCELLED') {
    list = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'DISPUTED');
  }

  const q = query.trim().toLowerCase();
  if (!q) return list;

  return list.filter((o) => {
    const haystack = `${o.trackingCode} ${o.pickupFormattedAddress} ${o.deliveryFormattedAddress} ${o.recipientName || ''} ${o.customer?.fullName || ''}`.toLowerCase();
    return haystack.includes(q);
  });
}

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function HistoryScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const historyQuery = useDriverOrdersHistory();
  const allOrders = historyQuery.data ?? [];
  const [filter, setFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const isAuthenticated = useDriverStore((s) => s.isAuthenticated);

  useEffect(() => {
    const unsub = subscribeDriverSocket('order_status_update', () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-orders-history'] });
    });
    return unsub;
  }, [queryClient]);

  const visible = filterOrders(allOrders, filter, searchQuery);

  // Summary stats
  const completedCount = allOrders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED').length;
  const totalEarnings = allOrders
    .filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.price, 0);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isRefetching}
            onRefresh={() => void historyQuery.refetch()}
            tintColor={palette.primary}
          />
        }
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: 120 }]}
      >
        {/* ── Hero ── */}
        <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />
          <Text style={[styles.heroEyebrow, { color: palette.primary }]}>DELIVERY HISTORY</Text>

          {/* Summary stat chips */}
          <View style={styles.heroStatRow}>
            <View style={[styles.heroStatChip, { backgroundColor: hexToRgba(palette.primary, 0.1), borderColor: hexToRgba(palette.primary, 0.2) }]}>
              <Text style={[styles.heroStatValue, { color: palette.text }]}>{completedCount}</Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Completed</Text>
            </View>
            <View style={[styles.heroStatChip, { backgroundColor: hexToRgba('#30D158', 0.1), borderColor: hexToRgba('#30D158', 0.2) }]}>
              <Text style={[styles.heroStatValue, { color: '#30D158' }]}>{formatNaira(totalEarnings)}</Text>
              <Text style={[styles.heroStatLabel, { color: palette.textSecondary }]}>Total earned</Text>
            </View>
          </View>
        </View>

        {/* ── Search & Ledger Link Banner ── */}
        <View style={[styles.searchBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Search size={18} color={palette.textSecondary} style={{ marginRight: Spacing.xs }} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search deliveries by tracking code or address…"
            placeholderTextColor={palette.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>



        {/* ── Filter tabs ── */}
        <View style={[styles.tabRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {FILTER_OPTIONS.map(({ key, label }) => {
            const selected = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={({ pressed }) => [
                  styles.tab,
                  selected && { backgroundColor: palette.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.tabText, { color: selected ? '#fff' : palette.textSecondary }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Section header ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {filter === 'ALL' ? 'Recent deliveries' : filter === 'COMPLETED' ? 'Completed runs' : 'Cancelled orders'}
          </Text>
          {visible.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
              <Text style={[styles.countBadgeText, { color: palette.primary }]}>
                {visible.length}
              </Text>
            </View>
          )}
        </View>

        {/* ── List / Loading / Empty ── */}
        {historyQuery.isLoading ? (
          <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ActivityIndicator color={palette.primary} />
            <Text style={[styles.stateText, { color: palette.textSecondary }]}>Loading history…</Text>
          </View>
        ) : visible.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {/* Icon illustration */}
            <View style={styles.emptyIllustration}>
              <View style={[styles.emptyRing, styles.emptyRingOuter, { borderColor: hexToRgba(palette.primary, 0.08) }]} />
              <View style={[styles.emptyRing, styles.emptyRingMid, { borderColor: hexToRgba(palette.primary, 0.13) }]} />
              <View style={[styles.emptyIconCircle, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <ClipboardList size={32} color={palette.primary} />
              </View>
            </View>

            <View style={styles.emptyCopy}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                {filter === 'ALL' ? 'No deliveries yet' : 'Nothing here'}
              </Text>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                {filter === 'ALL'
                  ? 'Your completed runs, routes, and earnings will appear here after your first delivery.'
                  : `No ${filter.toLowerCase()} orders found.`}
              </Text>
            </View>

            {filter === 'ALL' && (
              <View style={styles.emptyHints}>
                {['Go online', 'Accept an order', 'Complete delivery'].map((step, i) => (
                  <View key={step} style={styles.emptyHintRow}>
                    <View style={[styles.emptyHintNum, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                      <Text style={[styles.emptyHintNumText, { color: palette.primary }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.emptyHintText, { color: palette.textSecondary }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {visible.map((order) => (
              <DispatchOrderCard
                key={order.id}
                order={order}
                readonly
                onPress={() => router.push({ pathname: '/(tabs)/orders/[id]', params: { id: order.id } })}
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
  hero: { borderRadius: 24, borderWidth: 1, padding: Spacing.xl, gap: Spacing.sm, overflow: 'hidden' },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroEyebrow: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontSize: Typography.xl, fontFamily: 'SpaceGrotesk_700Bold' },
  heroSubtitle: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20 },
  heroStatRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  heroStatChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 2,
  },
  heroStatValue: { fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold' },
  heroStatLabel: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_500Medium' },

  // ── search box ──
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.xs,
    fontFamily: 'SpaceGrotesk_500Medium',
  },

  // ── ledger banner ──
  ledgerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  ledgerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerTitle: {
    fontSize: Typography.xs + 1,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  ledgerSub: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
  },

  // ── filter tabs ──
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    padding: 5,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold' },

  // ── section header ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  countBadgeText: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_700Bold' },

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
  emptyIllustration: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyRing: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  emptyRingOuter: { width: 120, height: 120 },
  emptyRingMid: { width: 90, height: 90 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { alignItems: 'center', gap: Spacing.xs },
  emptyTitle: { fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  emptyText: {
    fontSize: Typography.sm,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyHints: { width: '100%', gap: Spacing.sm },
  emptyHintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  emptyHintNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyHintNumText: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold' },
  emptyHintText: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium' },
});