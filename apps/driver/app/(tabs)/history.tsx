import { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, MapPin, Package } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useDriverOrdersHistory } from '@/hooks/useDriverOrders';
import { subscribeDriverSocket } from '@/lib/socket';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

function statusMeta(status: string): { label: string; color: string } {
  switch (status) {
    case 'DELIVERED':
    case 'COMPLETED':
      return { label: 'Delivered', color: '#30D158' };
    case 'IN_TRANSIT':
      return { label: 'On the way', color: '#0A84FF' };
    case 'MATCHED':
    case 'ACCEPTED':
      return { label: 'Accepted', color: '#0A84FF' };
    case 'CANCELLED':
      return { label: 'Cancelled', color: '#FF453A' };
    default:
      return { label: status.replace('_', ' '), color: '#FFD60A' };
  }
}

function HistoryCard({ order, palette }: { order: DriverOrder; palette: ReturnType<typeof useAppPalette> }) {
  const { label, color } = statusMeta(order.status);

  const date = new Date(order.createdAt);
  const dateLabel = date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>

      {/* ── Top row: icon + code + status badge ── */}
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
          <Package size={20} color={palette.primary} />
        </View>

        <View style={styles.cardTopCenter}>
          <Text style={[styles.trackingCode, { color: palette.text }]}>{order.trackingCode}</Text>
          <Text style={[styles.dateLine, { color: palette.textSecondary }]}>
            {dateLabel} · {timeLabel}
          </Text>
        </View>

        {/* Status badge — floats right, mirrors shipping history image */}
        <View style={[styles.statusBadge, { backgroundColor: hexToRgba(color, 0.13), borderColor: hexToRgba(color, 0.25) }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
      </View>

      {/* ── Route block ── */}
      <View style={[styles.routeBlock, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        {/* Pickup */}
        <View style={styles.routeRow}>
          <View style={styles.routeIconCol}>
            <View style={[styles.routeDot, { backgroundColor: '#30D158' }]} />
            <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
          </View>
          <View style={styles.routeTextCol}>
            <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Pickup</Text>
            <Text style={[styles.routeAddress, { color: palette.text }]} numberOfLines={1}>
              {order.pickupFormattedAddress}
            </Text>
          </View>
        </View>

        {/* Delivery */}
        <View style={styles.routeRow}>
          <View style={styles.routeIconCol}>
            <View style={[styles.routeDot, { backgroundColor: '#FF453A' }]} />
          </View>
          <View style={styles.routeTextCol}>
            <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Delivery</Text>
            <Text style={[styles.routeAddress, { color: palette.text }]} numberOfLines={1}>
              {order.deliveryFormattedAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Footer: chips + earnings ── */}
      <View style={styles.cardFooter}>
        <View style={styles.footerChips}>
          <View style={[styles.chip, { backgroundColor: hexToRgba(palette.primary, 0.1) }]}>
            <MapPin size={11} color={palette.primary} />
            <Text style={[styles.chipText, { color: palette.primary }]}>
              {order.distanceKm.toFixed(1)} km
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: hexToRgba(palette.primary, 0.1) }]}>
            <Text style={[styles.chipText, { color: palette.primary }]}>{order.size}</Text>
          </View>
        </View>

        <View style={styles.earningsBlock}>
          <Text style={[styles.earningsLabel, { color: palette.textSecondary }]}>Earnings</Text>
          <Text style={[styles.earningsValue, { color: '#30D158' }]}>{formatNaira(order.price)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const historyQuery = useDriverOrdersHistory();
  const history = historyQuery.data ?? [];

  useEffect(() => {
    const unsub = subscribeDriverSocket('order_status_update', () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-orders-history'] });
    });
    return unsub;
  }, [queryClient]);

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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 100 }]}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />
          <Text style={[styles.heroEyebrow, { color: palette.primary }]}>DELIVERY HISTORY</Text>
          <Text style={[styles.heroTitle, { color: palette.text }]}>Past routes & completed jobs</Text>
          <Text style={[styles.heroSubtitle, { color: palette.textSecondary }]}>
            Review your shift history, total earnings, and routes taken.
          </Text>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent deliveries</Text>
          {history.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
              <Text style={[styles.countBadgeText, { color: palette.primary }]}>
                {history.length} orders
              </Text>
            </View>
          )}
        </View>

        {/* List */}
        {historyQuery.isLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ActivityIndicator color={palette.primary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Loading history…</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {/* Layered icon illustration */}
            <View style={styles.emptyIllustration}>
              <View style={[styles.emptyRing, styles.emptyRingOuter, { borderColor: hexToRgba(palette.primary, 0.08) }]} />
              <View style={[styles.emptyRing, styles.emptyRingMid, { borderColor: hexToRgba(palette.primary, 0.13) }]} />
              <View style={[styles.emptyIconCircle, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <ClipboardList size={32} color={palette.primary} />
              </View>
            </View>

            <View style={styles.emptyCopy}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No deliveries yet</Text>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                Your completed runs, routes, and earnings will appear here after your first delivery.
              </Text>
            </View>

            {/* Hint pills */}
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
          </View>
        ) : (
          <View style={styles.list}>
            {history.map((order) => (
              <HistoryCard key={order.id} order={order} palette={palette} />
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

  // hero
  hero: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 8, overflow: 'hidden' },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSubtitle: { fontSize: 14, lineHeight: 20 },

  // section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  countBadgeText: { fontSize: 12, fontWeight: '700' },

  list: { gap: 14 },

  // card
  card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', gap: 0 },

  // card top row
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTopCenter: { flex: 1, gap: 3 },
  trackingCode: { fontSize: 15, fontWeight: '800' },
  dateLine: { fontSize: 12, fontWeight: '500' },

  // status badge — bordered pill, mirrors shipping history image
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },

  // route block
  routeBlock: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  routeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  routeIconCol: { alignItems: 'center', paddingTop: 4, width: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 1.5, flex: 1, minHeight: 16, marginTop: 3 },
  routeTextCol: { flex: 1, gap: 2 },
  routeLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0 },
  routeAddress: { fontSize: 13, fontWeight: '700', lineHeight: 18 },

  // footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 12 },
  footerChips: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  earningsBlock: { alignItems: 'flex-end', gap: 2 },
  earningsLabel: { fontSize: 11, fontWeight: '600' },
  earningsValue: { fontSize: 18, fontWeight: '800' },

  // empty state
  emptyCard: { borderRadius: 24, borderWidth: 1, padding: 32, alignItems: 'center', gap: 24 },
  emptyIllustration: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  emptyRing: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  emptyRingOuter: { width: 120, height: 120 },
  emptyRingMid: { width: 90, height: 90 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 260 },
  emptyHints: { width: '100%', gap: 10 },
  emptyHintRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyHintNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyHintNumText: { fontSize: 13, fontWeight: '800' },
  emptyHintText: { fontSize: 14, fontWeight: '600' },
});