import { useRouter } from 'expo-router';
import { Package, Clock3, BadgeCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrders } from '@/hooks/useOrder';
import { useAppPalette } from '@/lib/theme';
import { ListSkeleton } from '@/components/ui/Skeleton';

const ACTIVE_STATUSES = ['CREATED', 'PENDING_MATCH', 'MATCHED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'] as const;
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'DISPUTED'] as const;

function isActiveStatus(status: string) {
  return ACTIVE_STATUSES.some((item) => item === status);
}

function isPastStatus(status: string) {
  return PAST_STATUSES.some((item) => item === status);
}

function isLiveTrackable(status: string) {
  return ['IN_TRANSIT', 'ACCEPTED'].includes(status);
}

type Tab = 'ACTIVE' | 'PAST';

function formatMoney(value: number) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function getStatusConfig(status: string) {
  const s = status.toUpperCase();
  if (['CREATED', 'PENDING_MATCH'].includes(s)) {
    return { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', label: 'Pending' };
  }
  if (s === 'MATCHED') {
    return { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', label: 'Driver matched' };
  }
  if (s === 'ACCEPTED') {
    return { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', label: 'Driver accepted' };
  }
  if (s === 'IN_TRANSIT') {
    return { text: '#0A84FF', bg: 'rgba(10, 132, 255, 0.12)', label: 'In Transit' };
  }
  if (['DELIVERED', 'COMPLETED'].includes(s)) {
    return { text: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Delivered' };
  }
  return { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', label: s === 'CANCELLED' ? 'Cancelled' : 'Failed' };
}

type OrderItem = {
  id: string;
  trackingCode: string;
  price: string | number;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  createdAt: string;
  status: string;
};

function OrderCard({ order, onPress }: { order: OrderItem; onPress: () => void }) {
  const palette = useAppPalette();
  const statusConfig = getStatusConfig(order.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.waybillBox}>
          <Package size={16} color={palette.primary} />
          <Text style={[styles.waybillText, { color: palette.text }]}>{order.trackingCode}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
          <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeTimeline}>
          <View style={[styles.routeDotOuter, { backgroundColor: `${palette.primary}20` }]}>
            <View style={[styles.routeDotInner, { backgroundColor: palette.primary }]} />
          </View>
          <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
          <View style={[styles.routeDotOuter, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <View style={[styles.routeDotInner, { backgroundColor: '#10B981' }]} />
          </View>
        </View>
        <View style={styles.routeAddresses}>
          <Text style={[styles.routeAddressText, { color: palette.text }]} numberOfLines={1}>
            {order.pickupFormattedAddress}
          </Text>
          <Text style={[styles.routeAddressTextMuted, { color: palette.textSecondary }]} numberOfLines={1}>
            {order.deliveryFormattedAddress}
          </Text>
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: palette.border }]} />

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Clock3 size={12} color={palette.textSecondary} />
          <Text style={[styles.cardDate, { color: palette.textSecondary }]}>
            {new Date(order.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <Text style={[styles.cardPrice, { color: palette.text }]}>{formatMoney(Number(order.price))}</Text>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const query = useOrders();
  const [tab, setTab] = useState<Tab>('ACTIVE');

  const orders = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const active = orders.filter((order) => isActiveStatus(order.status));
  const past = orders.filter((order) => isPastStatus(order.status));
  const current = tab === 'ACTIVE' ? active : past;

  const refresh = () => { void query.refetch(); };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={refresh} tintColor={palette.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Back + title header */}
      <View style={styles.headerRow}>
       
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrowTitle, { color: palette.primary }]}>Orders</Text>
        <Text style={[styles.titleText, { color: palette.text }]}>Track your deliveries with real-time status updates.</Text>
      </View>

      {/* Summary hero card */}
      <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.heroLabel, { color: palette.textSecondary }]}>Live Delivery Status</Text>
            <Text style={[styles.heroValue, { color: palette.text }]}>Your active and past packages</Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: `${palette.primary}1A` }]}>
            <Package size={20} color={palette.primary} />
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: `${palette.primary}0D`, borderColor: palette.border }]}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Active</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{active.length}</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: `${palette.primary}0D`, borderColor: palette.border }]}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Past</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{past.length}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {(['ACTIVE', 'PAST'] as const).map((item) => {
          const selected = item === tab;
          return (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={({ pressed }) => [
                styles.tab,
                selected ? { backgroundColor: palette.primary } : null,
                pressed ? { opacity: 0.8 } : null,
              ]}
            >
              <Text style={[styles.tabText, { color: selected ? '#FFFFFF' : palette.textSecondary }]}>
                {item === 'ACTIVE' ? 'Active' : 'Past'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List / empty / error states */}
      {query.isLoading ? (
        <ListSkeleton />
      ) : query.isError ? (
        <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <BadgeCheck size={32} color="#EF4444" />
          <Text style={[styles.stateTitle, { color: palette.text }]}>Couldn't load orders</Text>
          <Text style={[styles.stateBody, { color: palette.textSecondary }]}>Check your connection and try again.</Text>
          <Pressable onPress={refresh} style={[styles.retryButton, { backgroundColor: palette.primary }]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : current.length ? (
        current.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onPress={() => router.push(
              isLiveTrackable(order.status)
                ? ({ pathname: '/(tabs)/send/tracking/[id]', params: { id: order.id } } as never)
                : ({ pathname: '/orders/[id]', params: { id: order.id } } as never)
            )}
          />
        ))
      ) : (
        <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <BadgeCheck size={32} color={palette.textSecondary} />
          <Text style={[styles.stateTitle, { color: palette.text }]}>No orders here yet</Text>
          <Text style={[styles.stateBody, { color: palette.textSecondary }]}>Create a delivery to see it show up here.</Text>
          <Pressable onPress={() => router.navigate('/send')} style={[styles.retryButton, { backgroundColor: palette.primary }]}>
            <Text style={styles.retryText}>Create order</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { gap: 6 },
  eyebrowTitle: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  titleText: { fontSize: 26, lineHeight: 32, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Typography.family.bold },
  heroValue: { fontSize: Typography.md, fontFamily: Typography.family.bold, marginTop: 2 },
  heroBadge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryChip: { flex: 1, borderRadius: 16, padding: Spacing.md, gap: 2, borderWidth: 1 },
  summaryLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryValue: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  tabRow: { flexDirection: 'row', gap: 10, borderRadius: 20, borderWidth: 1, padding: 6 },
  tab: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  waybillBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waybillText: { fontSize: Typography.sm, fontFamily: Typography.family.bold, letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  routeContainer: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  routeTimeline: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  routeDotOuter: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  routeDotInner: { width: 6, height: 6, borderRadius: 3 },
  routeLine: { width: 1, flex: 1, marginVertical: 2 },
  routeAddresses: { flex: 1, justifyContent: 'space-between', gap: 8 },
  routeAddressText: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  routeAddressTextMuted: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  cardDivider: { height: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  cardPrice: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  stateCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  stateBody: { fontSize: Typography.sm, lineHeight: 20, textAlign: 'center', maxWidth: 270, fontFamily: Typography.family.regular },
  retryButton: { minHeight: 48, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
});
