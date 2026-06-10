import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Package, Clock3, BadgeCheck, ChevronLeft } from 'lucide-react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrders } from '@/hooks/useOrder';
import { useAppPalette } from '@/lib/theme';
import { useSafeBack } from '@/components/navigation/useSafeBack';

const ACTIVE_STATUSES = ['CREATED', 'PENDING_MATCH', 'MATCHED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'] as const;
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'DISPUTED'] as const;

function isActiveStatus(status: string) {
  return ACTIVE_STATUSES.some((item) => item === status);
}

function isPastStatus(status: string) {
  return PAST_STATUSES.some((item) => item === status);
}

type Tab = 'ACTIVE' | 'PAST';

function formatMoney(value: number) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function getStatusConfig(status: string) {
  const s = status.toUpperCase();
  if (['CREATED', 'PENDING_MATCH'].includes(s)) {
    return {
      text: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      label: 'Pending',
    };
  }
  if (['MATCHED', 'ACCEPTED', 'IN_TRANSIT'].includes(s)) {
    return {
      text: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
      label: 'In Transit',
    };
  }
  if (['DELIVERED', 'COMPLETED'].includes(s)) {
    return {
      text: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
      label: 'Delivered',
    };
  }
  return {
    text: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    label: s === 'CANCELLED' ? 'Cancelled' : 'Failed',
  };
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
  const statusConfig = getStatusConfig(order.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.waybillBox}>
          <Package size={16} color="#8B5CF6" />
          <Text style={styles.waybillText}>{order.trackingCode}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
          <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeTimeline}>
          <View style={styles.routeDotOuter}>
            <View style={[styles.routeDotInner, { backgroundColor: '#8B5CF6' }]} />
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeDotOuter}>
            <View style={[styles.routeDotInner, { backgroundColor: '#10B981' }]} />
          </View>
        </View>
        <View style={styles.routeAddresses}>
          <Text style={styles.routeAddressText} numberOfLines={1}>
            {order.pickupFormattedAddress}
          </Text>
          <Text style={styles.routeAddressTextMuted} numberOfLines={1}>
            {order.deliveryFormattedAddress}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Clock3 size={12} color="#8888AA" />
          <Text style={styles.cardDate}>
            {new Date(order.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <Text style={styles.cardPrice}>{formatMoney(Number(order.price))}</Text>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const back = useSafeBack("/");
  const query = useOrders();
  const [tab, setTab] = useState<Tab>('ACTIVE');

  const orders = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const active = orders.filter((order) => isActiveStatus(order.status));
  const past = orders.filter((order) => isPastStatus(order.status));
  const current = tab === 'ACTIVE' ? active : past;

  const refresh = () => {
    void query.refetch();
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: '#0A0A0F' }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={refresh} tintColor="#8B5CF6" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => back()}>
          <ChevronLeft size={18} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={styles.eyebrowTitle}>Orders</Text>
        <Text style={styles.titleText}>Track your deliveries with real-time status updates.</Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Live Delivery Status</Text>
            <Text style={styles.heroValue}>Your active and past packages</Text>
          </View>
          <View style={styles.heroBadge}>
            <Package size={20} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Active</Text>
            <Text style={styles.summaryValue}>{active.length}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Past</Text>
            <Text style={styles.summaryValue}>{past.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        {(['ACTIVE', 'PAST'] as const).map((item) => {
          const selected = item === tab;
          return (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={({ pressed }) => [
                styles.tab,
                selected ? { backgroundColor: '#8B5CF6' } : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.tabText, { color: selected ? '#FFFFFF' : '#8888AA' }]}>
                {item === 'ACTIVE' ? 'Active' : 'Past'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color="#8B5CF6" size="large" />
          <Text style={styles.stateTitle}>Loading orders</Text>
          <Text style={styles.stateBody}>We’re pulling your latest deliveries and statuses.</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.stateCard}>
          <BadgeCheck size={32} color="#EF4444" />
          <Text style={styles.stateTitle}>Couldn’t load orders</Text>
          <Text style={styles.stateBody}>Check your connection and try again.</Text>
          <Pressable onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : current.length ? (
        current.map((order) => <OrderCard key={order.id} order={order} onPress={() => router.push(`/orders/${order.id}`)} />)
      ) : (
        <View style={styles.stateCard}>
          <BadgeCheck size={32} color="#8888AA" />
          <Text style={styles.stateTitle}>No orders here yet</Text>
          <Text style={styles.stateBody}>Create a delivery to see it show up here.</Text>
          <Pressable onPress={() => router.push('/send')} style={styles.retryButton}>
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
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrowTitle: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold, color: '#8B5CF6' },
  titleText: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', padding: Spacing.lg, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: '#8888AA', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Typography.family.bold },
  heroValue: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold, marginTop: 2 },
  heroBadge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryChip: { flex: 1, borderRadius: 16, padding: Spacing.md, backgroundColor: 'rgba(255,255,255,0.04)', gap: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  summaryLabel: { color: '#8888AA', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryValue: { color: '#FFFFFF', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  tabRow: { flexDirection: 'row', gap: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', padding: 6 },
  tab: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  card: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', padding: Spacing.lg, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  waybillBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waybillText: { fontSize: Typography.sm, fontFamily: Typography.family.bold, color: '#FFFFFF', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  routeContainer: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  routeTimeline: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  routeDotOuter: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  routeDotInner: { width: 6, height: 6, borderRadius: 3 },
  routeLine: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 2 },
  routeAddresses: { flex: 1, justifyContent: 'space-between', gap: 8 },
  routeAddressText: { fontSize: Typography.sm, fontFamily: Typography.family.medium, color: '#FFFFFF' },
  routeAddressTextMuted: { fontSize: Typography.sm, fontFamily: Typography.family.regular, color: '#8888AA' },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: Typography.xs, fontFamily: Typography.family.medium, color: '#8888AA' },
  cardPrice: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  stateCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', padding: Spacing.lg, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, color: '#FFFFFF', textAlign: 'center' },
  stateBody: { fontSize: Typography.sm, lineHeight: 20, color: '#8888AA', textAlign: 'center', maxWidth: 270, fontFamily: Typography.family.regular },
  retryButton: { minHeight: 48, borderRadius: 16, backgroundColor: '#8B5CF6', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  pressed: { opacity: 0.9 },
});
