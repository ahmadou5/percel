import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Zap, ChevronRight, Bell, Radar, SearchX } from 'lucide-react-native';
import { router } from 'expo-router';

import { hexToRgba, useAppPalette } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { useTourGuide } from '@wrack/react-native-tour-guide';
import { usePreferencesStore } from '@/store/preferences.store';
import { useDriverStore } from '@/store/driver.store';
import { useWallet } from '@/hooks/useWallet';
import { useAcceptOrder, useAvailableOrders, useDeclineOrder, useDriverActiveOrders } from '@/hooks/useDriverOrders';
import { ActiveOrdersCarousel } from '@/components/orders/ActiveOrdersCarousel';
import { useToggleOnlineStatus } from '@/hooks/useDriverProfile';
import { useQueryClient } from '@tanstack/react-query';
import { emitDriverEvent, subscribeDriverSocket } from '@/lib/socket';
import { api } from '@/lib/api';
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

type PendingOrderRowProps = {
  order: DriverOrder;
  accepting: boolean;
  declining: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

function PendingOrderRow({ order, accepting, declining, onAccept, onDecline }: PendingOrderRowProps) {
  const palette = useAppPalette();
  const busy = accepting || declining;

  return (
    <View style={[styles.pendingOrderRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.pendingOrderMain}>
        <View style={styles.pendingOrderTop}>
          <Text style={[styles.pendingOrderCode, { color: palette.text }]} numberOfLines={1}>{order.trackingCode}</Text>
          <Text style={[styles.pendingOrderPrice, { color: palette.primary }]}>{formatNaira(order.price)}</Text>
        </View>
        <View style={styles.pendingRouteRow}>
          <MapPin size={12} color={palette.textSecondary} />
          <Text style={[styles.pendingRouteText, { color: palette.textSecondary }]} numberOfLines={1}>
            {order.pickupFormattedAddress}{' -> '}{order.deliveryFormattedAddress}
          </Text>
        </View>
        <View style={styles.pendingMetaRow}>
          <Text style={[styles.pendingMetaText, { color: palette.textSecondary }]}>{order.distanceKm.toFixed(1)} km</Text>
          <Text style={[styles.pendingMetaDot, { color: palette.textSecondary }]}>•</Text>
          <Text style={[styles.pendingMetaText, { color: palette.textSecondary }]}>{order.estimatedDurationMin} min</Text>
          <Text style={[styles.pendingMetaDot, { color: palette.textSecondary }]}>•</Text>
          <Text style={[styles.pendingMetaText, { color: palette.textSecondary }]}>{order.size}</Text>
        </View>
      </View>
      <View style={styles.pendingActions}>
        <Pressable
          onPress={onDecline}
          disabled={busy}
          style={[styles.pendingActionBtn, { borderColor: palette.border, backgroundColor: palette.bg, opacity: busy ? 0.65 : 1 }]}
        >
          <Text style={[styles.pendingActionText, { color: palette.textSecondary }]}>Decline</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          disabled={busy}
          style={[styles.pendingActionBtn, { borderColor: palette.primary, backgroundColor: palette.primary, opacity: busy ? 0.65 : 1 }]}
        >
          {accepting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.pendingActionText, { color: "#fff" }]}>Accept</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export default function DriverHomeScreen() {
  const modal = useAppModal();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();

  const driver = useDriverStore((s) => s.driver);
  const user = useDriverStore((s) => s.user);
  const isOnline = useDriverStore((s) => s.isOnline);
  const currentOrder = useDriverStore((s) => s.currentOrder);
  const setOnlineStatus = useDriverStore((s) => s.setOnlineStatus);

  const walletQuery = useWallet();
  const availableOrdersQuery = useAvailableOrders();
  const activeOrdersQuery = useDriverActiveOrders();
  const acceptOrder = useAcceptOrder();
  const declineOrderMutation = useDeclineOrder();
  const queryClient = useQueryClient();

  const wallet = walletQuery.data;
  const availableOrders = availableOrdersQuery.data ?? [];
  const activeOrders = activeOrdersQuery.data ?? [];
  const walletTransactions = wallet?.transactions ?? [];

  const todayDateStr = new Date().toDateString();
  const todaysTx = walletTransactions.filter(
    (tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT' && new Date(tx.createdAt).toDateString() === todayDateStr
  );

  const earningsToday = todaysTx.reduce((sum, tx) => sum + Number(tx.amount), 0);

  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [translateY] = useState(() => new Animated.Value(320));

  const pendingHomeOrders = useMemo(() => {
    return availableOrders.filter((order) => order.id !== currentOrder?.id && order.id !== incomingOrder?.id).slice(0, 3);
  }, [availableOrders, currentOrder, incomingOrder]);

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['driver-orders-active'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    };

    const unsub1 = subscribeDriverSocket('new_order_available', (payload: any) => {
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
        pickupLat: payload.pickupLat ?? 6.5244,
        pickupLng: payload.pickupLng ?? 3.3792,
        deliveryLat: payload.deliveryLat ?? 6.5244,
        deliveryLng: payload.deliveryLng ?? 3.3792,
        pickupFormattedAddress: payload.pickupFormattedAddress,
        deliveryFormattedAddress: payload.deliveryFormattedAddress,
        recipientName: payload.deliveryContactName ?? 'Recipient',
        recipientPhone: payload.deliveryContactPhone ?? '',
        distanceKm: payload.distanceKm,
        estimatedDurationMin: payload.estimatedDurationMin,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };

      setIncomingOrder(order);
      setCountdown(60);
      setSheetVisible(true);
      translateY.setValue(320);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }).start();
    });

    const unsub2 = subscribeDriverSocket('order_cancelled', invalidate);
    const unsub3 = subscribeDriverSocket('order_completed', invalidate);
    const unsub4 = subscribeDriverSocket('order_status_update', invalidate);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [queryClient, translateY]);

  const declineOrder = async (reason = 'Driver declined incoming offer', targetOrderId?: string) => {
    const orderId = targetOrderId ?? incomingOrder?.id;
    if (!targetOrderId) {
      setIncomingOrder(null);
      setSheetVisible(false);
      setCountdown(60);
    }
    if (!orderId) return;

    try {
      await declineOrderMutation.mutateAsync({ orderId, reason });
    } catch (error) {
      console.error('[declineOrder] failed:', error);
    }
  };

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
      modal.alert('Action Required', 'Your account is not active. Please ensure your KYC is approved before going online.', 'warning');
      return;
    }

    let lat = driver?.currentLocation?.lat;
    let lng = driver?.currentLocation?.lng;

    if (next && (lat == null || lng == null || (lat === 0 && lng === 0))) {
      try {
        const Location = require('expo-location');
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy?.Balanced ?? 1,
          });
          if (typeof current?.coords?.latitude === 'number' && typeof current?.coords?.longitude === 'number') {
            const newLat = current.coords.latitude;
            const newLng = current.coords.longitude;
            lat = newLat;
            lng = newLng;
            await useDriverStore.getState().updateLocation({ lat: newLat, lng: newLng });
          }
        }
      } catch (err) {
        console.warn('[toggleOnline] Location fetch error:', err);
      }
    }

    if (next && (lat == null || lng == null || (lat === 0 && lng === 0))) {
      modal.show({
        title: 'Location Required',
        description: 'Please allow location access and ensure GPS is enabled on your device before going online.',
        type: 'warning',
        primaryText: 'Enable Location',
        onPrimaryPress: () => {
          modal.hide();
          void Linking.openSettings();
        },
        secondaryText: 'Cancel',
        onSecondaryPress: modal.hide,
      });
      return;
    }

    await setOnlineStatus(next);

    try {
      await toggleOnlineStatus.mutateAsync({ isOnline: next, lat: lat ?? undefined, lng: lng ?? undefined });
    } catch (error: unknown) {
      const msg = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Failed to update online status.';
      modal.alert('Status Update Failed', msg, 'error');
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

  const isLoading = walletQuery.isLoading && !wallet;

  const tourZone1Ref = useRef<View>(null);
  const tourZone2Ref = useRef<View>(null);

  const { startTour } = useTourGuide();
  const hasCompletedTour = usePreferencesStore((state) => state.hasCompletedTour);
  const setHasCompletedTour = usePreferencesStore((state) => state.setHasCompletedTour);

  useEffect(() => {
    if (!hasCompletedTour && !isLoading) {
      const timer = setTimeout(() => {
        startTour(
          [
            {
              id: 'online-status',
              targetRef: tourZone1Ref,
              title: 'Online Status & Earnings',
              description: 'Toggle Online to accept live order requests and monitor your daily revenue.',
              spotlightBorderRadius: 16,
            },
            {
              id: 'dispatch-requests',
              targetRef: tourZone2Ref,
              title: 'Dispatch & Delivery Requests',
              description: 'Review active orders and nearby pickup requests. Tap any order to accept or view details.',
              spotlightBorderRadius: 16,
            },
          ],
          {
            onTourEnd: () => {
              void setHasCompletedTour(true);
            },
          }
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, isLoading, startTour, setHasCompletedTour]);

  const [readableAddress, setReadableAddress] = useState<string | null>(null);

  useEffect(() => {
    const lat = driver?.currentLocation?.lat;
    const lng = driver?.currentLocation?.lng;

    if (lat == null || lng == null || (lat === 0 && lng === 0)) {
      setReadableAddress(null);
      return;
    }

    let isMounted = true;
    const resolveAddress = async () => {
      // 1. Try Google Maps API via backend helper
      try {
        const res = await api.post<{ data: { formattedAddress: string; city: string; state: string } }>('/api/v1/orders/reverse-geocode', { lat, lng });
        if (isMounted && res.data?.data?.formattedAddress) {
          setReadableAddress(res.data.data.formattedAddress);
          return;
        }
      } catch { }

      // 2. Try native Location.reverseGeocodeAsync fallback
      try {
        const Location = require('expo-location');
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (isMounted && results && results.length > 0) {
          const item = results[0];
          const street = item.street || item.name || item.district;
          const city = item.city || item.subregion || item.region || 'Lagos';
          const formatted = street && street.toLowerCase() !== city.toLowerCase() ? `${street}, ${city}` : city;
          setReadableAddress(formatted);
        }
      } catch { }
    };

    void resolveAddress();

    return () => {
      isMounted = false;
    };
  }, [driver?.currentLocation?.lat, driver?.currentLocation?.lng]);

  // Derived human-readable location label
  const locationLabel = useMemo(() => {
    if (readableAddress) return readableAddress;
    if (!driver?.currentLocation) return 'Locating...';
    const lat = driver.currentLocation.lat;
    const lng = driver.currentLocation.lng;
    if (lat === 0 && lng === 0) return 'Locating...';
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';

    // Check if within Lagos region
    const isLagos = Math.abs(lat - 6.5244) < 0.2 && Math.abs(lng - 3.3792) < 0.2;
    const citySuffix = isLagos ? ' (Lagos)' : '';

    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}${citySuffix}`;
  }, [readableAddress, driver?.currentLocation]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={walletQuery.isFetching || availableOrdersQuery.isFetching} onRefresh={() => { void walletQuery.refetch(); void availableOrdersQuery.refetch(); }} tintColor={palette.primary} />}
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
        <View ref={tourZone1Ref} style={[styles.heroCard, { backgroundColor: isOnline ? palette.primary : palette.card, borderColor: isOnline ? 'transparent' : palette.border }]}>
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

          {/* Vehicle pill */}
          <View style={[styles.heroPill, { backgroundColor: isOnline ? 'rgba(255,255,255,0.15)' : hexToRgba(palette.primary, 0.12) }]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#30D158' : '#FF453A' }]} />
            <Text style={[styles.heroPillText, { color: isOnline ? '#fff' : palette.primary }]}>
              {driver?.vehicleType ?? 'Vehicle'} • {driver?.vehiclePlate ?? '---'}
            </Text>
          </View>
        </View>

        {/* ── Active orders / dispatch entry ──────────────────────── */}
        <View ref={tourZone2Ref} style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {activeOrders.length > 0 ? `Active orders (${activeOrders.length})` : 'Dispatch'}
          </Text>
          {activeOrders.length > 0 && (
            <View style={[styles.activeBadge, { backgroundColor: hexToRgba(palette.primary, 0.14) }]}>
              <View style={[styles.statusDot, { backgroundColor: palette.primary }]} />
              <Text style={[styles.activeBadgeText, { color: palette.primary }]}>{activeOrders.length} ONGOING</Text>
            </View>
          )}
        </View>

        {activeOrders.length > 0 ? (
          <ActiveOrdersCarousel
            orders={activeOrders}
            selectedOrderId={currentOrder?.id ?? activeOrders[0].id}
            onSelectOrder={(selectedId) => router.push({ pathname: '/(tabs)/orders/[id]', params: { id: selectedId } })}
          />
        ) : (
          <Pressable
            onPress={() => router.push('/(tabs)/dispatch')}
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

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Available orders</Text>
          <Pressable onPress={() => router.push('/(tabs)/dispatch')} style={styles.sectionLink}>
            <Text style={[styles.sectionLinkText, { color: palette.primary }]}>View all</Text>
            <ChevronRight size={14} color={palette.primary} />
          </Pressable>
        </View>

        {availableOrdersQuery.isLoading ? (
          <View style={[styles.pendingListState, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={[styles.pendingStateText, { color: palette.textSecondary }]}>Checking open jobs...</Text>
          </View>
        ) : availableOrdersQuery.isError ? (
          <Pressable
            onPress={() => void availableOrdersQuery.refetch()}
            style={[styles.pendingListState, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Text style={[styles.pendingStateTitle, { color: palette.text }]}>Could not load open jobs</Text>
            <Text style={[styles.pendingStateText, { color: palette.textSecondary }]}>Tap to retry.</Text>
          </Pressable>
        ) : pendingHomeOrders.length > 0 ? (
          <View style={styles.pendingList}>
            {pendingHomeOrders.map((order) => (
              <PendingOrderRow
                key={order.id}
                order={order}
                accepting={acceptOrder.isPending}
                declining={declineOrderMutation.isPending}
                onAccept={() => void acceptIncoming(order.id)}
                onDecline={() => void declineOrder('Driver declined from home list', order.id)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.pendingListState, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.pendingStateTitle, { color: palette.text }]}>{isOnline ? 'No open jobs waiting' : 'Go online to see open jobs'}</Text>
            <Text style={[styles.pendingStateText, { color: palette.textSecondary }]}>{isOnline ? 'Matched offers will still pop up here when dispatch assigns one to you.' : 'Open jobs and matched offers appear when your driver status is online.'}</Text>
          </View>
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
      <AppModal config={modal.config} onClose={modal.hide} />
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
  sectionLink: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 10 },
  sectionLinkText: { fontSize: 13, fontFamily: Typography.family.bold },

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



  pendingList: { gap: 10 },
  pendingOrderRow: { borderRadius: 20, borderWidth: 1, padding: 12, gap: 12 },
  pendingOrderMain: { gap: 7 },
  pendingOrderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pendingOrderCode: { flex: 1, fontSize: 14, fontFamily: Typography.family.bold },
  pendingOrderPrice: { fontSize: 14, fontFamily: Typography.family.bold },
  pendingRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pendingRouteText: { flex: 1, fontSize: 12, fontFamily: Typography.family.regular },
  pendingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pendingMetaText: { fontSize: 11, fontFamily: Typography.family.medium, textTransform: 'uppercase' },
  pendingMetaDot: { fontSize: 11, fontFamily: Typography.family.bold },
  pendingActions: { flexDirection: 'row', gap: 10 },
  pendingActionBtn: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pendingActionText: { fontSize: 13, fontFamily: Typography.family.bold },
  pendingListState: { minHeight: 104, borderRadius: 22, borderWidth: 1, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pendingStateTitle: { fontSize: 15, fontFamily: Typography.family.bold, textAlign: 'center' },
  pendingStateText: { fontSize: 13, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 19 },

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