import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Package, RefreshCw, Share2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { DeliveryRouteMap } from '@/components/order/DeliveryRouteMap';
import { OrderTrackingSheet } from '@/components/order/OrderTrackingSheet';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { useConfirmDelivery, useOrderDetail } from '@/hooks/useOrder';
import type { OrderStatus } from '@/lib/order';
import { subscribeToDriverLocation, subscribeToOrderUpdates } from '@/lib/socket';
import { useAppPalette } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

function isDelivered(status?: OrderStatus | string) {
  return status === 'DELIVERED' || status === 'COMPLETED';
}

function canTrack(status?: OrderStatus | string) {
  return ['IN_TRANSIT', 'ACCEPTED', 'MATCHED'].includes(String(status));
}

export default function TrackingScreen() {
  const router = useRouter();
  const back = useSafeBack('/');
  const insets = useSafeAreaInsets();
  const palette = useAppPalette();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderQuery = useOrderDetail(id);
  const order = orderQuery.data;
  const trackingQuery = useLiveTracking(id, order?.driver?.id ?? undefined);
  const confirmDelivery = useConfirmDelivery();
  const tracking = trackingQuery.data;
  const orderCode = order?.trackingCode ?? `#${id ?? ''}`;

  useEffect(() => {
    void haptics.tap();
  }, []);

  useEffect(() => {
    if (!order?.id) return;

    const unsubscribeStatus = subscribeToOrderUpdates(order.id, async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['tracking', id] });
    });

    const driverId = order.driver?.id;
    const unsubscribeLocation = driverId
      ? subscribeToDriverLocation(driverId, async () => {
          await queryClient.invalidateQueries({ queryKey: ['tracking', id] });
        })
      : undefined;

    return () => {
      unsubscribeStatus();
      unsubscribeLocation?.();
    };
  }, [id, order?.id, order?.driver?.id, queryClient]);

  useEffect(() => {
    if (order?.status === 'COMPLETED') {
      router.replace({ pathname: '/orders/[id]', params: { id: order.id } } as never);
    }
  }, [order?.id, order?.status, router]);

  if (orderQuery.isLoading || !order) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}> 
        <ActivityIndicator color={palette.primary} size="large" />
        <Text style={[styles.loadingTitle, { color: palette.text }]}>Loading order...</Text>
        <Text style={[styles.loadingBody, { color: palette.textSecondary }]}>Fetching live delivery details.</Text>
      </View>
    );
  }

  if (isDelivered(order.status) || !canTrack(order.status)) {
    const canConfirm = order.status === 'DELIVERED';
    const canRate = isDelivered(order.status);

    return (
      <ScrollView style={[styles.fallbackScreen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.fallbackContent}>
        <Pressable onPress={() => back()} style={[styles.fallbackBack, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <ChevronLeft size={20} color={palette.text} />
        </Pressable>
        <View style={[styles.fallbackCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Package size={34} color={palette.primary} />
          <Text style={[styles.fallbackTitle, { color: palette.text }]}>Live tracking unavailable</Text>
          <Text style={[styles.fallbackBody, { color: palette.textSecondary }]}>This order is not currently in active transit.</Text>
        </View>
        <View style={[styles.fallbackCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Status timeline</Text>
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
            style={[styles.primaryButton, { backgroundColor: palette.primary }]}
          >
            <Text style={styles.primaryText}>Confirm Delivery</Text>
          </Pressable>
        ) : null}
        {canRate ? (
          <Pressable onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)} style={[styles.secondaryButton, { borderColor: palette.primary }]}> 
            <Text style={[styles.secondaryText, { color: palette.primary }]}>{order.rating ? 'View Rating' : 'Rate Delivery'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  const showMap = Platform.OS !== 'web' && tracking;

  return (
    <GestureHandlerRootView style={[styles.screen, { backgroundColor: palette.bg }]}> 
      {showMap ? (
        <DeliveryRouteMap
          driverLocation={tracking.current_location}
          driverName={tracking.driver.name}
          driverAvatarUrl={tracking.driver.avatar_url}
          originLocation={tracking.origin_location}
          destinationLocation={tracking.destination_location}
          routeCoordinates={tracking.route_coordinates}
        />
      ) : (
        <View style={[styles.mapFallback, { backgroundColor: palette.bg }]}> 
          <Package size={36} color={palette.primary} />
          <Text style={[styles.loadingTitle, { color: palette.text }]}>Map unavailable</Text>
          <Text style={[styles.loadingBody, { color: palette.textSecondary }]}>Showing tracking details without the native map.</Text>
        </View>
      )}

      <LinearGradient colors={[Colors.dark.bg, 'transparent']} style={[styles.headerGradient, { paddingTop: insets.top + Spacing.sm }]}> 
        <View style={styles.headerRow}>
           <Pressable onPressIn={() => void haptics.tap()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={back}>
                    <ChevronLeft size={18} color={palette.text} />
                  </Pressable>
          <Text style={[styles.headerTitle, { color: Colors.dark.text }]} numberOfLines={1}>{orderCode}</Text>
          <Pressable
            onPress={() => void Share.share({ message: `Track my Percel order ${orderCode}` })}
            style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Share2 size={18} color={palette.text} />
          </Pressable>
        </View>
      </LinearGradient>

      {trackingQuery.isError ? (
        <View style={[styles.errorBanner, { backgroundColor: palette.card, borderColor: palette.error }]}> 
          <Text style={[styles.errorText, { color: palette.text }]}>Connection issue. Live location may be stale.</Text>
          <Pressable onPress={() => void trackingQuery.refetch()} style={styles.retryInline}>
            <RefreshCw size={14} color={palette.primary} />
            <Text style={[styles.retryInlineText, { color: palette.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {tracking ? <OrderTrackingSheet data={tracking} orderCode={orderCode} /> : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
   backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  loadingBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 20 },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  headerButton: { height: 42, borderRadius: 21, borderWidth: 1, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.md, fontFamily: Typography.family.bold },
  shareButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  errorBanner: { position: 'absolute', top: 116, left: Spacing.lg, right: Spacing.lg, borderWidth: 1, borderRadius: 16, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  errorText: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.medium },
  retryInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryInlineText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  mapFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  fallbackScreen: { flex: 1 },
  fallbackContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  fallbackBack: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  fallbackTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  fallbackBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20 },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 1.1, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  primaryButton: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: Colors.dark.text, fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondaryButton: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
