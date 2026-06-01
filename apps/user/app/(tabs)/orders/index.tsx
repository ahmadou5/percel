import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CircleArrowRight, Package, Clock3, BadgeCheck, ChevronLeft } from 'lucide-react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrders } from '@/hooks/useOrder';
import { useColorScheme } from '@/components/useColorScheme';

const ACTIVE_STATUSES = ['CREATED', 'PENDING_MATCH', 'MATCHED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'] as const;
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'DISPUTED'] as const;

function isActiveStatus(status: string) {
  return ACTIVE_STATUSES.some((item) => item === status);
}

function isPastStatus(status: string) {
  return PAST_STATUSES.some((item) => item === status);
}

type Tab = 'ACTIVE' | 'PAST';

function titleize(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatMoney(value: number) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function OrderCard({ order, palette, onPress }: { order: any; palette: (typeof Colors)[keyof typeof Colors]; onPress: () => void }) {
  const isLive = isActiveStatus(order.status);
  const statusTone = isLive ? palette.primary : palette.textSecondary;
  const statusBg = isLive ? 'rgba(10,132,255,0.12)' : 'rgba(148,163,184,0.16)';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: palette.card, borderColor: palette.border }, pressed ? styles.pressed : null]}>
      <View style={styles.cardTop}>
        <View style={[styles.codePill, { backgroundColor: statusBg }]}>
          <Text style={[styles.code, { color: statusTone }]}>{order.trackingCode}</Text>
        </View>
        <Text style={[styles.amount, { color: palette.text }]}>{formatMoney(Number(order.price))}</Text>
      </View>

      <Text style={[styles.address, { color: palette.text }]} numberOfLines={2}>{order.pickupFormattedAddress}</Text>
      <View style={styles.routeArrow}>
        <CircleArrowRight size={18} color={palette.primary} />
      </View>
      <Text style={[styles.address, { color: palette.textSecondary }]} numberOfLines={2}>{order.deliveryFormattedAddress}</Text>

      <View style={styles.cardBottom}>
        <View style={styles.metaRow}>
          <Clock3 size={14} color={palette.textSecondary} />
          <Text style={[styles.metaText, { color: palette.textSecondary }]}>{new Date(order.createdAt).toLocaleDateString('en-NG')}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: isLive ? 'rgba(10,132,255,0.10)' : 'rgba(148,163,184,0.12)' }]}>
          <Text style={[styles.statusText, { color: statusTone }]}>{titleize(order.status)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
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
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={refresh} tintColor={palette.primary} />}
      showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrowTitle, { color: palette.primary }]}>Orders</Text>
        <Text style={[styles.titleText, { color: palette.text }]}>Track your deliveries with real-time status updates.</Text>
      </View>

      <View style={[styles.heroCard, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.10)' }]}> 
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Live Delivery Status</Text>
            <Text style={styles.heroValue}>Your active and past packages</Text>
          </View>
          <View style={styles.heroBadge}>
            <Package size={18} color={palette.card} />
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

      <View style={[styles.tabRow, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        {(['ACTIVE', 'PAST'] as const).map((item) => {
          const selected = item === tab;
          return (
            <Pressable key={item} onPress={() => setTab(item)} style={({ pressed }) => [styles.tab, selected ? { backgroundColor: palette.primary } : null, pressed ? styles.pressed : null]}>
              <Text style={[styles.tabText, { color: selected ? palette.card : palette.text }]}>{item === 'ACTIVE' ? 'Active' : 'Past'}</Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ActivityIndicator color={palette.primary} />
          <Text style={[styles.stateTitle, { color: palette.text }]}>Loading orders</Text>
          <Text style={[styles.stateBody, { color: palette.textSecondary }]}>We’re pulling your latest deliveries and statuses.</Text>
        </View>
      ) : query.isError ? (
        <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <BadgeCheck size={24} color={palette.error} />
          <Text style={[styles.stateTitle, { color: palette.text }]}>Couldn’t load orders</Text>
          <Text style={[styles.stateBody, { color: palette.textSecondary }]}>Check your connection and try again.</Text>
          <Pressable onPress={refresh} style={[styles.retryButton, { backgroundColor: palette.primary }]}> 
            <Text style={[styles.retryText, { color: palette.card }]}>Retry</Text>
          </Pressable>
        </View>
      ) : current.length ? (
        current.map((order) => <OrderCard key={order.id} order={order} palette={palette} onPress={() => router.push(`/orders/${order.id}`)} />)
      ) : (
        <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <BadgeCheck size={24} color={palette.textSecondary} />
          <Text style={[styles.stateTitle, { color: palette.text }]}>No orders here yet</Text>
          <Text style={[styles.stateBody, { color: palette.textSecondary }]}>Create a delivery to see it show up here.</Text>
          <Pressable onPress={() => router.push('/send')} style={[styles.retryButton, { backgroundColor: palette.primary }]}> 
            <Text style={[styles.retryText, { color: palette.card }]}>Create order</Text>
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
  eyebrowTitle: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  titleText: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Typography.family.bold },
  heroValue: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold, marginTop: 2 },
  heroBadge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryChip: { flex: 1, borderRadius: 20, padding: Spacing.md, backgroundColor: 'rgba(255,255,255,0.10)', gap: 2 },
  summaryLabel: { color: 'rgba(255,255,255,0.60)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  tabRow: { flexDirection: 'row', gap: 10, borderRadius: 22, borderWidth: 1, padding: 6 },
  tab: { flex: 1, minHeight: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  codePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  code: { fontSize: Typography.xs, fontFamily: Typography.family.bold, letterSpacing: 0.7 },
  amount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  address: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  routeArrow: { alignItems: 'center', paddingVertical: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: Typography.xs, fontFamily: Typography.family.bold},
  stateCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  stateBody: { fontSize: Typography.sm, lineHeight: 20, textAlign: 'center', maxWidth: 270, fontFamily: Typography.family.regular },
  retryButton: { minHeight: 48, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.92 },
});
