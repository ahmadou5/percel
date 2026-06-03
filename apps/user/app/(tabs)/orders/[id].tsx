import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, CircleArrowRight, MapPin, Package, ShieldCheck } from 'lucide-react-native';

import { DriverCard } from '@/components/order/DriverCard';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrderDetail } from '@/hooks/useOrder';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeBack } from '@/components/navigation/useSafeBack';

function titleize(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const back = useSafeBack("/orders");
  const query = useOrderDetail(id);
  const order = query.data;

  if (query.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}> 
        <ActivityIndicator color={palette.primary} />
        <Text style={[styles.loading, { color: palette.text }]}>Loading order…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}> 
        <Text style={[styles.loading, { color: palette.text }]}>Order not found</Text>
        <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>We couldn’t load that delivery right now.</Text>
        <Pressable onPress={() => back()} style={[styles.retryButton, { backgroundColor: palette.primary }]}> 
          <Text style={[styles.retryText, { color: palette.card }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isDone = order.status === 'DELIVERED' || order.status === 'COMPLETED';

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.heroCard, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.10)' }]}> 
        <View style={styles.heroTop}>
          <Pressable onPress={() => back()} style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
            <ChevronRight size={18} color={palette.card} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <View style={styles.heroBadge}>
            <Package size={18} color={palette.card} />
          </View>
        </View>
        <Text style={styles.eyebrow}>Order detail</Text>
        <Text style={styles.title}>{order.trackingCode}</Text>
        <Text style={styles.subtitle}>{titleize(order.status)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Price</Text>
            <Text style={styles.summaryValue}>₦{Number(order.price).toLocaleString('en-NG')}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Created</Text>
            <Text style={styles.summaryValue}>{new Date(order.createdAt).toLocaleDateString('en-NG')}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Route</Text>
        <View style={styles.routeRow}>
          <View style={[styles.routeIcon, { backgroundColor: palette.text }]}>
            <MapPin size={16} color={palette.card} />
          </View>
          <View style={styles.routeBody}>
            <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Pickup</Text>
            <Text style={[styles.routeText, { color: palette.text }]}>{order.pickupFormattedAddress}</Text>
          </View>
        </View>
        <View style={styles.routeDivider}>
          <CircleArrowRight size={18} color={palette.primary} />
        </View>
        <View style={styles.routeRow}>
          <View style={[styles.routeIcon, { backgroundColor: palette.primary }]}>
            <ShieldCheck size={16} color={palette.card} />
          </View>
          <View style={styles.routeBody}>
            <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Drop off</Text>
            <Text style={[styles.routeText, { color: palette.text }]}>{order.deliveryFormattedAddress}</Text>
          </View>
        </View>
      </View>

      <DriverCard
        driver={order.driver}
        onCall={() => Alert.alert('Call driver', 'Driver calling is wired in the tracking prompt.')}
      />

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Items</Text>
        {(order.items ?? []).length ? (
          (order.items ?? []).map((item, index) => (
            <View key={`${item.description}-${index}`} style={styles.itemRow}>
              <Text style={[styles.itemText, { color: palette.text }]}>{item.description}</Text>
              <Text style={[styles.itemQty, { color: palette.textSecondary }]}>x{item.quantity}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>No item list was attached to this order.</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Status history</Text>
        <StatusTimeline items={order.statusHistory} />
      </View>

      {isDone ? (
        <Pressable onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)} style={[styles.rateButton, { backgroundColor: palette.primary }]}> 
          <Text style={[styles.rateButtonText, { color: palette.card }]}>{order.rating ? 'View rating' : 'Rate delivery'}</Text>
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
  retryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  eyebrow: { color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { color: '#fff', fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.8 },
  subtitle: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, fontFamily: Typography.family.medium },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryChip: { flex: 1, borderRadius: 20, padding: Spacing.md, backgroundColor: 'rgba(255,255,255,0.10)', gap: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.60)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryValue: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  routeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  routeIcon: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  routeBody: { flex: 1, gap: 3 },
  routeLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  routeText: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  routeDivider: { alignItems: 'center', paddingVertical: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  itemText: { fontSize: Typography.md, fontFamily: Typography.family.medium, flex: 1 },
  itemQty: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  rateButton: { borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  rateButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
