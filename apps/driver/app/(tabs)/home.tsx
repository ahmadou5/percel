import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { ActionButton, Card, Pill, Screen, SectionHeader, StatChip } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useAcceptOrder } from '@/hooks/useDriverOrders';
import { useWallet } from '@/hooks/useWallet';
import { demoOrders, demoWallet } from '@/lib/demo-data';
import { emitDriverEvent, subscribeDriverSocket } from '@/lib/socket';
import type { DriverOrder } from '@/lib/types';
import { useDriverStore } from '@/store/driver.store';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(value);
}

function routeLabel(order: DriverOrder) {
  return `${order.pickupFormattedAddress} → ${order.deliveryFormattedAddress}`;
}

export default function DriverHomeScreen() {
  const driver = useDriverStore((state) => state.driver);
  const user = useDriverStore((state) => state.user);
  const isOnline = useDriverStore((state) => state.isOnline);
  const currentOrder = useDriverStore((state) => state.currentOrder);
  const setOnlineStatus = useDriverStore((state) => state.setOnlineStatus);
  const setCurrentOrder = useDriverStore((state) => state.setCurrentOrder);

  const walletQuery = useWallet();
  const acceptOrder = useAcceptOrder();

  const wallet = walletQuery.data ?? demoWallet;
  const earningsToday = wallet.transactions
    .filter((tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const deliveriesToday = wallet.transactions.filter((tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT').length;

  const [incomingOrder, setIncomingOrder] = useState<DriverOrder | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [translateY] = useState(() => new Animated.Value(320));

  const currentOrderToShow = useMemo(() => currentOrder ?? demoOrders[0], [currentOrder]);

  useEffect(() => {
    const unsubscribeOffer = subscribeDriverSocket('new_order_available', (payload: Partial<DriverOrder> & { orderId?: string }) => {
      const matched = demoOrders.find((order) => order.id === payload.orderId) ?? {
        ...demoOrders[0],
        id: payload.orderId ?? demoOrders[0].id,
      };
      setIncomingOrder(matched);
      setSheetVisible(true);
      setCountdown(60);
      translateY.setValue(320);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 140 }).start();
    });

    const unsubscribeCancel = subscribeDriverSocket('order_cancelled', () => {
      setIncomingOrder(null);
      setSheetVisible(false);
      setCountdown(60);
    });

    return () => {
      unsubscribeOffer();
      unsubscribeCancel();
    };
  }, [translateY]);

  useEffect(() => {
    if (!sheetVisible) return;
    const timer = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          void declineOrder();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sheetVisible]);

  const toggleOnline = async () => {
    const next = !isOnline;
    await setOnlineStatus(next);
    emitDriverEvent(next ? 'driver_online' : 'driver_offline', {
      driverId: driver?.id ?? 'driver-demo',
      lat: driver?.currentLocation.lat ?? 0,
      lng: driver?.currentLocation.lng ?? 0,
    });
  };

  const acceptIncoming = async () => {
    if (!incomingOrder) return;
    await acceptOrder.mutateAsync(incomingOrder.id);
    await setCurrentOrder(incomingOrder);
    setIncomingOrder(null);
    setSheetVisible(false);
  };

  const declineOrder = async () => {
    if (incomingOrder) {
      emitDriverEvent('order_status_update', { orderId: incomingOrder.id, status: 'CANCELLED' });
    }
    setIncomingOrder(null);
    setSheetVisible(false);
    setCountdown(60);
  };

  const simulateIncoming = () => {
    emitDriverEvent('new_order_available', demoOrders[0]);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={walletQuery.isFetching} onRefresh={() => void walletQuery.refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Pill label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'success' : 'neutral'} />
            <Pressable onPress={simulateIncoming}>
              <Text style={styles.heroLink}>Simulate order</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
          <Text style={styles.subtitle}>
            {user?.fullName ?? 'Driver'} can switch availability instantly and keep the dispatch feed active during the shift.
          </Text>

          <Pressable onPress={toggleOnline} style={[styles.toggle, isOnline ? styles.toggleOn : styles.toggleOff]}>
            <FontAwesome name={isOnline ? 'toggle-on' : 'toggle-off'} size={36} color="#FFFFFF" />
            <Text style={styles.toggleTitle}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
            <Text style={styles.toggleCopy}>{isOnline ? 'Stop dispatching new orders.' : 'Start receiving live orders.'}</Text>
          </Pressable>
        </View>

        <View style={styles.metricRow}>
          <StatChip label="Today earned" value={formatCurrency(earningsToday)} />
          <StatChip label="Deliveries" value={formatCompact(deliveriesToday)} />
        </View>

        <Card>
          <SectionHeader title="Current order" caption={currentOrder ? currentOrder.status : 'Waiting for acceptance'} />
          {currentOrderToShow ? (
            <>
              <Text style={styles.orderCode}>{currentOrderToShow.trackingCode}</Text>
              <Text style={styles.orderRoute}>{routeLabel(currentOrderToShow)}</Text>
              <View style={styles.orderMetaRow}>
                <Pill label={currentOrderToShow.size} tone="info" />
                <Pill label={`${currentOrderToShow.distanceKm.toFixed(1)} km`} tone="neutral" />
                <Pill label={formatCurrency(currentOrderToShow.price)} tone="warning" />
              </View>
              <ActionButton title="Open active order" onPress={() => router.push('/(tabs)/active')} />
            </>
          ) : (
            <Text style={styles.emptyCopy}>No accepted delivery is pinned right now. The next accepted order will appear here.</Text>
          )}
        </Card>

        <Card>
          <SectionHeader title="Wallet snapshot" caption="Live balance" />
          <View style={styles.walletRow}>
            <View>
              <Text style={styles.walletAmount}>{formatCurrency(wallet.balance)}</Text>
              <Text style={styles.walletMeta}>{wallet.transactions.length} recent transactions</Text>
            </View>
            <View style={styles.walletIcon}>
              <FontAwesome name="credit-card" size={18} color="#061423" />
            </View>
          </View>
        </Card>
      </ScrollView>

      <Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={declineOrder}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetEyebrow}>New order available</Text>
            <Text style={styles.sheetTitle}>{incomingOrder?.trackingCode ?? 'TRK-NEW'}</Text>
            <Text style={styles.sheetCopy}>{incomingOrder ? routeLabel(incomingOrder) : 'Pickup and delivery details will appear here.'}</Text>
            <View style={styles.sheetStats}>
              <StatChip label="Size" value={incomingOrder?.size ?? 'SMALL'} />
              <StatChip label="Distance" value={`${incomingOrder?.distanceKm.toFixed(1) ?? '0.0'} km`} />
            </View>
            <View style={styles.sheetStats}>
              <StatChip label="Payout" value={incomingOrder ? formatCurrency(incomingOrder.price) : formatCurrency(0)} />
              <StatChip label="Timer" value={`${countdown}s`} />
            </View>
            <View style={styles.sheetActions}>
              <ActionButton title="Decline" variant="secondary" onPress={declineOrder} />
              <ActionButton title="Accept" onPress={acceptIncoming} disabled={acceptOrder.isPending} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 30 },
  hero: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 16,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLink: { color: '#BFDBFE', fontSize: 13, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  toggle: {
    borderRadius: 28,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toggleOn: { backgroundColor: '#166534' },
  toggleOff: { backgroundColor: '#475569' },
  toggleTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  toggleCopy: { color: '#E2E8F0', fontSize: 13 },
  metricRow: { flexDirection: 'row', gap: 12 },
  orderCode: { color: '#FDE68A', fontSize: 18, fontWeight: '800' },
  orderRoute: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  orderMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyCopy: { color: '#CBD5E1', fontSize: 14, lineHeight: 21 },
  walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletAmount: { color: '#F8FAFC', fontSize: 28, fontWeight: '800' },
  walletMeta: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  walletIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDE68A' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 6, 23, 0.56)',
  },
  sheet: {
    padding: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#0F172A',
    gap: 12,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: '#334155',
  },
  sheetEyebrow: { color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11, fontWeight: '800' },
  sheetTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  sheetCopy: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  sheetStats: { flexDirection: 'row', gap: 10 },
  sheetActions: { flexDirection: 'row', gap: 10 },
});
