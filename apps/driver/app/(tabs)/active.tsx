import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';

import { ActionButton, Card, Pill, Screen, SectionHeader } from '@/components/DriverPrimitives';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@percel/shared/constants';
import { Text, View } from '@/components/Themed';
import { useDriverRateOrder, useUpdateOrderStatus } from '@/hooks/useDriverOrders';
import { demoOrders } from '@/lib/demo-data';
import { useDriverStore } from '@/store/driver.store';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

function nextStatus(status: string) {
  return status === 'ACCEPTED' ? 'IN_TRANSIT' : 'DELIVERED';
}

export default function ActiveOrderScreen() {
  const order = useDriverStore((state) => state.currentOrder) ?? demoOrders[1];
  const updateStatus = useUpdateOrderStatus();
  const rateCustomer = useDriverRateOrder();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<1 | 5>(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const statusButtonLabel = order.status === 'ACCEPTED' ? "I've Picked Up the Package" : 'Mark as Delivered';

  const advance = async () => {
    const next = await updateStatus.mutateAsync({
      orderId: order.id,
      status: nextStatus(order.status) as 'IN_TRANSIT' | 'DELIVERED',
    });

    if (next.status === 'DELIVERED') {
      setFeedbackOrderId(next.id);
      setFeedbackVisible(true);
      setFeedbackRating(5);
      setFeedbackComment('');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Active order</Text>
          <Text style={styles.title}>{order.trackingCode}</Text>
          <Text style={styles.subtitle}>Route progress, rider contact, and delivery status live in one place.</Text>
        </View>

        <Card>
          <SectionHeader title="Route preview" caption="Pickup to delivery" />
          <View style={styles.mapBox}>
            <View style={styles.mapLine} />
            <View style={styles.mapMarkerStart} />
            <View style={styles.mapMarkerEnd} />
            <Text style={styles.mapText}>Map preview unavailable in this build</Text>
          </View>
          <Text style={styles.routeText}>{order.pickupFormattedAddress}</Text>
          <Text style={styles.routeArrow}>↓</Text>
          <Text style={styles.routeText}>{order.deliveryFormattedAddress}</Text>
        </Card>

        <Card>
          <SectionHeader title="Customer" caption="Tap to call" />
          <Text style={styles.customerName}>Amaka Okafor</Text>
          <Text style={styles.customerPhone} onPress={() => void Linking.openURL('tel:+2348012345678')}>
            +234 801 234 5678
          </Text>
        </Card>

        <Card>
          <SectionHeader title="Order details" caption="Package and payout" />
          <View style={styles.orderMetaRow}>
            <Pill label={order.size} tone="info" />
            <Pill label={`${order.distanceKm.toFixed(1)} km`} tone="neutral" />
            <Pill label={formatCurrency(order.price)} tone="warning" />
          </View>
          <Text style={styles.metaText}>Items: Clothing box, accessories, and sealed parcel</Text>
          <Text style={styles.metaText}>Tracking code: {order.trackingCode}</Text>
        </Card>

        <ActionButton title={statusButtonLabel} onPress={advance} disabled={updateStatus.isPending} />
      </ScrollView>

      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={() => setFeedbackVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalEyebrow}>Delivery complete</Text>
            <Text style={styles.modalTitle}>Rate this customer</Text>
            <Text style={styles.modalCopy}>Use a quick thumbs-up or thumbs-down before you close the run.</Text>

            <View style={styles.thumbRow}>
              <Pressable onPress={() => setFeedbackRating(5)} style={[styles.thumbButton, feedbackRating === 5 ? styles.thumbButtonActive : null]}>
                <FontAwesome name="thumbs-up" size={22} color={feedbackRating === 5 ? '#fff' : Colors.light.text} />
                <Text style={[styles.thumbLabel, feedbackRating === 5 ? styles.thumbLabelActive : null]}>Good</Text>
              </Pressable>
              <Pressable onPress={() => setFeedbackRating(1)} style={[styles.thumbButton, feedbackRating === 1 ? styles.thumbButtonDanger : null]}>
                <FontAwesome name="thumbs-down" size={22} color={feedbackRating === 1 ? '#fff' : Colors.light.text} />
                <Text style={[styles.thumbLabel, feedbackRating === 1 ? styles.thumbLabelActive : null]}>Bad</Text>
              </Pressable>
            </View>

            <TextInput
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder="Optional note"
              placeholderTextColor={Colors.light.textSecondary}
              style={styles.commentInput}
              multiline
            />

            <View style={styles.modalActions}>
              <ActionButton title="Skip" variant="secondary" onPress={() => setFeedbackVisible(false)} />
              <ActionButton
                title="Submit"
                onPress={async () => {
                  if (!feedbackOrderId) return;
                  try {
                    await rateCustomer.mutateAsync({
                      orderId: feedbackOrderId,
                      driverRating: feedbackRating,
                      driverComment: feedbackComment.trim() || undefined,
                    });
                    setFeedbackVisible(false);
                    Alert.alert('Customer rated', 'Feedback submitted successfully.');
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unable to submit rating';
                    Alert.alert('Rating failed', message);
                  }
                }}
                disabled={rateCustomer.isPending}
              />
            </View>
          </View>
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
    gap: 8,
  },
  eyebrow: { color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  mapBox: {
    height: 210,
    borderRadius: 24,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLine: { position: 'absolute', left: '22%', right: '22%', top: '50%', height: 2, backgroundColor: '#334155' },
  mapMarkerStart: { position: 'absolute', left: '20%', top: '45%', width: 18, height: 18, borderRadius: 9, backgroundColor: '#30D158' },
  mapMarkerEnd: { position: 'absolute', right: '20%', top: '45%', width: 18, height: 18, borderRadius: 9, backgroundColor: '#0A84FF' },
  mapText: { color: '#64748B', fontSize: 12 },
  routeText: { color: '#F8FAFC', fontSize: 14, lineHeight: 20 },
  routeArrow: { color: '#FDE68A', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  customerName: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  customerPhone: { color: '#BFDBFE', fontSize: 14, marginTop: 4 },
  orderMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaText: { color: '#CBD5E1', fontSize: 14, lineHeight: 21 },
  modalBackdrop: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.68)',
  },
  modalSheet: {
    gap: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 24,
    backgroundColor: Colors.light.card,
  },
  modalEyebrow: {
    color: Colors.light.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  modalCopy: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbButton: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  thumbButtonActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  thumbButtonDanger: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  thumbLabel: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '700',
  },
  thumbLabelActive: {
    color: '#fff',
  },
  commentInput: {
    minHeight: 100,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: '#fff',
    color: Colors.light.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
});
