import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, CircleArrowRight, MapPin, Package, ShieldCheck } from 'lucide-react-native';

import { DriverCard } from '@/components/order/DriverCard';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrderDetail } from '@/hooks/useOrder';
import { useSafeBack } from '@/components/navigation/useSafeBack';

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

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const back = useSafeBack("/orders");
  const query = useOrderDetail(id);
  const order = query.data;

  if (query.isLoading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator color="#8B5CF6" size="large" />
        <Text style={styles.loading}>Loading order…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}> 
        <Text style={styles.loading}>Order not found</Text>
        <Text style={styles.emptyBody}>We couldn’t load that delivery right now.</Text>
        <Pressable onPress={() => back()} style={styles.retryButton}> 
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isDone = order.status === 'DELIVERED' || order.status === 'COMPLETED';
  const statusConfig = getStatusConfig(order.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}> 
        <View style={styles.heroTop}>
          <Pressable onPress={() => back()} style={styles.backButton}>
            <ChevronLeft size={18} color="#FFFFFF" />
          </Pressable>
          <View style={styles.heroBadge}>
            <Package size={18} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.eyebrow}>Order detail</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{order.trackingCode}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
            <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
          </View>
        </View>
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

      <View style={styles.card}> 
        <Text style={styles.sectionTitle}>Route</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeIcon}>
            <MapPin size={16} color="#8B5CF6" />
          </View>
          <View style={styles.routeBody}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeText}>{order.pickupFormattedAddress}</Text>
          </View>
        </View>
        <View style={styles.routeDivider}>
          <CircleArrowRight size={18} color="#8B5CF6" />
        </View>
        <View style={styles.routeRow}>
          <View style={styles.routeIcon}>
            <ShieldCheck size={16} color="#10B981" />
          </View>
          <View style={styles.routeBody}>
            <Text style={styles.routeLabel}>Drop off</Text>
            <Text style={styles.routeText}>{order.deliveryFormattedAddress}</Text>
          </View>
        </View>
      </View>

      <DriverCard
        driver={order.driver}
        onCall={() => Alert.alert('Call driver', 'Driver calling is wired in the tracking prompt.')}
      />

      <View style={styles.card}> 
        <Text style={styles.sectionTitle}>Items</Text>
        {(order.items ?? []).length ? (
          (order.items ?? []).map((item, index) => (
            <View key={`${item.description}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemText}>{item.description}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyBodyMuted}>No item list was attached to this order.</Text>
        )}
      </View>

      <View style={styles.card}> 
        <Text style={styles.sectionTitle}>Status history</Text>
        <StatusTimeline items={order.statusHistory} />
      </View>

      {isDone ? (
        <Pressable onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)} style={({ pressed }) => [styles.rateButton, pressed && { opacity: 0.9 }]}> 
          <Text style={styles.rateButtonText}>{order.rating ? 'View rating' : 'Rate delivery'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: 10 },
  loading: { fontSize: Typography.lg, fontFamily: Typography.family.bold, color: '#FFFFFF', textAlign: 'center' },
  emptyBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, color: '#8888AA', textAlign: 'center', lineHeight: 20 },
  emptyBodyMuted: { fontSize: Typography.sm, fontFamily: Typography.family.regular, color: '#666688', lineHeight: 20 },
  retryButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  heroCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', alignItems: 'center', justifyContent: 'center' },
  heroBadge: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  eyebrow: { color: '#8888AA', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontFamily: Typography.family.bold, letterSpacing: -0.5, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  summaryChip: { flex: 1, borderRadius: 16, padding: Spacing.md, backgroundColor: 'rgba(255,255,255,0.04)', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  summaryLabel: { color: '#8888AA', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryValue: { color: '#FFFFFF', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  card: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', padding: Spacing.lg, gap: 12 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  routeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  routeIcon: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139, 92, 246, 0.12)' },
  routeBody: { flex: 1, gap: 3 },
  routeLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8888AA' },
  routeText: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular, color: '#FFFFFF' },
  routeDivider: { alignItems: 'center', paddingVertical: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  itemText: { fontSize: Typography.md, fontFamily: Typography.family.medium, color: '#FFFFFF', flex: 1 },
  itemQty: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#8888AA' },
  rateButton: { borderRadius: 16, minHeight: 54, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  rateButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
});
