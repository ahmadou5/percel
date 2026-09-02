import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CircleArrowRight, MapPin, Package, ShieldCheck, Info, XCircle, CheckCircle2, AlertTriangle, Receipt, Share2, FileDown } from 'lucide-react-native';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { DriverCard } from '@/components/order/DriverCard';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useCancelOrder, useConfirmDelivery, useOrderDetail } from '@/hooks/useOrder';
import { getThemeIconSource, useAppPalette } from '@/lib/theme';
import { formatNaira } from '@/lib/wallet';
import { useAuthStore } from '@/store/auth.store';

function DashedDivider() {
  return (
    <View style={styles.dashedContainer}>
      {Array.from({ length: 30 }).map((_, i) => (
        <View key={i} style={styles.dash} />
      ))}
    </View>
  );
}

function ReceiptRow({ label, value, palette }: { label: string; value: string; palette: ReturnType<typeof useAppPalette> }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.receiptValue, { color: palette.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function getStatusConfig(status: string) {
  const s = status.toUpperCase();
  if (['CREATED', 'PENDING_MATCH'].includes(s)) {
    return { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', label: 'Pending' };
  }
  if (s === 'MATCHED') {
    return { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', label: 'Driver matched' };
  }
  if (s === 'ACCEPTED') {
    return { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', label: 'Driver accepted' };
  }
  if (s === 'IN_TRANSIT') {
    return { text: '#0A84FF', bg: 'rgba(10, 132, 255, 0.12)', label: 'In Transit' };
  }
  if (['DELIVERED', 'COMPLETED'].includes(s)) {
    return { text: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Delivered' };
  }
  return { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', label: s === 'CANCELLED' ? 'Cancelled' : 'Failed' };
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const back = useSafeBack('/orders');
  const palette = useAppPalette();
  const query = useOrderDetail(id);
  const cancelMutation = useCancelOrder();
  const confirmDeliveryMutation = useConfirmDelivery();
  const order = query.data;
  const user = useAuthStore((state) => state.user);
  const [confirmDeliveryVisible, setConfirmDeliveryVisible] = useState(false);
  const [orderReceiptOpen, setOrderReceiptOpen] = useState(false);
  const [proofPreviewVisible, setProofPreviewVisible] = useState(false);
  const orderReceiptRef = useRef<View>(null);
  const [receiptResult, setReceiptResult] = useState<null | { visible: boolean; type: 'success' | 'failed' | 'pending'; title: string; message: string; amount?: string; reference?: string }>(null);

  const handleShareOrderImage = async () => {
    if (!order) return;
    if (!orderReceiptRef.current) {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt unavailable', message: 'Re-open the order receipt and try again.', amount: formatNaira(Number(order.price)), reference: order.trackingCode });
      return;
    }
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setReceiptResult({ visible: true, type: 'failed', title: 'Sharing unavailable', message: 'Your device cannot share receipt images right now.', amount: formatNaira(Number(order.price)), reference: order.trackingCode });
        return;
      }
      const uri = await captureRef(orderReceiptRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share delivery receipt image' });
      setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The order receipt image is ready to share.', amount: formatNaira(Number(order.price)), reference: order.trackingCode });
    } catch {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt export failed', message: 'Unable to create the receipt image on this device.', amount: formatNaira(Number(order.price)), reference: order.trackingCode });
    }
  };

  const handleShareOrderPdf = async () => {
    if (!order) return;
    try {
      const itemsListHtml = (order.items ?? []).length
        ? (order.items ?? []).map((i) => `<tr><td class="td-label">${i.description}</td><td class="td-value">x${i.quantity}</td></tr>`).join('')
        : '<tr><td class="td-label">Package</td><td class="td-value">Standard Parcel</td></tr>';

      const html = `
        <html><head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0F172A; background: #FAFAFA; }
            .container { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; padding: 32px; border: 1px solid #E2E8F0; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px dashed #E2E8F0; }
            .brand { font-weight: 800; font-size: 22px; color: ${palette.primary}; }
            .amount { font-size: 32px; font-weight: 800; color: #0F172A; margin-bottom: 4px; }
            .date { font-size: 12px; color: #64748B; margin-bottom: 24px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .td-label { padding: 12px 0; color: #64748B; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
            .td-value { padding: 12px 0; text-align: right; font-weight: 700; font-size: 13px; color: #0F172A; border-bottom: 1px solid #F1F5F9; }
            .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 32px; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">Percel</div>
              <div style="font-size: 12px; color: #64748B; font-weight: 700;">DELIVERY RECEIPT</div>
            </div>
            <div style="text-align: center;">
              <div class="amount">${formatNaira(Number(order.price))}</div>
              <div class="date">${new Date(order.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <table class="table">
              <tr><td class="td-label">Tracking Code</td><td class="td-value" style="font-family: monospace;">${order.trackingCode}</td></tr>
              <tr><td class="td-label">Status</td><td class="td-value">${order.status}</td></tr>
              <tr><td class="td-label">Sender</td><td class="td-value">${user?.fullName || 'Sender'}</td></tr>
              <tr><td class="td-label">Pickup Address</td><td class="td-value">${order.pickupFormattedAddress}</td></tr>
              <tr><td class="td-label">Recipient</td><td class="td-value">${order.recipientName || 'Recipient'}</td></tr>
              <tr><td class="td-label">Delivery Address</td><td class="td-value">${order.deliveryFormattedAddress}</td></tr>
              ${itemsListHtml}
            </table>
            <div class="footer">Official Receipt &bull; Percel Logistics</div>
          </div>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
        setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The PDF delivery receipt is ready to share.', amount: formatNaira(Number(order.price)), reference: order.trackingCode });
      } else {
        setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The PDF delivery receipt was saved to your device.', amount: formatNaira(Number(order.price)), reference: order.trackingCode });
      }
    } catch {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt export failed', message: 'Unable to create the delivery receipt PDF on this device.', amount: formatNaira(Number(order.price)), reference: order.trackingCode });
    }
  };

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    description: string;
    type: 'info' | 'error' | 'success' | 'warning';
    primaryText: string;
    onPrimaryPress: () => void;
    secondaryText?: string;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    title: '',
    description: '',
    type: 'info',
    primaryText: 'OK',
    onPrimaryPress: () => {},
  });

  const handleCancel = () => {
    if (!order) return;
    setModalConfig({
      visible: true,
      title: 'Cancel Order',
      description: 'Are you sure you want to cancel this order? This will refund the payment back to your wallet.',
      type: 'warning',
      primaryText: 'Yes, Cancel',
      secondaryText: 'No',
      onPrimaryPress: () => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        cancelMutation.mutate(
          { id: order.id, reason: 'User requested cancellation' },
          {
            onSuccess: () => {
              setModalConfig({
                visible: true,
                title: 'Success',
                description: 'Your order has been cancelled and refunded.',
                type: 'success',
                primaryText: 'OK',
                onPrimaryPress: () => setModalConfig((prev) => ({ ...prev, visible: false })),
              });
            },
            onError: (error) => {
              const message = error instanceof Error ? error.message : 'Unable to cancel order';
              setModalConfig({
                visible: true,
                title: 'Error',
                description: message,
                type: 'error',
                primaryText: 'OK',
                onPrimaryPress: () => setModalConfig((prev) => ({ ...prev, visible: false })),
              });
            },
          }
        );
      },
      onSecondaryPress: () => setModalConfig((prev) => ({ ...prev, visible: false })),
    });
  };

  const isCancellable = order && ['CREATED', 'PENDING_MATCH', 'MATCHED'].includes(order.status);

  if (query.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.primary} size="large" />
        <Text style={[styles.loading, { color: palette.text }]}>Loading order…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.text }]}>Order not found</Text>
        <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>
          We couldn't load that delivery right now.
        </Text>
        <Pressable
          onPress={() => back()}
          style={[styles.retryButton, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isDone = order.status === 'DELIVERED' || order.status === 'COMPLETED';
  const isActiveDelivery = order.status === 'IN_TRANSIT' || order.status === 'ACCEPTED';
  const statusConfig = getStatusConfig(order.status);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* Hero card */}
      <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.heroTop}>
          <Pressable
            onPress={() => back()}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ChevronLeft size={18} color={palette.text} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => setOrderReceiptOpen(true)}
              style={({ pressed }) => [
                styles.receiptBtn,
                { backgroundColor: `${palette.primary}1A`, borderColor: `${palette.primary}33` },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Receipt size={16} color={palette.primary} />
              <Text style={[styles.receiptBtnText, { color: palette.primary }]}>Receipt</Text>
            </Pressable>
            <View style={[styles.heroBadge, { backgroundColor: `${palette.primary}1A` }]}>
              <Package size={18} color={palette.primary} />
            </View>
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>Order detail</Text>

        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.text }]}>{order.trackingCode}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
            <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: `${palette.primary}0D`, borderColor: palette.border }]}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Price</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>
              ₦{Number(order.price).toLocaleString('en-NG')}
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: `${palette.primary}0D`, borderColor: palette.border }]}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Created</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>
              {new Date(order.createdAt).toLocaleDateString('en-NG')}
            </Text>
          </View>
        </View>
      </View>

      {order.status === 'CANCELLED' && order.cancelReason ? (
        <View style={[styles.cancelReasonCard, { backgroundColor: `${palette.error}0D`, borderColor: `${palette.error}33` }]}>
          <Text style={[styles.cancelReasonTitle, { color: palette.error }]}>Cancellation Reason</Text>
          <Text style={[styles.cancelReasonText, { color: palette.text }]}>{order.cancelReason}</Text>
        </View>
      ) : null}

      {/* Route card */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: Spacing.sm }]}>Route</Text>

        <View style={styles.routeContainer}>
          <View style={styles.routeConnectorCol}>
            <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
            <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
            <View style={[styles.routeDot, { backgroundColor: palette.primary }]} />
          </View>
          <View style={styles.routeDetailsCol}>
            <View style={styles.routeDetailItem}>
              <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Pickup Location</Text>
              <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                {order.pickupFormattedAddress}
              </Text>
            </View>
            <View style={styles.routeDetailItem}>
              <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Delivery Location</Text>
              <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                {order.deliveryFormattedAddress}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recipient info card */}
      {order.recipientName || order.recipientPhone ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: Spacing.xs }]}>Recipient Contact</Text>
          <View style={{ gap: 4 }}>
            {order.recipientName ? <Text style={[styles.routeValue, { color: palette.text }]}>{order.recipientName}</Text> : null}
            {order.recipientPhone ? <Text style={[styles.routeValue, { color: palette.textSecondary }]}>{order.recipientPhone}</Text> : null}
          </View>
        </View>
      ) : null}

      {/* Driver card - show if driver is assigned */}
      {order.driver ? (
        <DriverCard
          driver={order.driver}
          onCall={() => setModalConfig({
            visible: true,
            title: 'Call Driver',
            description: 'Driver calling will be available through the live tracking screen while your order is in transit.',
            type: 'info',
            primaryText: 'OK',
            onPrimaryPress: () => setModalConfig((prev) => ({ ...prev, visible: false })),
          })}
        />
      ) : null}

      {/* Items card */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Items & Package Photos</Text>
        {(order.items ?? []).length ? (
          (order.items ?? []).map((item, index) => (
            <View key={`${item.description}-${index}`} style={[styles.itemRow, { borderTopColor: palette.border, flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.itemText, { color: palette.text }]}>{item.description}</Text>
                <Text style={[styles.itemQty, { color: palette.textSecondary }]}>x{item.quantity}</Text>
              </View>
              {item.imageUrl ? (
                <View style={{ width: 90, height: 90, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, marginTop: 4 }}>
                  <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={[styles.emptyBodyMuted, { color: palette.textSecondary }]}>
            No item list was attached to this order.
          </Text>
        )}
      </View>

      {/* Delivery proof */}
      {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && order.proofImageUrl ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Delivery proof</Text>
          <Pressable
            onPress={() => setProofPreviewVisible(true)}
            style={{ width: '100%', height: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: palette.border }}
          >
            <Image source={{ uri: order.proofImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </Pressable>
          <Text style={[styles.emptyBodyMuted, { color: palette.textSecondary, marginTop: 8 }]}>
            Photo captured by the driver at delivery{order.proofUploadedAt ? ` • ${new Date(order.proofUploadedAt).toLocaleString()}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Status history */}
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Status history</Text>
        <StatusTimeline items={order.statusHistory} orderStatus={order.status} />
      </View>

      {isActiveDelivery ? (
        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/send/tracking/[id]', params: { id: order.id } } as never)}
          style={({ pressed }) => [
            styles.trackButton,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.trackButtonText}>Track Live</Text>
        </Pressable>
      ) : null}

      {/* Confirm delivery CTA — shown when driver has marked delivered but user hasn't confirmed yet */}
      {order.status === 'DELIVERED' ? (
        <Pressable
          onPress={() => setConfirmDeliveryVisible(true)}
          style={({ pressed }) => [
            styles.rateButton,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.rateButtonText}>Confirm Delivery</Text>
        </Pressable>
      ) : null}

      {/* Rate CTA — only available after order is fully COMPLETED */}
      {order.status === 'COMPLETED' ? (
        <Pressable
          onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)}
          style={({ pressed }) => [
            styles.rateButton,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.rateButtonText}>{order.rating ? 'View rating' : 'Rate delivery'}</Text>
        </Pressable>
      ) : null}

      {/* Cancel CTA — only available if order is in a cancellable state */}
      {isCancellable ? (
        <Pressable
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
          style={({ pressed }) => [
            styles.cancelButton,
            { borderColor: palette.error },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.cancelButtonText, { color: palette.error }]}>
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>

    <Modal transparent visible={confirmDeliveryVisible} animationType="fade" onRequestClose={() => setConfirmDeliveryVisible(false)}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirmDeliveryVisible(false)} />
        <View style={[styles.confirmSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {/* Icon */}
          <View style={[styles.confirmIconWrap, { backgroundColor: `${palette.success}1A` }]}>
            <CheckCircle2 size={26} color={palette.success} />
          </View>

          <View style={styles.confirmTextBlock}>
            <Text style={[styles.confirmTitle, { color: palette.text }]}>Confirm Delivery</Text>
            <Text style={[styles.confirmBody, { color: palette.textSecondary }]}>
              Please confirm that you have received your package in good condition. Once confirmed, the driver will receive their earnings.
            </Text>
          </View>

          {/* Order meta */}
          <View style={[styles.confirmMeta, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Text style={[styles.confirmMetaLabel, { color: palette.textSecondary }]}>Order</Text>
            <Text style={[styles.confirmMetaValue, { color: palette.text }]}>{order.trackingCode}</Text>
          </View>

          {/* Actions */}
          <View style={styles.confirmActions}>
            <Pressable
              onPress={() => setConfirmDeliveryVisible(false)}
              style={[styles.confirmSecondary, { backgroundColor: palette.bg, borderColor: palette.border }]}
            >
              <Text style={[styles.confirmSecondaryText, { color: palette.text }]}>Not Yet</Text>
            </Pressable>
            <Pressable
              disabled={confirmDeliveryMutation.isPending}
              onPress={async () => {
                try {
                  await confirmDeliveryMutation.mutateAsync(order.id);
                  setConfirmDeliveryVisible(false);
                  router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never);
                } catch (error) {
                  setConfirmDeliveryVisible(false);
                  setModalConfig({
                    visible: true,
                    title: 'Confirmation Failed',
                    description: error instanceof Error ? error.message : 'Unable to confirm delivery. Please try again.',
                    type: 'error',
                    primaryText: 'OK',
                    onPrimaryPress: () => setModalConfig((prev) => ({ ...prev, visible: false })),
                  });
                }
              }}
              style={[styles.confirmPrimary, { backgroundColor: palette.success, opacity: confirmDeliveryMutation.isPending ? 0.7 : 1 }]}
            >
              <Text style={styles.confirmPrimaryText}>
                {confirmDeliveryMutation.isPending ? 'Confirming…' : 'Yes, Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    <Modal transparent visible={modalConfig.visible} animationType="fade" onRequestClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalConfig((prev) => ({ ...prev, visible: false }))} />
        <View style={[styles.modalSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.modalIcon, {
            backgroundColor:
              modalConfig.type === 'error' ? `${palette.error}1A` :
              modalConfig.type === 'success' ? `${palette.success}1A` :
              modalConfig.type === 'warning' ? `${palette.warning}1A` :
              `${palette.primary}1A`,
          }]}>
            {modalConfig.type === 'error' ? (
              <XCircle size={20} color={palette.error} />
            ) : modalConfig.type === 'success' ? (
              <CheckCircle2 size={20} color={palette.success} />
            ) : modalConfig.type === 'warning' ? (
              <AlertTriangle size={20} color={palette.warning} />
            ) : (
              <Info size={20} color={palette.primary} />
            )}
          </View>
          <Text style={[styles.modalTitle, { color: palette.text }]}>{modalConfig.title}</Text>
          <Text style={[styles.modalBody, { color: palette.textSecondary }]}>{modalConfig.description}</Text>
          <View style={styles.modalActions}>
            {modalConfig.secondaryText ? (
              <Pressable
                onPress={modalConfig.onSecondaryPress}
                style={[styles.modalSecondaryBtn, { backgroundColor: palette.bg, borderColor: palette.border }]}
              >
                <Text style={[styles.modalSecondaryBtnText, { color: palette.text }]}>{modalConfig.secondaryText}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={modalConfig.onPrimaryPress}
              style={[styles.modalPrimaryBtn, {
                backgroundColor:
                  modalConfig.type === 'error' ? palette.error :
                  modalConfig.type === 'warning' ? palette.error :
                  palette.primary,
              }]}
            >
              <Text style={styles.modalPrimaryBtnText}>{modalConfig.primaryText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    <Modal visible={orderReceiptOpen} transparent animationType="fade" onRequestClose={() => setOrderReceiptOpen(false)}>
      <View style={styles.modalBackdropCenter}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOrderReceiptOpen(false)} />
        <View style={[styles.receiptCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {order ? (
            <>
              <View ref={orderReceiptRef} collapsable={false} style={[styles.receiptPrintable, { backgroundColor: palette.card }]}>
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptLogoBox}>
                    <Image source={getThemeIconSource(palette.primary)} style={styles.brandIconImage} />
                    <Text style={[styles.receiptLogoText, { color: palette.text }]}>Percel</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusConfig.text }]} />
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
                  </View>
                </View>

                <View style={styles.receiptAmountSection}>
                  <Text style={[styles.receiptAmountText, { color: palette.text }]}>
                    {formatNaira(Number(order.price))}
                  </Text>
                  <Text style={[styles.receiptTimestamp, { color: palette.textSecondary }]}>
                    {new Date(order.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <DashedDivider />

                <View style={styles.receiptDetails}>
                  <ReceiptRow label="Tracking Code" value={order.trackingCode} palette={palette} />
                  <ReceiptRow label="Sender" value={user?.fullName || 'Sender'} palette={palette} />
                  <ReceiptRow label="Pickup" value={order.pickupFormattedAddress} palette={palette} />
                  <ReceiptRow label="Recipient" value={order.recipientName || 'Recipient'} palette={palette} />
                  <ReceiptRow label="Delivery" value={order.deliveryFormattedAddress} palette={palette} />
                  {order.recipientPhone ? <ReceiptRow label="Recipient Phone" value={order.recipientPhone} palette={palette} /> : null}
                </View>

                <DashedDivider />

                <View style={styles.scallopedContainer}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View key={i} style={styles.scallopCircle} />
                  ))}
                </View>
              </View>

              <View style={styles.receiptActions}>
                <Pressable onPress={handleShareOrderImage} style={[styles.receiptActionButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <Share2 size={16} color={palette.text} />
                  <Text style={[styles.receiptActionText, { color: palette.text }]}>Share Image</Text>
                </Pressable>
                <Pressable onPress={handleShareOrderPdf} style={[styles.receiptActionButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <FileDown size={16} color={palette.text} />
                  <Text style={[styles.receiptActionText, { color: palette.text }]}>Share PDF</Text>
                </Pressable>
              </View>

              <Pressable onPress={() => setOrderReceiptOpen(false)} style={[styles.receiptCloseButton, { backgroundColor: palette.primary }]}>
                <Text style={styles.receiptCloseButtonText}>Close</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>

    <TransactionResultModal
      visible={Boolean(receiptResult?.visible)}
      type={receiptResult?.type ?? 'pending'}
      title={receiptResult?.title ?? ''}
      message={receiptResult?.message ?? ''}
      amount={receiptResult?.amount}
      reference={receiptResult?.reference}
      onClose={() => setReceiptResult(null)}
    />

    <Modal visible={proofPreviewVisible} transparent animationType="fade" onRequestClose={() => setProofPreviewVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        <Pressable style={{ position: 'absolute', top: 48, right: 20, zIndex: 2 }} onPress={() => setProofPreviewVisible(false)}>
          <XCircle size={28} color="#fff" />
        </Pressable>
        {order.proofImageUrl ? (
          <Image source={{ uri: order.proofImageUrl }} style={{ flex: 1 }} resizeMode="contain" />
        ) : null}
      </View>
    </Modal>
  </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: 10 },
  loading: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  emptyBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 20 },
  emptyBodyMuted: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20 },
  retryButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  heroCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: Typography.family.bold, letterSpacing: -0.5, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  summaryChip: { flex: 1, borderRadius: 16, padding: Spacing.md, gap: 4, borderWidth: 1 },
  summaryLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  routeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  routeConnectorCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  routeDetailsCol: {
    flex: 1,
    gap: Spacing.md,
  },
  routeDetailItem: {
    gap: 2,
  },
  routeLabel: {
    fontSize: 9,
    fontFamily: Typography.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
    lineHeight: 18,
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1 },
  itemText: { fontSize: Typography.md, fontFamily: Typography.family.medium, flex: 1 },
  itemQty: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  trackButton: { borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  trackButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  rateButton: { borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  rateButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  cancelButton: { borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 4 },
  cancelButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cancelReasonCard: { borderRadius: 16, borderWidth: 1, padding: Spacing.md, gap: 4 },
  cancelReasonTitle: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  cancelReasonText: { fontSize: Typography.sm, fontFamily: Typography.family.medium, lineHeight: 20 },
  // ── Confirm delivery bottom sheet ────────────────────────────────────────────
  confirmSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  confirmIconWrap: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  confirmTextBlock: { gap: 6 },
  confirmTitle: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  confirmBody: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  confirmMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  confirmMetaLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  confirmMetaValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  confirmActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  confirmSecondary: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  confirmSecondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  confirmPrimary: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmPrimaryText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, gap: 12 },
  modalIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalBody: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalSecondaryBtn: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalSecondaryBtnText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalPrimaryBtn: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryBtnText: { color: '#FFFFFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  receiptBtnText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  receiptCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 14,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  receiptPrintable: {
    borderRadius: 20,
    padding: 12,
    gap: 12,
    position: 'relative',
  },
  dashedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginVertical: 8,
    height: 1.5,
  },
  dash: {
    width: 6,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconImage: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  receiptLogoText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Typography.family.bold,
  },
  receiptAmountSection: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 4,
  },
  receiptAmountText: {
    color: '#fff',
    fontSize: 32,
    fontFamily: Typography.family.bold,
  },
  receiptTimestamp: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Typography.family.regular,
  },
  receiptDetails: {
    gap: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  receiptLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: Typography.family.regular,
  },
  receiptValue: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Typography.family.bold,
    textAlign: 'right',
    flex: 1,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  receiptActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  receiptActionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Typography.family.bold,
  },
  receiptCloseButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  receiptCloseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Typography.family.bold,
  },
  scallopedContainer: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    zIndex: 10,
  },
  scallopCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
