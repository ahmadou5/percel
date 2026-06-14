import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, MapPin, Zap, ChevronRight, Bell, Radar, SearchX, TrendingUp, DollarSign, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';
import { useWallet } from '@/hooks/useWallet';
import { useAcceptOrder, useAvailableOrders } from '@/hooks/useDriverOrders';
import { useToggleOnlineStatus } from '@/hooks/useDriverProfile';
import { useQueryClient } from '@tanstack/react-query';
import { emitDriverEvent, subscribeDriverSocket } from '@/lib/socket';
import { demoOrders, demoWallet } from '@/lib/demo-data';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'D';
}

function OnlineToggle({ isOnline, onToggle }: { isOnline: boolean; onToggle: () => void }) {
  const palette = useAppPalette();
  const anim = useMemo(() => new Animated.Value(isOnline ? 1 : 0), []);

  useEffect(() => {
    Animated.spring(anim, { toValue: isOnline ? 1 : 0, useNativeDriver: false, damping: 15, stiffness: 150 }).start();
  }, [isOnline]);

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['#334155', palette.primary] });
  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 27] });

  return (
    <Pressable onPress={onToggle} style={styles.toggleHit} accessibilityRole="switch" accessibilityState={{ checked: isOnline }}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const palette = useAppPalette();
  return (
    <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.statIcon, { backgroundColor: hexToRgba(color, 0.14) }]}>{icon}</View>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function DriverHomeScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();

  const driver = useDriverStore((s) => s.driver);
  const user = useDriverStore((s) => s.user);
  const isOnline = useDriverStore((s) => s.isOnline);
  const currentOrder = useDriverStore((s) => s.currentOrder);
  const setOnlineStatus = useDriverStore((s) => s.setOnlineStatus);
  const setCurrentOrder = useDriverStore((s) => s.setCurrentOrder);

  const walletQuery = useWallet();
  const acceptOrder = useAcceptOrder();
  const ordersQuery = useAvailableOrders();
  const queryClient = useQueryClient();

  const wallet = walletQuery.data ?? demoWallet;
  
  const todayDateStr = new Date().toDateString();
  const todaysTx = wallet.transactions.filter(
    (tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT' && new Date(tx.createdAt).toDateString() === todayDateStr
  );
  
  const earningsToday = todaysTx.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const deliveriesToday = todaysTx.length;

  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [translateY] = useState(() => new Animated.Value(320));

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    };

    const unsub1 = subscribeDriverSocket('new_order_available', (payload: Partial<DriverOrder> & { orderId?: string }) => {
      invalidate();
      // Use real order data from the socket payload; fall back to demo only if no order fields present
      const order: DriverOrder = {
        id: payload.orderId ?? payload.id ?? demoOrders[0].id,
        trackingCode: payload.trackingCode ?? 'TRK-NEW',
        status: payload.status ?? 'MATCHED',
        paymentStatus: payload.paymentStatus ?? 'PAID',
        price: payload.price ?? demoOrders[0].price,
        currency: payload.currency ?? 'NGN',
        size: payload.size ?? 'SMALL',
        pickupFormattedAddress: payload.pickupFormattedAddress ?? demoOrders[0].pickupFormattedAddress,
        deliveryFormattedAddress: payload.deliveryFormattedAddress ?? demoOrders[0].deliveryFormattedAddress,
        distanceKm: payload.distanceKm ?? demoOrders[0].distanceKm,
        estimatedDurationMin: payload.estimatedDurationMin ?? demoOrders[0].estimatedDurationMin,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        driver: payload.driver ?? null,
      };
      setIncomingOrder(order);
      setSheetVisible(true);
      setCountdown(60);
      translateY.setValue(320);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 140 }).start();
    });
    const unsub2 = subscribeDriverSocket('order_cancelled', () => {
      invalidate();
      setIncomingOrder(null);
      setSheetVisible(false);
    });
    const unsub3 = subscribeDriverSocket('order_status_update', () => {
      invalidate();
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [translateY, queryClient]);

  useEffect(() => {
    if (!sheetVisible) return;
    const t = setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) { void declineOrder(); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sheetVisible]);

  const toggleOnlineStatus = useToggleOnlineStatus();

  const toggleOnline = async () => {
    const next = !isOnline;

    if (next && driver?.status !== 'ACTIVE') {
      Alert.alert('Action Required', 'Your account is not active. Please ensure your KYC is approved before going online.');
      return;
    }

    const lat = driver?.currentLocation?.lat ?? 6.5244;
    const lng = driver?.currentLocation?.lng ?? 3.3792;

    // Optimistic local update for instant UI feedback
    await setOnlineStatus(next);

    try {
      // This is the critical step — sync the state to the DB so the order
      // matching worker can find this driver as a candidate
      await toggleOnlineStatus.mutateAsync({ isOnline: next, lat, lng });
    } catch (error: any) {
      // onError in the hook reverts the optimistic update
      const msg = error?.response?.data?.message || error?.message || 'Failed to update online status.';
      Alert.alert('Status Update Failed', msg);
    }

    emitDriverEvent(next ? 'driver_online' : 'driver_offline', {
      driverId: driver?.id ?? 'demo',
      lat,
      lng,
    });
  };

  const acceptIncoming = async () => {
    if (!incomingOrder) return;
    try {
      // mutateAsync returns { accepted, order } from the API
      await acceptOrder.mutateAsync(incomingOrder.id);
      // setCurrentOrder is called inside useAcceptOrder.onSuccess with the real order data
      setIncomingOrder(null);
      setSheetVisible(false);
    } catch (error) {
      // Keep the sheet visible so driver can retry
      console.error('[acceptIncoming] failed:', error);
    }
  };

  const declineOrder = async () => {
    if (incomingOrder) emitDriverEvent('order_status_update', { orderId: incomingOrder.id, status: 'CANCELLED' });
    setIncomingOrder(null);
    setSheetVisible(false);
    setCountdown(60);
  };

  const isLoading = walletQuery.isLoading && !wallet;

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={walletQuery.isFetching} onRefresh={() => void walletQuery.refetch()} tintColor={palette.primary} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 100 }]}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.topRow}>
          <Pressable style={styles.profileRow} onPress={() => router.push('/(tabs)/profile')}>
            <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initialsFrom(user?.fullName ?? 'Driver')}</Text>
              )}
            </View>
            <View>
              <Text style={[styles.greeting, { color: palette.textSecondary }]}>Good shift 👋</Text>
              <Text style={[styles.userName, { color: palette.text }]}>{user?.fullName ?? 'Driver'}</Text>
            </View>
          </Pressable>
          <View style={styles.headerRight}>
            <Pressable style={[styles.bellBtn, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <Bell size={18} color={palette.text} />
            </Pressable>
          </View>
        </View>

        {/* ── Online hero card ───────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: isOnline ? palette.primary : palette.card, borderColor: isOnline ? 'transparent' : palette.border }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />
          <View style={styles.heroInner}>
            <View style={styles.heroText}>
              <Text style={[styles.heroEye, { color: isOnline ? 'rgba(255,255,255,0.72)' : palette.textSecondary }]}>
                {isOnline ? 'You are live' : 'You are offline'}
              </Text>
              <Text style={[styles.heroTitle, { color: isOnline ? '#fff' : palette.text }]}>
                {isOnline ? 'Accepting orders' : 'Go online to start'}
              </Text>
            </View>
            <OnlineToggle isOnline={isOnline} onToggle={toggleOnline} />
          </View>
          <View style={styles.heroMeta}>
            <View style={[styles.heroPill, { backgroundColor: isOnline ? 'rgba(255,255,255,0.15)' : hexToRgba(palette.primary, 0.12) }]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#30D158' : '#FF453A' }]} />
              <Text style={[styles.heroPillText, { color: isOnline ? '#fff' : palette.primary }]}>
                {driver?.vehicleType ?? 'Vehicle'} • {driver?.vehiclePlate ?? '---'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stat chips ─────────────────────────────────────── */}
        <View style={styles.statRow}>
          <StatCard
            label="Today's earnings"
            value={isLoading ? '---' : formatNaira(earningsToday)}
            icon={<DollarSign size={18} color="#30D158" />}
            color="#30D158"
          />
          <StatCard
            label="Deliveries"
            value={isLoading ? '--' : String(deliveriesToday)}
            icon={<Package size={18} color={palette.primary} />}
            color={palette.primary}
          />
          <StatCard
            label="Rating"
            value={driver?.rating != null ? driver.rating.toFixed(1) : '---'}
            icon={<TrendingUp size={18} color="#FFD60A" />}
            color="#FFD60A"
          />
        </View>

        {/* ── Wallet snapshot ────────────────────────────────── */}
        <View style={[styles.walletCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.walletTop}>
            <Text style={[styles.walletLabel, { color: palette.textSecondary }]}>Wallet balance</Text>
            <Pressable onPress={() => router.push('/(tabs)/earnings')} style={styles.walletLink}>
              <Text style={[styles.walletLinkText, { color: palette.primary }]}>View all</Text>
              <ChevronRight size={14} color={palette.primary} />
            </Pressable>
          </View>
          {isLoading ? (
            <ActivityIndicator color={palette.primary} style={{ marginVertical: 8 }} />
          ) : (
            <Text style={[styles.walletAmount, { color: palette.text }]}>{formatNaira(wallet.balance)}</Text>
          )}
        </View>

        {/* ── Current order ──────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Current order</Text>
          {currentOrder && (
            <View style={[styles.activeBadge, { backgroundColor: hexToRgba(palette.primary, 0.14) }]}>
              <View style={[styles.statusDot, { backgroundColor: palette.primary }]} />
              <Text style={[styles.activeBadgeText, { color: palette.primary }]}>{currentOrder.status}</Text>
            </View>
          )}
        </View>

        {currentOrder ? (
          <Pressable
            onPress={() => router.push('/(tabs)/active')}
            style={[styles.orderCard, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <View style={[styles.orderIconWrap, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
              <Package size={22} color={palette.primary} />
            </View>
            <View style={styles.orderBody}>
              <Text style={[styles.orderCode, { color: palette.text }]}>{currentOrder.trackingCode}</Text>
              <View style={styles.orderMeta}>
                <MapPin size={12} color={palette.textSecondary} />
                <Text style={[styles.orderRoute, { color: palette.textSecondary }]} numberOfLines={1}>
                  {currentOrder.pickupFormattedAddress} → {currentOrder.deliveryFormattedAddress}
                </Text>
              </View>
              <View style={styles.orderTags}>
                <View style={[styles.tag, { backgroundColor: hexToRgba('#FFD60A', 0.14) }]}>
                  <Text style={[styles.tagText, { color: '#FFD60A' }]}>{formatNaira(currentOrder.price)}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                  <Text style={[styles.tagText, { color: palette.primary }]}>{currentOrder.distanceKm.toFixed(1)} km</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: hexToRgba('#30D158', 0.12) }]}>
                  <Text style={[styles.tagText, { color: '#30D158' }]}>{currentOrder.size}</Text>
                </View>
              </View>
            </View>
            <ChevronRight size={18} color={palette.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.availableSection}>
            {ordersQuery.data && ordersQuery.data.length > 0 ? (
              <View style={styles.list}>
                {ordersQuery.data.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setIncomingOrder(item);
                      setSheetVisible(true);
                      setCountdown(60);
                      translateY.setValue(320);
                      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 140 }).start();
                    }}
                    style={[styles.orderCard, { backgroundColor: palette.card, borderColor: palette.border }]}
                  >
                    <View style={[styles.orderIconWrap, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                      <Package size={22} color={palette.primary} />
                    </View>
                    <View style={styles.orderBody}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.orderCode, { color: palette.text }]}>{item.trackingCode}</Text>
                        <Text style={[styles.tagText, { color: palette.primary, fontWeight: '800' }]}>TAP TO VIEW</Text>
                      </View>
                      <View style={styles.orderMeta}>
                        <MapPin size={12} color={palette.textSecondary} />
                        <Text style={[styles.orderRoute, { color: palette.textSecondary }]} numberOfLines={1}>
                          {item.pickupFormattedAddress} → {item.deliveryFormattedAddress}
                        </Text>
                      </View>
                      <View style={styles.orderTags}>
                        <View style={[styles.tag, { backgroundColor: hexToRgba('#FFD60A', 0.14) }]}>
                          <Text style={[styles.tagText, { color: '#FFD60A' }]}>{formatNaira(item.price)}</Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                          <Text style={[styles.tagText, { color: palette.primary }]}>{item.distanceKm.toFixed(1)} km</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyStateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={styles.emptyStateIconWrap}>
                  {isOnline ? (
                    <Radar size={32} color={palette.primary} />
                  ) : (
                    <SearchX size={32} color={palette.textSecondary} />
                  )}
                  {isOnline && (
                    <Animated.View style={[styles.radarPing, { borderColor: palette.primary }]} />
                  )}
                </View>
                <Text style={[styles.emptyStateTitle, { color: palette.text }]}>
                  {isOnline ? 'Scanning for orders...' : 'You are offline'}
                </Text>
                <Text style={[styles.emptyStateBody, { color: palette.textSecondary }]}>
                  {isOnline ? 'Stay in high-demand areas to get matched with delivery requests faster.' : 'Go online to start receiving and accepting delivery requests.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Incoming order bottom sheet ──────────────────────── */}
      <Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={declineOrder}>
        <View style={styles.backdrop}>
          <Animated.View style={[styles.sheet, { backgroundColor: palette.card, transform: [{ translateY }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            <View style={[styles.sheetBadge, { backgroundColor: hexToRgba('#FFD60A', 0.16) }]}>
              <Zap size={14} color="#FFD60A" />
              <Text style={styles.sheetBadgeText}>New order available</Text>
            </View>
            <Text style={[styles.sheetCode, { color: palette.text }]}>{incomingOrder?.trackingCode ?? 'TRK-NEW'}</Text>
            <View style={styles.sheetMetaRow}>
              <MapPin size={13} color={palette.textSecondary} />
              <Text style={[styles.sheetRoute, { color: palette.textSecondary }]} numberOfLines={2}>
                {incomingOrder ? `${incomingOrder.pickupFormattedAddress} → ${incomingOrder.deliveryFormattedAddress}` : '—'}
              </Text>
            </View>

            <View style={styles.sheetStats}>
              {[
                { label: 'Payout', value: formatNaira(incomingOrder?.price ?? 0), color: '#30D158' },
                { label: 'Distance', value: `${(incomingOrder?.distanceKm ?? 0).toFixed(1)} km`, color: palette.primary },
                { label: 'Timer', value: `${countdown}s`, color: '#FFD60A' },
              ].map(({ label, value, color }) => (
                <View key={label} style={[styles.sheetStat, { backgroundColor: hexToRgba(color, 0.12), borderColor: hexToRgba(color, 0.18) }]}>
                  <Text style={[styles.sheetStatValue, { color }]}>{value}</Text>
                  <Text style={[styles.sheetStatLabel, { color: palette.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <Pressable
                onPress={declineOrder}
                style={[styles.sheetBtn, { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 }]}
              >
                <Text style={[styles.sheetBtnText, { color: palette.text }]}>Decline</Text>
              </Pressable>
              <Pressable
                onPress={acceptIncoming}
                disabled={acceptOrder.isPending}
                style={[styles.sheetBtn, styles.sheetBtnPrimary, { backgroundColor: palette.primary }]}
              >
                {acceptOrder.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.sheetBtnText, { color: '#fff' }]}>Accept</Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },

  // header
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  greeting: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  userName: { fontSize: 18, fontWeight: '800' },
  headerRight: { flexDirection: 'row', gap: 10 },
  bellBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // hero online card
  heroCard: { borderRadius: 32, borderWidth: 1, padding: 24, gap: 12, overflow: 'hidden' },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  heroText: { gap: 4 },
  heroEye: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroMeta: { zIndex: 1 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, alignSelf: 'flex-start' },
  heroPillText: { fontSize: 13, fontWeight: '600' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  // toggle
  toggleHit: { padding: 4 },
  track: { width: 52, height: 28, borderRadius: 14, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },

  // stats
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 24, borderWidth: 1, padding: 20, gap: 8, alignItems: 'flex-start' },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16, textTransform: 'uppercase', letterSpacing: 0.5 },

  // wallet
  walletCard: { borderRadius: 28, borderWidth: 1, padding: 24, gap: 8 },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' },
  walletLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  walletLinkText: { fontSize: 13, fontWeight: '700' },
  walletAmount: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },

  // section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  activeBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // order card
  orderCard: { borderRadius: 24, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  orderIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  orderBody: { flex: 1, gap: 6 },
  orderCode: { fontSize: 18, fontWeight: '800' },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderRoute: { fontSize: 13, flex: 1 },
  orderTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '700' },

  // empty state
  emptyStateCard: { borderRadius: 24, borderWidth: 1, padding: 32, alignItems: 'center', gap: 12, overflow: 'hidden' },
  emptyStateIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' },
  radarPing: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1, opacity: 0.2 },
  emptyStateTitle: { fontSize: 18, fontWeight: '800' },
  emptyStateBody: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 260 },

  // bottom sheet
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: 36, gap: 14 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  sheetBadgeText: { color: '#FFD60A', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  sheetCode: { fontSize: 26, fontWeight: '800' },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  sheetRoute: { fontSize: 13, lineHeight: 19, flex: 1 },
  sheetStats: { flexDirection: 'row', gap: 10 },
  sheetStat: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, gap: 4, alignItems: 'center' },
  sheetStatValue: { fontSize: 16, fontWeight: '800' },
  sheetStatLabel: { fontSize: 11, fontWeight: '500' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetBtn: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetBtnPrimary: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  sheetBtnText: { fontSize: 16, fontWeight: '800' },
  list: { gap: 12 },
  availableSection: { gap: 12 },
});
