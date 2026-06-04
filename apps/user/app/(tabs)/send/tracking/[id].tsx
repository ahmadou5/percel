import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { DriverCard } from '@/components/order/DriverCard';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useConfirmDelivery, useOrderDetail } from '@/hooks/useOrder';
import { subscribeToDriverLocation, subscribeToOrderUpdates } from '@/lib/socket';
import { useSafeBack } from '@/components/navigation/useSafeBack';

export default function TrackingScreen() {
  const router = useRouter();
  const back = useSafeBack("/orders");
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderQuery = useOrderDetail(id);
  const confirmDelivery = useConfirmDelivery();
  const order = orderQuery.data;

  useEffect(() => {
    if (!order?.id) return;

    const unsubscribeStatus = subscribeToOrderUpdates(order.id, async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    const driverId = order.driver?.id;
    const unsubscribeLocation = driverId
      ? subscribeToDriverLocation(driverId, async () => {
          await queryClient.invalidateQueries({ queryKey: ['order', id] });
        })
      : undefined;

    return () => {
      unsubscribeStatus();
      unsubscribeLocation?.();
    };
  }, [id, order?.id, order?.driver?.id, queryClient]);

  useEffect(() => {
    if (order?.status === 'COMPLETED') {
      router.setParams({});
    }
  }, [order?.status, router]);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Loading order…</Text>
      </View>
    );
  }

  const canConfirm = order.status === 'DELIVERED';
  const canRate = order.status === 'DELIVERED' || order.status === 'COMPLETED';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => back()} style={{ alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.card, borderColor: Colors.light.border }}>
        <Text style={{ color: Colors.light.text, fontSize: 14, fontWeight: Typography.bold }}>Back</Text>
      </Pressable>

      <View style={styles.mapCard}>
        <Text style={styles.mapTitle}>Live tracking</Text>
        <Text style={styles.mapBody}>Map integration comes next; this screen already shows the live order summary and status timeline.</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusPill}>{order.status}</Text>
        <Text style={styles.code}>{order.trackingCode}</Text>
      </View>

      <DriverCard
        driver={order.driver}
        onCall={() => Alert.alert('Call driver', 'Driver calling is wired later in the tracking module.')}
      />

      <View style={styles.timelineCard}>
        <Text style={styles.sectionTitle}>Status timeline</Text>
        <StatusTimeline items={order.statusHistory} />
      </View>

      {canConfirm ? (
        <Pressable
          onPress={async () => {
            try {
              await confirmDelivery.mutateAsync(order.id);
              router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to confirm delivery';
              Alert.alert('Confirm delivery', message);
            }
          }}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>Confirm Delivery</Text>
        </Pressable>
      ) : null}

      {canRate ? (
        <Pressable onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)} style={styles.secondary}>
          <Text style={styles.secondaryText}>{order.rating ? 'View Rating' : 'Rate Delivery'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  mapCard: { backgroundColor: Colors.light.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, minHeight: 180, justifyContent: 'flex-end' },
  mapTitle: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  mapBody: { color: Colors.light.textSecondary, marginTop: 6 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { backgroundColor: Colors.light.primary, color: '#fff', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 999, fontWeight: Typography.bold },
  code: { color: Colors.light.textSecondary, fontWeight: Typography.semibold },
  timelineCard: { backgroundColor: Colors.light.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  primary: { backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
  secondary: { backgroundColor: 'transparent', borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.light.primary },
  secondaryText: { color: Colors.light.primary, fontSize: Typography.md, fontWeight: Typography.bold },
});
