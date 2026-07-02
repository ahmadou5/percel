import { useEffect, useMemo, useState, useRef } from 'react';
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
import { Package, MapPin, Zap, ChevronRight, Bell, Radar, SearchX } from 'lucide-react-native';
import { router } from 'expo-router';

import { hexToRgba, useAppPalette } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import { useDriverStore } from '@/store/driver.store';
import { useWallet } from '@/hooks/useWallet';
import { useAcceptOrder, useDeclineOrder } from '@/hooks/useDriverOrders';
import { useToggleOnlineStatus } from '@/hooks/useDriverProfile';
import { useQueryClient } from '@tanstack/react-query';
import { emitDriverEvent, subscribeDriverSocket } from '@/lib/socket';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
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

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [palette.border, palette.primary] });
  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 27] });

  return (
    <Pressable onPress={onToggle} style={styles.toggleHit} accessibilityRole="switch" accessibilityState={{ checked: isOnline }}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

function PulseDot({ isOnline }: { isOnline: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const palette = useAppPalette();

  useEffect(() => {
    if (!isOnline) {
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isOnline]);

  const dotColor = isOnline ? '#30D158' : palette.border;

  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {isOnline && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: '#30D158',
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 0],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.2],
                }),
              },
            ],
          }}
        />
      )}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor,
        }}
      />
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

  const walletQuery = useWallet();
  const acceptOrder = useAcceptOrder();
  const declineOrderMutation = useDeclineOrder();
  const queryClient = useQueryClient();

  const wallet = walletQuery.data;
  const walletTransactions = wallet?.transactions ?? [];

  const todayDateStr = new Date().toDateString();
  const todaysTx = walletTransactions.filter(
    (tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT' && new Date(tx.createdAt).toDateString() === todayDateStr
  );

  const earningsToday = todaysTx.reduce((sum, tx) => sum + Number(tx.amount), 0);

  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [translateY] = useState(() => new Animated.Value(320));

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    };

    const unsub1 = subscribeDriverSocket('new_order_available', (payload: Partial<DriverOrder> & { orderId?: string }) => {
      invalidate();
      const id = payload.orderId ?? payload.id;
      if (!id || !payload.trackingCode || payload.price == null || !payload.pickupFormattedAddress || !payload.deliveryFormattedAddress || payload.distanceKm == null || payload.estimatedDurationMin == null) {
        return;
      }

      const order: DriverOrder = {
        id,
        trackingCode: payload.trackingCode,
        status: payload.status ?? 'MATCHED',
        paymentStatus: payload.paymentStatus ?? 'PAID',
        price: payload.price,
        currency: payload.currency ?? 'NGN',
        size: payload.size ?? 'SMALL',
        pickupFormattedAddress: payload.pickupFormattedAddress,
        deliveryFormattedAddress: payload.deliveryFormattedAddress,
        distanceKm: payload.distanceKm,
        estimatedDurationMin: payload.estimatedDurationMin,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        driver: payload.driver ?? null,
        customer: payload.customer ?? null,
      };
      setIncomingOrder(order);
      setSheetVisible(true);
      setCountdown(30);
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
        if (v <= 1) { void declineOrder('Offer timed out'); return 0; }
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

    const lat = driver?.currentLocation?.lat;
    const lng = driver?.currentLocation?.lng;

    if (next && (lat == null || lng == null || (lat === 0 && lng === 0))) {
      Alert.alert('Location required', 'Please allow location access before going online.');
      return;
    }

    await setOnlineStatus(next);

    try {
      await toggleOnlineStatus.mutateAsync({ isOnline: next, lat: lat ?? undefined, lng: lng ?? undefined });
    } catch (error: unknown) {
      const msg = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Failed to update online status.';
      Alert.alert('Status Update Failed', msg);
      return;
    }

    emitDriverEvent(next ? 'driver_online' : 'driver_offline', {
      driverId: driver?.id ?? '',
      lat: lat ?? undefined,
      lng: lng ?? undefined,
    });
  };

  const acceptIncoming = async (orderId?: string) => {
    const id = orderId ?? incomingOrder?.id;
    if (!id) return;
    try {
      await acceptOrder.mutateAsync(id);
      setIncomingOrder(null);
      setSheetVisible(false);
    } catch (error) {
      console.error('[acceptIncoming] failed:', error);
    }
  };

  const declineOrder = async (reason = 'Driver declined incoming offer') => {
    const orderId = incomingOrder?.id;
    setIncomingOrder(null);
    setSheetVisible(false);
    setCountdown(30);
    if (!orderId) return;

    try {
      await declineOrderMutation.mutateAsync({ orderId, reason });
    } catch (error) {
      console.error('[declineOrder] failed:', error);
    }
  };

  const isLoading = walletQuery.isLoading && !wallet;

  // Derived human-readable location label
  const locationLabel = useMemo(() => {
    if (!driver?.currentLocation) return 'Locating...';
    const lat = driver.currentLocation.lat;
    const lng = driver.currentLocation.lng;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    
    // Check if within Lagos region
    const isLagos = Math.abs(lat - 6.5244) < 0.2 && Math.abs(lng - 3.3792) < 0.2;
    const citySuffix = isLagos ? ' (Lagos)' : '';
    
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}${citySuffix}`;
  }, [driver?.currentLocation]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={walletQuery.isFetching} onRefresh={() => void walletQuery.refetch()} tintColor={palette.primary} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 100 }]}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.topRow}>
          {/* Location context — mirrors image's "Live Location" header signal */}
          <View style={styles.locationRow}>
            <PulseDot isOnline={isOnline} />
            <View style={{ gap: 2 }}>
              <Text style={[styles.locationEye, { color: palette.textSecondary, marginLeft: 16 }]}>Live Location</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} color={palette.primary} />
                <Text style={[styles.locationText, { color: palette.text }]} numberOfLines={1}>
                  {locationLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Avatar */}
            <Pressable onPress={() => router.push('/(tabs)/profile')} style={[styles.avatar, { backgroundColor: palette.primary }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initialsFrom(user?.fullName ?? 'Driver')}</Text>
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/notifications')} style={[styles.bellBtn, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <Bell size={18} color={palette.text} />
            </Pressable>
          </View>
        </View>

        {/* ── MERGED HERO CARD: online toggle + earnings + stats ── */}
        {/* Concept change: one unified card instead of hero + stat chips + wallet card */}
        <View style={[styles.heroCard, { backgroundColor: isOnline ? palette.primary : palette.card, borderColor: isOnline ? 'transparent' : palette.border }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />

          {/* Top row: status label + toggle */}
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroEye, { color: isOnline ? 'rgba(255,255,255,0.65)' : palette.textSecondary }]}>
                {isOnline ? 'Open to any delivery' : 'You are offline'}
              </Text>
              <Text style={[styles.heroStatusText, { color: isOnline ? '#fff' : palette.text }]}>
                {'Delivery Status'}
              </Text>
            </View>
            <OnlineToggle isOnline={isOnline} onToggle={toggleOnline} />
          </View>

          {/* DOMINANT earnings figure — the visual anchor of the whole card */}
          <View style={styles.earningsBlock}>
            <Text style={[styles.earningsLabel, { color: isOnline ? 'rgba(255,255,255,0.65)' : palette.textSecondary }]}>
              Today's Earnings
            </Text>
            <Text style={[styles.earningsValue, { color: isOnline ? '#fff' : palette.text }]}>
              {isLoading ? '---' : formatNaira(earningsToday)}
            </Text>
            <Text style={[styles.driverName, { color: isOnline ? 'rgba(255,255,255,0.8)' : palette.textSecondary }]}>
              {user?.fullName ?? 'Driver'}
            </Text>
          </View>

          {/* Sub-stats row at the bottom of the card 
          <View style={[styles.heroStatRow, { borderTopColor: isOnline ? 'rgba(255,255,255,0.15)' : palette.border }]}>
            {[
              { label: 'Deliveries', value: isLoading ? '--' : String(deliveriesToday) },
              { label: 'Rating', value: driver?.rating != null ? driver.rating.toFixed(1) : '---' },
              { label: 'Balance', value: isLoading ? '---' : formatNaira(wallet.balance) },
            ].map(({ label, value }, i, arr) => (
              <View
                key={label}
                style={[
                  styles.heroStat,
                  i < arr.length - 1 && {
                    borderRightWidth: 1,
                    borderRightColor: isOnline ? 'rgba(255,255,255,0.15)' : palette.border,
                  },
                ]}
              >
                <Text style={[styles.heroStatValue, { color: isOnline ? '#fff' : palette.text }]}>{value}</Text>
                <Text style={[styles.heroStatLabel, { color: isOnline ? 'rgba(255,255,255,0.6)' : palette.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>*/}

          {/* Vehicle pill */}
          <View style={[styles.heroPill, { backgroundColor: isOnline ? 'rgba(255,255,255,0.15)' : hexToRgba(palette.primary, 0.12) }]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#30D158' : '#FF453A' }]} />
            <Text style={[styles.heroPillText, { color: isOnline ? '#fff' : palette.primary }]}>
              {driver?.vehicleType ?? 'Vehicle'} • {driver?.vehiclePlate ?? '---'}
            </Text>
          </View>
        </View>

        {/* ── Current order / dispatch entry ──────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {currentOrder ? 'Current order' : 'Dispatch'}
          </Text>
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
            <View style={[styles.orderIconWrap, { backgroundColor: hexToRgba(palette.primaryDark, 0.12) }]}>
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
                <View style={[styles.tag, { backgroundColor: hexToRgba(palette.primaryDark, 0.14) }]}>
                  <Text style={[styles.tagText, { color: palette.primary }]}>{formatNaira(currentOrder.price)}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                  <Text style={[styles.tagText, { color: palette.primary }]}>{currentOrder.distanceKm.toFixed(1)} km</Text>
                </View>
              </View>
            </View>
            <ChevronRight size={18} color={palette.textSecondary} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/(tabs)/two')}
            style={[styles.emptyStateCard, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
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
              {isOnline ? 'Open dispatch board' : 'Go online for dispatch'}
            </Text>
            <Text style={[styles.emptyStateBody, { color: palette.textSecondary }]}>
              {isOnline
                ? 'Review, accept, or decline available jobs from the Dispatch tab.'
                : 'Turn on availability, then use Dispatch to manage incoming jobs.'}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Incoming order bottom sheet (socket push only) ───── */}
      <Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={() => void declineOrder()}>
        <View style={styles.backdrop}>
          <Animated.View style={[styles.sheet, { backgroundColor: palette.card, transform: [{ translateY }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            <View style={[styles.sheetBadge, { backgroundColor: hexToRgba('#FFD60A', 0.16) }]}>
              <Zap size={14} color="#FFD60A" />
              <Text style={styles.sheetBadgeText}>New order available</Text>
            </View>
            <Text style={[styles.sheetCode, { color: palette.text }]}>{incomingOrder?.trackingCode ?? 'New order'}</Text>
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
                onPress={() => void declineOrder()}
                disabled={declineOrderMutation.isPending}
                style={[styles.sheetBtn, { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 }]}
              >
                <Text style={[styles.sheetBtnText, { color: palette.text }]}>Decline</Text>
              </Pressable>
              <Pressable
                onPress={() => void acceptIncoming()}
                disabled={acceptOrder.isPending || declineOrderMutation.isPending}
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
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationEye: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, fontFamily: Typography.family.semibold },
  locationText: { fontSize: 13, fontFamily: Typography.family.bold },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 16, fontFamily: Typography.family.bold },
  bellBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // merged hero card
  heroCard: { borderRadius: 32, borderWidth: 1, padding: 24, gap: 16, overflow: 'hidden' },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  heroEye: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, fontFamily: Typography.family.semibold },
  heroStatusText: { fontSize: 15, fontFamily: Typography.family.bold, marginTop: 2 },

  // dominant earnings block
  earningsBlock: { zIndex: 1, gap: 2 },
  earningsLabel: { fontSize: 13, fontFamily: Typography.family.semibold, letterSpacing: 0 },
  earningsValue: { fontSize: 42, fontFamily: Typography.family.bold, letterSpacing: -1, lineHeight: 48 },
  driverName: { fontSize: 15, fontFamily: Typography.family.semibold, marginTop: 2 },

  // sub-stats row

  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, alignSelf: 'flex-start', zIndex: 1 },
  heroPillText: { fontSize: 13, fontFamily: Typography.family.semibold },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  // toggle
  toggleHit: { padding: 4 },
  track: { width: 52, height: 28, borderRadius: 14, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },

  // section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontFamily: Typography.family.bold },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  activeBadgeText: { fontSize: 12, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0 },

  // order card — solid (confirmed)
  orderCard: { borderRadius: 24, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 16, overflow: 'hidden' },

  orderIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  orderBody: { flex: 1, gap: 6 },
  orderCode: { fontSize: 14, fontFamily: Typography.family.bold },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderRoute: { fontSize: 13, flex: 1, fontFamily: Typography.family.regular },
  orderTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 12, fontFamily: Typography.family.bold },



  // empty state
  emptyStateCard: { borderRadius: 24, borderWidth: 1, padding: 32, alignItems: 'center', gap: 12, overflow: 'hidden' },
  emptyStateIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' },
  radarPing: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1, opacity: 0.2 },
  emptyStateTitle: { fontSize: 18, fontFamily: Typography.family.bold },
  emptyStateBody: { fontSize: 14, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 22, maxWidth: 260 },

  // bottom sheet (socket push — urgent interrupt)
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: 36, gap: 14 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  sheetBadgeText: { color: '#FFD60A', fontSize: 12, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0 },
  sheetCode: { fontSize: 26, fontFamily: Typography.family.bold },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  sheetRoute: { fontSize: 13, fontFamily: Typography.family.regular, lineHeight: 19, flex: 1 },
  sheetStats: { flexDirection: 'row', gap: 10 },
  sheetStat: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, gap: 4, alignItems: 'center' },
  sheetStatValue: { fontSize: 16, fontFamily: Typography.family.bold },
  sheetStatLabel: { fontSize: 11, fontFamily: Typography.family.medium },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetBtn: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetBtnPrimary: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  sheetBtnText: { fontSize: 16, fontFamily: Typography.family.bold },
});