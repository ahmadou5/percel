import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, ChevronRight, Zap } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useDriverOrdersHistory } from '@/hooks/useDriverOrders';
import { subscribeDriverSocket } from '@/lib/socket';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

function HistoryCard({ order, palette }: { order: DriverOrder; palette: ReturnType<typeof useAppPalette> }) {
  const isCompleted = order.status === 'COMPLETED' || order.status === 'DELIVERED';
  const statusColor = isCompleted ? '#30D158' : order.status === 'CANCELLED' ? '#FF453A' : '#FF9F0A';

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={[styles.code, { color: palette.primary }]}>{order.trackingCode}</Text>
          <Text style={[styles.date, { color: palette.textSecondary }]}>
            {new Date(order.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: hexToRgba(statusColor, 0.12) }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{order.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={[styles.routeBox, { backgroundColor: palette.bg }]}>
        <Text style={[styles.address, { color: palette.text }]} numberOfLines={1}>
          🟢 {order.pickupFormattedAddress}
        </Text>
        <Text style={[styles.address, { color: palette.text, marginTop: 4 }]} numberOfLines={1}>
          🔴 {order.deliveryFormattedAddress}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.payoutLabel, { color: palette.textSecondary }]}>Earnings</Text>
        <Text style={[styles.payoutValue, { color: palette.text }]}>{formatNaira(order.price)}</Text>
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
    // When order status is updated (delivered, completed etc.), refetch history
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

        {/* Section title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent deliveries</Text>
          <Text style={[styles.sectionCaption, { color: palette.textSecondary }]}>
            {history.length} completed
          </Text>
        </View>

        {/* List */}
        {historyQuery.isLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ActivityIndicator color={palette.primary} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Loading history…</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ClipboardList size={28} color={palette.textSecondary} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No past jobs</Text>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              Your completed runs and earnings will show up here automatically.
            </Text>
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
  heroEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSubtitle: { fontSize: 14, lineHeight: 20 },

  // section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionCaption: { fontSize: 12, fontWeight: '500' },

  // list
  list: { gap: 12 },

  // card
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { gap: 2 },
  code: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  date: { fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeBox: { borderRadius: 14, padding: 12 },
  address: { fontSize: 13, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(148,163,184,0.15)', paddingTop: 10 },
  payoutLabel: { fontSize: 12, fontWeight: '600' },
  payoutValue: { fontSize: 16, fontWeight: '800' },

  // empty card
  emptyCard: { borderRadius: 22, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 240 },
});
