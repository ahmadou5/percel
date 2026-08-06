import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone,
  Package,
  CheckCircle,
  Zap,
  MapPin,
  Clock,
  DollarSign,
  User,
  ClipboardList,
  Navigation,
  CornerUpLeft,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react-native';
import { DriverChatModal } from '@/components/orders/DriverChatModal';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { router, useLocalSearchParams } from 'expo-router';

import { useQueryClient } from '@tanstack/react-query';
import { useAppPalette, hexToRgba } from '@/lib/theme';
import { useDriverRateOrder, useUpdateOrderStatus, useDriverActiveOrders, useDriverOrderDetail } from '@/hooks/useDriverOrders';
import { subscribeDriverSocket } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { DeliveryRouteMap } from '@/components/orders/DeliveryRouteMap';
import { ActiveOrdersCarousel } from '@/components/orders/ActiveOrdersCarousel';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function SectionLabel({ children, palette }: { children: string; palette: ReturnType<typeof useAppPalette> }) {
  return (
    <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>{children}</Text>
  );
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

function ContactCard({
  title,
  name,
  phone,
  palette,
  onOpenChat,
}: {
  title: string;
  name: string;
  phone?: string | null;
  palette: ReturnType<typeof useAppPalette>;
  onOpenChat?: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <SectionLabel palette={palette}>{title}</SectionLabel>
      <View style={styles.contactRow}>
        <View style={[styles.avatarCircle, { backgroundColor: hexToRgba(palette.primary, 0.14) }]}>
          <User size={20} color={palette.primary} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: palette.text }]}>{name}</Text>
          {phone ? <Text style={[styles.contactPhone, { color: palette.textSecondary }]}>{phone}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {onOpenChat ? (
            <Pressable
              style={[styles.callBtn, { backgroundColor: hexToRgba(palette.primary, 0.14), borderColor: hexToRgba(palette.primary, 0.24) }]}
              onPress={onOpenChat}
            >
              <MessageSquare size={16} color={palette.primary} />
            </Pressable>
          ) : null}
          {phone ? (
            <Pressable
              style={[styles.callBtn, { backgroundColor: hexToRgba('#30D158', 0.14), borderColor: hexToRgba('#30D158', 0.24) }]}
              onPress={() => void Linking.openURL(`tel:${phone}`)}
            >
              <Phone size={16} color="#30D158" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const modal = useAppModal();
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();

  const { data: order, isLoading } = useDriverOrderDetail(id);
  const updateStatus = useUpdateOrderStatus();
  const rateCustomer = useDriverRateOrder();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<1 | 5>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [chatModalOpen, setChatModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // ⚠️ Must be above any conditional early returns — Rules of Hooks
  const currentLocation = useDriverStore((s) => s.currentLocation);
  const activeOrdersQuery = useDriverActiveOrders();
  const activeOrders = activeOrdersQuery.data ?? [];

  useEffect(() => {
    const invalidate = () => {
      if (id) {
        void queryClient.invalidateQueries({ queryKey: ['driver-order-detail', id] });
      }
      void queryClient.invalidateQueries({ queryKey: ['driver-orders-active'] });
    };

    const unsub1 = subscribeDriverSocket('order_status_update', invalidate);
    const unsub2 = subscribeDriverSocket('order_completed', invalidate);
    const unsub3 = subscribeDriverSocket('order_cancelled', invalidate);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [id, queryClient]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (isLoading || !order) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: palette.textSecondary }}>Loading order details...</Text>
      </View>
    );
  }

  const canAdvance =
    (order.status === 'ACCEPTED' || order.status === 'IN_TRANSIT') &&
    !updateStatus.isPending;

  const advanceLabel =
    order.status === 'ACCEPTED' ? "I've Picked Up the Package" : 'Mark as Delivered';

  const advance = async () => {
    if (!canAdvance) return;
    const nextStatus = order.status === 'ACCEPTED' ? 'IN_TRANSIT' : 'DELIVERED';
    try {
      const updated = await updateStatus.mutateAsync({
        orderId: order.id,
        status: nextStatus,
        lat: currentLocation?.lat,
        lng: currentLocation?.lng,
      });
      if (updated.status === 'DELIVERED') {
        setFeedbackOrderId(updated.id);
        setFeedbackVisible(true);
        setFeedbackRating(5);
        setFeedbackComment('');
      }
    } catch (err) {
      modal.alert('Could not update status', err instanceof Error ? err.message : 'Please try again.', 'error');
    }
  };

  const isFinished = order.status === 'DELIVERED' || order.status === 'COMPLETED';

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: 120 }]}
      >
        {/* ── Top Header with Back button ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <Pressable
            style={({ pressed }) => [
              { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.push('/(tabs)/history');
            }}
          >
            <ArrowLeft size={20} color={palette.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: Typography.md, fontFamily: Typography.family.medium, color: palette.text }}>
              Delivery Details
            </Text>
            <Text style={{ fontSize: 11, color: palette.textSecondary, fontFamily: Typography.family.medium }}>
              {order.trackingCode}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Active Orders Switcher Carousel ── 
        <ActiveOrdersCarousel
          orders={activeOrders}
          selectedOrderId={order.id}
          onSelectOrder={(selectedId) => router.replace({ pathname: '/(tabs)/orders/[id]', params: { id: selectedId } })}
        /> */}

        {/* ── Map Header ── */}
        <View style={styles.mapContainer}>
          <DeliveryRouteMap
            driverLocation={
              currentLocation
                ? { latitude: currentLocation.lat, longitude: currentLocation.lng }
                : { latitude: Number(order.pickupLat), longitude: Number(order.pickupLng) }
            }
            driverName={order.driver?.fullName ?? 'Driver'}
            driverAvatarUrl={null}
            originLocation={{ latitude: Number(order.pickupLat), longitude: Number(order.pickupLng) }}
            destinationLocation={{ latitude: Number(order.deliveryLat), longitude: Number(order.deliveryLng) }}
            routeCoordinates={[]}
          />

          {/* ── Turn-by-turn Overlay ── */}
          {(order.status === 'ACCEPTED' || order.status === 'IN_TRANSIT') && (
            <View style={[styles.tbtOverlay, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={[styles.tbtIconBox, { backgroundColor: palette.primary }]}>
                <CornerUpLeft size={24} color="#fff" />
              </View>
              <View style={styles.tbtCopy}>
                <Text style={[styles.tbtInstruction, { color: palette.text }]}>In 40m, turn left</Text>
                <Text style={[styles.tbtStreet, { color: palette.textSecondary }]}>onto {order.status === 'ACCEPTED' ? order.pickupFormattedAddress.split(',')[0] : order.deliveryFormattedAddress.split(',')[0]}</Text>
              </View>
            </View>
          )}

          {/* Quick stats floating on map */}
          <View style={[styles.mapStatsBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {[
              { icon: <MapPin size={14} color={palette.primary} />, value: `${order.distanceKm.toFixed(1)} km`, color: palette.primary },
              { icon: <Clock size={14} color="#FFD60A" />, value: `${order.estimatedDurationMin} min`, color: '#FFD60A' },
              { icon: <DollarSign size={14} color="#30D158" />, value: formatNaira(order.price), color: '#30D158' },
            ].map(({ icon, value, color }, i) => (
              <View key={value + i} style={[styles.mapStat, { backgroundColor: hexToRgba(color, 0.1) }]}>
                {icon}
                <Text style={[styles.mapStatText, { color }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA ── */}
        {canAdvance && (
          <Pressable
            onPress={() => void advance()}
            disabled={updateStatus.isPending}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: palette.primary, opacity: pressed || updateStatus.isPending ? 0.75 : 1 },
            ]}
          >
            <Navigation size={18} color="#fff" />
            <Text style={styles.ctaText}>
              {updateStatus.isPending ? 'Updating…' : advanceLabel}
            </Text>
          </Pressable>
        )}

        {isFinished && (
          <View style={[styles.completedBanner, { backgroundColor: hexToRgba('#30D158', 0.12), borderColor: hexToRgba('#30D158', 0.22) }]}>
            <CheckCircle size={18} color="#30D158" />
            <Text style={[styles.completedText, { color: '#30D158' }]}>
              {order.status === 'COMPLETED'
                ? 'Order completed — earnings credited to your wallet.'
                : 'Package delivered — awaiting customer confirmation.'}
            </Text>
          </View>
        )}

        {/* ── Route ── */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SectionLabel palette={palette}>ROUTE</SectionLabel>
          <View style={[styles.routeBlock, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={styles.routeRow}>
              <View style={styles.routeIconCol}>
                <View style={[styles.routeDot, { backgroundColor: '#30D158' }]} />
                <View style={[styles.routeConnector, { backgroundColor: palette.border }]} />
              </View>
              <View style={styles.routeTextCol}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Pickup</Text>
                <Text style={[styles.routeAddr, { color: palette.text }]}>{order.pickupFormattedAddress}</Text>
              </View>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routeIconCol}>
                <View style={[styles.routeDot, { backgroundColor: '#FF453A' }]} />
              </View>
              <View style={styles.routeTextCol}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Dropoff</Text>
                <Text style={[styles.routeAddr, { color: palette.text }]}>{order.deliveryFormattedAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Order details ── */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SectionLabel palette={palette}>ORDER DETAILS</SectionLabel>
          <InfoRow label="Tracking code" value={order.trackingCode} palette={palette} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow label="Package size" value={order.size} palette={palette} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow label="Payment status" value={order.paymentStatus} palette={palette} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          {order.notes ? (
            <>
              <InfoRow label="Notes" value={order.notes} palette={palette} />
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
            </>
          ) : null}
          <InfoRow
            label="Created"
            value={new Date(order.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
            palette={palette}
          />
        </View>

        {/* ── Package items & photos ── */}
        {(order.items ?? []).length ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <SectionLabel palette={palette}>PARCEL ITEMS & PHOTOS</SectionLabel>
            <View style={{ gap: 10, marginTop: 4 }}>
              {(order.items ?? []).map((item, idx) => (
                <View key={`driver-item-${idx}`} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text, fontFamily: Typography.family.regular }}>{item.description}</Text>
                    <Text style={{ fontSize: 14, color: palette.textSecondary }}>x{item.quantity}</Text>
                  </View>
                  {item.imageUrl ? (
                    <View style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, marginTop: 4 }}>
                      <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Customer contact ── */}
        {order.customer ? (
          <ContactCard
            title="SENDER"
            name={order.customer.fullName}
            phone={order.customer.phone}
            palette={palette}
            onOpenChat={() => setChatModalOpen(true)}
          />
        ) : null}

        {/* ── Recipient contact ── */}
        {(order.recipientName || order.recipientPhone) ? (
          <ContactCard
            title="RECIPIENT"
            name={order.recipientName ?? 'Recipient'}
            phone={order.recipientPhone}
            palette={palette}
          />
        ) : null}

        {/* ── Status timeline ── */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SectionLabel palette={palette}>DELIVERY TIMELINE</SectionLabel>
          <OrderStatusTimeline currentStatus={order.status} />
        </View>
      </ScrollView>

      {/* ── Floating rating modal ── */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFeedbackVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: palette.border }]} />
            <View style={[styles.modalIconWrap, { backgroundColor: hexToRgba('#30D158', 0.14) }]}>
              <CheckCircle size={28} color="#30D158" />
            </View>
            <Text style={[styles.modalEyebrow, { color: '#30D158' }]}>DELIVERY COMPLETE</Text>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Rate this customer</Text>
            <Text style={[styles.modalBody, { color: palette.textSecondary }]}>
              Quick feedback helps us keep the platform safe for everyone.
            </Text>

            <View style={styles.thumbRow}>
              {([
                { value: 5 as const, label: '👍 Good', danger: false },
                { value: 1 as const, label: '👎 Bad', danger: true },
              ] as const).map((btn) => {
                const active = feedbackRating === btn.value;
                const borderColor = active ? (btn.danger ? '#FF453A' : palette.primary) : palette.border;
                const bg = active ? hexToRgba(btn.danger ? '#FF453A' : palette.primary, 0.14) : 'transparent';
                const textColor = active ? (btn.danger ? '#FF453A' : palette.primary) : palette.text;
                return (
                  <Pressable
                    key={btn.value}
                    onPress={() => setFeedbackRating(btn.value)}
                    style={[styles.thumbBtn, { borderColor, backgroundColor: bg }]}
                  >
                    <Text style={[styles.thumbBtnText, { color: textColor }]}>{btn.label}</Text>
                  </Pressable>
                );
              })}
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
                onPress={() => { setFeedbackVisible(false); router.back(); }}
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
                    modal.show({
                      title: 'Feedback sent',
                      description: 'Thank you for rating this customer.',
                      type: 'success',
                      primaryText: 'OK',
                      onPrimaryPress: () => {
                        modal.hide();
                        router.back();
                      },
                    });
                  } catch {
                    setFeedbackVisible(false);
                    modal.show({
                      title: 'Feedback skipped',
                      description: 'Your delivery is complete.',
                      type: 'info',
                      primaryText: 'OK',
                      onPrimaryPress: () => {
                        modal.hide();
                        router.back();
                      },
                    });
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

      {order ? (
        <DriverChatModal
          visible={chatModalOpen}
          orderId={order.id}
          customerName={order.customer?.fullName ?? 'Customer'}
          customerAvatarUrl={(order.customer as any)?.avatarUrl ?? null}
          onClose={() => setChatModalOpen(false)}
        />
      ) : null}
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },

  // ── empty state ──
  emptyWrap: { flex: 1, paddingHorizontal: Spacing.lg },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xl,
  },
  emptyIconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: { alignItems: 'center', gap: Spacing.xs },
  emptyTitle: { fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  emptyBody: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 21, maxWidth: 270 },
  emptyHints: { width: '100%', gap: Spacing.sm },
  emptyHintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  emptyHintNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyHintNumText: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold' },
  emptyHintText: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium' },
  emptyBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: { color: '#fff', fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },

  // ── map area ──
  mapContainer: {
    height: 340,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  tbtOverlay: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tbtIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbtCopy: { flex: 1, justifyContent: 'center' },
  tbtInstruction: { fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold' },
  tbtStreet: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium' },
  mapStatsBar: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  mapStatText: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_700Bold' },

  // ── CTA ──
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaText: { color: '#fff', fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
  },
  completedText: { flex: 1, fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium', lineHeight: 18 },

  // ── shared card ──
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  divider: { height: 1 },

  // ── route ──
  routeBlock: { borderRadius: 12, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  routeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  routeIconCol: { alignItems: 'center', paddingTop: 4, width: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeConnector: { width: 1.5, flex: 1, minHeight: 20, marginTop: 3 },
  routeTextCol: { flex: 1, gap: 2 },
  routeLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddr: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 20 },

  // ── info row ──
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium' },
  infoValue: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold', maxWidth: '60%', textAlign: 'right' },

  // ── contact ──
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  contactPhone: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular' },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── rating modal ──
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xs },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  modalEyebrow: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, textAlign: 'center' },
  modalTitle: { fontSize: Typography.xl, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  modalBody: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20, textAlign: 'center' },
  thumbRow: { flexDirection: 'row', gap: 12 },
  thumbBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBtnText: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  commentInput: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 90,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sm,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
});
