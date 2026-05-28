import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAcceptOrder, useAvailableOrders } from '@/hooks/useDriverOrders';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    currency: 'NGN',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function OrderCard({
  createdAt,
  deliveryFormattedAddress,
  distanceKm,
  estimatedDurationMin,
  pickupFormattedAddress,
  price,
  size,
  status,
  trackingCode,
  onAccept,
  pending,
}: {
  createdAt: string;
  deliveryFormattedAddress: string;
  distanceKm: number;
  estimatedDurationMin: number;
  pickupFormattedAddress: string;
  price: number;
  size: string;
  status: string;
  trackingCode: string;
  onAccept: () => void;
  pending: boolean;
}) {
  return (
    <View style={styles.card} lightColor="#FFFFFF" darkColor="#111827">
      <View style={styles.cardTopRow}>
        <View>
          <Text lightColor="#0EA5E9" darkColor="#38BDF8" style={styles.cardCode}>
            {trackingCode}
          </Text>
          <Text style={styles.cardTitle}>{status === 'PENDING_MATCH' ? 'Ready for pickup' : 'Driver queue item'}</Text>
        </View>
        <View style={styles.sizeBadge}>
          <Text lightColor="#075985" darkColor="#7DD3FC" style={styles.sizeText}>
            {size}
          </Text>
        </View>
      </View>

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <View style={styles.routeDotPickup} />
          <View style={styles.routeCopy}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeValue}>{pickupFormattedAddress}</Text>
          </View>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <View style={styles.routeDotDropoff} />
          <View style={styles.routeCopy}>
            <Text style={styles.routeLabel}>Dropoff</Text>
            <Text style={styles.routeValue}>{deliveryFormattedAddress}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <FontAwesome name="map-marker" size={14} color="#0EA5E9" />
          <Text style={styles.statText}>{distanceKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.statPill}>
          <FontAwesome name="clock-o" size={14} color="#0EA5E9" />
          <Text style={styles.statText}>{estimatedDurationMin} min</Text>
        </View>
        <View style={styles.statPill}>
          <FontAwesome name="calendar" size={14} color="#0EA5E9" />
          <Text style={styles.statText}>{new Date(createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.payoutLabel}>Payout</Text>
          <Text style={styles.payoutValue}>{formatCurrency(price)}</Text>
        </View>
        <Pressable style={styles.acceptButton} onPress={onAccept} disabled={pending}>
          <Text lightColor="#0F172A" darkColor="#0F172A" style={styles.acceptButtonText}>
            {pending ? 'Accepting...' : 'Accept job'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function JobsScreen() {
  const ordersQuery = useAvailableOrders();
  const acceptOrder = useAcceptOrder();
  const orders = ordersQuery.data ?? [];

  return (
    <View style={styles.screen} lightColor="#F3F4F6" darkColor="#030712">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={ordersQuery.isRefetching} onRefresh={() => void ordersQuery.refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.heroTitle}>
            Dispatch board
          </Text>
          <Text lightColor="#CBD5E1" darkColor="#CBD5E1" style={styles.heroCopy}>
            Live pickups within range. Accept the best jobs first and keep the queue moving.
          </Text>

          <View style={styles.heroSummary}>
            <View style={styles.summaryItem}>
              <Text lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.summaryValue}>
                {orders.length}
              </Text>
              <Text lightColor="#94A3B8" darkColor="#94A3B8" style={styles.summaryLabel}>
                Available jobs
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.summaryValue}>
                {orders[0] ? formatCurrency(orders[0].price) : '—'}
              </Text>
              <Text lightColor="#94A3B8" darkColor="#94A3B8" style={styles.summaryLabel}>
                Top payout
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available now</Text>
          <Text style={styles.sectionCaption}>Updated live</Text>
        </View>

        <View style={styles.list}>
          {orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                createdAt={order.createdAt}
                deliveryFormattedAddress={order.deliveryFormattedAddress}
                distanceKm={order.distanceKm}
                estimatedDurationMin={order.estimatedDurationMin}
                pickupFormattedAddress={order.pickupFormattedAddress}
                price={order.price}
                size={order.size}
                status={order.status}
                trackingCode={order.trackingCode}
                pending={acceptOrder.isPending}
                onAccept={() => acceptOrder.mutate(order.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState} lightColor="#FFFFFF" darkColor="#111827">
              <FontAwesome name="truck" size={24} color="#0EA5E9" />
              <Text style={styles.emptyTitle}>No live jobs yet</Text>
              <Text style={styles.emptyCopy}>
                When dispatch offers a pickup within range, it will appear here automatically.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  hero: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#0F172A',
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  heroSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryItem: { flex: 1 },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 38,
    marginHorizontal: 12,
    backgroundColor: 'rgba(148,163,184,0.4)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCaption: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 28,
    padding: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  cardCode: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  sizeBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E0F2FE',
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  routeBlock: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDotPickup: {
    width: 12,
    height: 12,
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: '#0EA5E9',
  },
  routeDotDropoff: {
    width: 12,
    height: 12,
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: '#F97316',
  },
  routeCopy: { flex: 1 },
  routeLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  routeValue: {
    color: '#0F172A',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  routeDivider: {
    width: 1,
    height: 24,
    marginLeft: 5,
    marginVertical: 10,
    backgroundColor: '#CBD5E1',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  statText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  payoutLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  payoutValue: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  acceptButton: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FDE68A',
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 28,
    gap: 8,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
