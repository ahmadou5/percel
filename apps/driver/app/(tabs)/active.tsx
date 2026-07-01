import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Phone, Package, Clock, DollarSign, CheckCircle, Zap } from 'lucide-react-native';
import { router } from 'expo-router';

import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useDriverRateOrder, useUpdateOrderStatus } from '@/hooks/useDriverOrders';
import { subscribeDriverSocket } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function InfoRow({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useAppPalette>;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function RouteTimeline({
  order,
  palette,
}: {
  order: DriverOrder;
  palette: ReturnType<typeof useAppPalette>;
}) {
  const steps = [
    { label: 'Pickup', addr: order.pickupFormattedAddress, done: order.status !== 'ACCEPTED', color: '#30D158' },
    { label: 'Dropoff', addr: order.deliveryFormattedAddress, done: order.status === 'DELIVERED' || order.status === 'COMPLETED', color: '#FF9F0A' },
  ];

  return (
    <View style={[styles.routeCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.cardSectionLabel, { color: palette.textSecondary }]}>ROUTE</Text>
      {steps.map((step, idx) => (
        <View key={step.label}>
          <View style={styles.routeStep}>
            <View style={[styles.routeStepDot, { backgroundColor: step.done ? step.color : palette.border }]}>
              {step.done && <CheckCircle size={10} color="#fff" />}
            </View>
            <View style={styles.routeStepBody}>
              <Text style={[styles.routeStepLabel, { color: palette.textSecondary }]}>{step.label}</Text>
              <Text style={[styles.routeStepAddr, { color: palette.text }]} numberOfLines={2}>
                {step.addr}
              </Text>
            </View>
          </View>
          {idx < steps.length - 1 && (
            <View style={[styles.routeConnector, { backgroundColor: palette.border }]} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function ActiveOrderScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const currentOrder = useDriverStore((s) => s.currentOrder);
  const setCurrentOrder = useDriverStore((s) => s.setCurrentOrder);
  const updateStatus = useUpdateOrderStatus();
  const rateCustomer = useDriverRateOrder();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<1 | 5>(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Reflect external order status changes (cancellation, completion)
  useEffect(() => {
    const unsub = subscribeDriverSocket('order_status_update', (payload: { orderId?: string; status?: string }) => {
      if (payload.orderId && payload.orderId === currentOrder?.id) {
        if (payload.status === 'CANCELLED') {
          void setCurrentOrder(null);
          Alert.alert('Order cancelled', 'This order was cancelled.');
        } else if (payload.status === 'COMPLETED') {
          void setCurrentOrder(null);
          Alert.alert('Order completed', 'The customer has confirmed delivery. Earnings credited to your wallet.');
        } else if (payload.status && currentOrder) {
          void setCurrentOrder({ ...currentOrder, status: payload.status as typeof currentOrder.status });
        }
      }
    });
    return unsub;
  }, [currentOrder, setCurrentOrder]);

  if (!currentOrder) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.bg }]}>
        <View style={[styles.emptyWrap, { paddingTop: insets.top + 32 }]}>
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Zap size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No active order</Text>
            <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>
              Accept an incoming order from the Home or Dispatch tab to see it here.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/home')}
              style={[styles.emptyBtn, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.emptyBtnText}>Go to Home</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const order: DriverOrder = currentOrder;

  const canAdvance =
    (order.status === 'ACCEPTED' || order.status === 'IN_TRANSIT') &&
    !updateStatus.isPending;

  const advanceLabel =
    order.status === 'ACCEPTED' ? "I've Picked Up the Package" : 'Mark as Delivered';

  const advance = async () => {
    if (!canAdvance) return;
    const nextStatus = order.status === 'ACCEPTED' ? 'IN_TRANSIT' : 'DELIVERED';
    try {
      const updated = await updateStatus.mutateAsync({ orderId: order.id, status: nextStatus });
      if (updated.status === 'DELIVERED') {
        setFeedbackOrderId(updated.id);
        setFeedbackVisible(true);
        setFeedbackRating(5);
        setFeedbackComment('');
      }
    } catch (err) {
      Alert.alert('Could not update status', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 100 }]}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />
          <Text style={[styles.heroEyebrow, { color: palette.primary }]}>ACTIVE ORDER</Text>
          <Text style={[styles.heroCode, { color: palette.text }]}>{order.trackingCode}</Text>
          <View style={[styles.heroBadge, { backgroundColor: hexToRgba(palette.primary, 0.14) }]}>
            <View style={[styles.heroBadgeDot, { backgroundColor: palette.primary }]} />
            <Text style={[styles.heroBadgeText, { color: palette.primary }]}>{order.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Route timeline */}
        <RouteTimeline order={order} palette={palette} />

        {/* Order details */}
        <View style={[styles.detailCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardSectionLabel, { color: palette.textSecondary }]}>ORDER DETAILS</Text>
          <View style={styles.chipRow}>
            {[
              { Icon: Package,    value: order.size,                        color: palette.primary },
              { Icon: MapPin,     value: `${order.distanceKm.toFixed(1)} km`, color: '#FFD60A' },
              { Icon: Clock,      value: `${order.estimatedDurationMin} min`, color: '#0A84FF' },
              { Icon: DollarSign, value: formatNaira(order.price),           color: '#30D158' },
            ].map(({ Icon, value, color }) => (
              <View key={value} style={[styles.chip, { backgroundColor: hexToRgba(color, 0.12) }]}>
                <Icon size={13} color={color} />
                <Text style={[styles.chipText, { color }]}>{value}</Text>
              </View>
            ))}
          </View>
          <InfoRow label="Tracking code" value={order.trackingCode} palette={palette} />
          <InfoRow label="Payment" value={order.paymentStatus} palette={palette} />
          <InfoRow label="Created" value={new Date(order.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} palette={palette} />
        </View>

        {/* Customer contact */}
        {order.customer && (
          <View style={[styles.detailCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardSectionLabel, { color: palette.textSecondary }]}>CUSTOMER CONTACT</Text>
            <Text style={[styles.customerName, { color: palette.text }]}>{order.customer.fullName}</Text>
            <Pressable
              style={[styles.callBtn, { backgroundColor: hexToRgba('#30D158', 0.14), borderColor: hexToRgba('#30D158', 0.24) }]}
              onPress={() => void Linking.openURL(`tel:${order.customer?.phone ?? ''}`)}
            >
              <Phone size={15} color="#30D158" />
              <Text style={styles.callBtnText}>Call customer</Text>
            </Pressable>
          </View>
        )}

        {/* CTA */}
        {canAdvance && (
          <Pressable
            onPress={() => void advance()}
            disabled={updateStatus.isPending}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: palette.primary, opacity: pressed || updateStatus.isPending ? 0.75 : 1 },
            ]}
          >
            <Text style={styles.ctaText}>
              {updateStatus.isPending ? 'Updating…' : advanceLabel}
            </Text>
          </Pressable>
        )}

        {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
          <View style={[styles.completedBanner, { backgroundColor: hexToRgba('#30D158', 0.12), borderColor: hexToRgba('#30D158', 0.22) }]}>
            <CheckCircle size={18} color="#30D158" />
            <Text style={[styles.completedText, { color: '#30D158' }]}>
              {order.status === 'COMPLETED' ? 'Order completed — earnings credited.' : 'Package delivered — awaiting customer confirmation.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Rating modal */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFeedbackVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
            <Text style={[styles.modalEyebrow, { color: palette.primary }]}>DELIVERY COMPLETE</Text>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Rate this customer</Text>
            <Text style={[styles.modalBody, { color: palette.textSecondary }]}>
              Quick feedback helps us keep the platform safe for everyone.
            </Text>

            <View style={styles.thumbRow}>
              {[
                { value: 5 as const, label: '👍 Good', active: feedbackRating === 5, danger: false },
                { value: 1 as const, label: '👎 Bad',  active: feedbackRating === 1, danger: true },
              ].map((btn) => (
                <Pressable
                  key={btn.value}
                  onPress={() => setFeedbackRating(btn.value)}
                  style={[
                    styles.thumbBtn,
                    { borderColor: btn.active ? (btn.danger ? '#FF453A' : palette.primary) : palette.border },
                    btn.active && { backgroundColor: btn.danger ? hexToRgba('#FF453A', 0.16) : hexToRgba(palette.primary, 0.16) },
                  ]}
                >
                  <Text style={[styles.thumbBtnText, { color: btn.active ? (btn.danger ? '#FF453A' : palette.primary) : palette.text }]}>
                    {btn.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder="Optional note…"
              placeholderTextColor={palette.textSecondary}
              style={[styles.commentInput, { backgroundColor: palette.bg, color: palette.text, borderColor: palette.border }]}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setFeedbackVisible(false);
                  void setCurrentOrder(null);
                }}
                style={[styles.modalBtn, { backgroundColor: palette.bg, borderColor: palette.border }]}
              >
                <Text style={[styles.modalBtnText, { color: palette.text }]}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!feedbackOrderId) return;
                  try {
                    await rateCustomer.mutateAsync({
                      orderId: feedbackOrderId,
                      driverRating: feedbackRating,
                      driverComment: feedbackComment.trim() || undefined,
                    });
                    setFeedbackVisible(false);
                    void setCurrentOrder(null);
                    Alert.alert('Feedback sent', 'Thank you for rating this customer.');
                  } catch (err) {
                    // Rating API requires customer to rate first — still clear the order
                    setFeedbackVisible(false);
                    void setCurrentOrder(null);
                    Alert.alert('Feedback skipped', 'Your delivery is complete. Rating will be available once the customer confirms.');
                  }
                }}
                disabled={rateCustomer.isPending}
                style={[styles.modalBtn, { backgroundColor: palette.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {rateCustomer.isPending ? 'Submitting…' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },

  // empty state
  emptyWrap: { flex: 1, paddingHorizontal: 20 },
  emptyCard: { borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyBtn: { minHeight: 48, paddingHorizontal: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // hero
  hero: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 8, overflow: 'hidden' },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0 },
  heroCode: { fontSize: 28, fontWeight: '800' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  heroBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0 },

  // route card
  routeCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 8 },
  routeStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeStepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  routeStepBody: { flex: 1, gap: 2 },
  routeStepLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  routeStepAddr: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  routeConnector: { width: 1, height: 18, marginLeft: 10, marginVertical: 4 },

  // detail card
  detailCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  cardSectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  chipText: { fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '700' },
  customerName: { fontSize: 18, fontWeight: '800' },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  callBtnText: { color: '#30D158', fontSize: 14, fontWeight: '700' },

  // CTA
  cta: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  completedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, padding: 14 },
  completedText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, padding: 20, paddingBottom: 36, gap: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0 },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  modalBody: { fontSize: 14, lineHeight: 20 },
  thumbRow: { flexDirection: 'row', gap: 12 },
  thumbBtn: { flex: 1, minHeight: 56, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  thumbBtnText: { fontSize: 15, fontWeight: '800' },
  commentInput: { borderRadius: 16, borderWidth: 1, minHeight: 90, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '800' },
});
