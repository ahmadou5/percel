import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useCreateSupportTicket, TicketCategory } from '@/hooks/useSupport';
import { useAppPalette } from '@/lib/theme';

const CATEGORIES: Array<{ key: TicketCategory; label: string }> = [
  { key: 'WRONG_CHARGE', label: 'Wrong Charge / Overcharge' },
  { key: 'FAILED_ORDER', label: 'Failed Order / Undelivered' },
  { key: 'LATE_DELIVERY', label: 'Late Delivery' },
  { key: 'DAMAGED_PACKAGE', label: 'Damaged Package' },
  { key: 'DRIVER_CONDUCT', label: 'Driver Misconduct' },
  { key: 'PAYMENT_ISSUE', label: 'Payment / Wallet Issue' },
  { key: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { key: 'OTHER', label: 'Other Issue' },
];

export default function CreateSupportTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const back = useSafeBack('/support');
  const palette = useAppPalette();
  const modal = useAppModal();

  const [category, setCategory] = useState<TicketCategory>('WRONG_CHARGE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [refundRequested, setRefundRequested] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

  const createTicket = useCreateSupportTicket();

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      modal.alert('Missing fields', 'Please enter a subject and a description of your issue.', 'warning');
      return;
    }

    try {
      const ticket = await createTicket.mutateAsync({
        orderId: params.orderId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        refundRequested,
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
        userRole: 'USER',
      });

      modal.show({
        title: 'Complaint Submitted',
        description: `Your ticket (${ticket.ticketNumber}) has been submitted. Our support team will review it shortly.`,
        type: 'success',
        primaryText: 'View Ticket',
        onPrimaryPress: () => {
          modal.hide();
          router.replace({ pathname: '/support/[id]', params: { id: ticket.id } });
        },
      });
    } catch (error) {
      modal.alert('Submission Error', error instanceof Error ? error.message : 'Could not submit support ticket.', 'error');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Report an Issue / Dispute</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Category Picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>Complaint Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const selected = c.key === category;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? palette.primary : palette.card,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? '#FFF' : palette.text }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Subject */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>Subject *</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Wrong charge on order #TRK-1029"
            placeholderTextColor={palette.textSecondary}
            style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>Detailed Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what happened with as much detail as possible..."
            placeholderTextColor={palette.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={[styles.textArea, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
          />
        </View>

        {/* Refund Toggle */}
        <Pressable
          onPress={() => setRefundRequested(!refundRequested)}
          style={[styles.toggleRow, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <View style={styles.toggleTextWrap}>
            <Text style={[styles.toggleTitle, { color: palette.text }]}>Request a Refund / Adjustment</Text>
            <Text style={[styles.toggleSub, { color: palette.textSecondary }]}>Enable if you were incorrectly charged</Text>
          </View>
          <View style={[styles.checkbox, { borderColor: refundRequested ? palette.primary : palette.border, backgroundColor: refundRequested ? palette.primary : 'transparent' }]}>
            {refundRequested ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
        </Pressable>

        {refundRequested ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>Amount Requested (₦)</Text>
            <TextInput
              value={refundAmount}
              onChangeText={setRefundAmount}
              placeholder="e.g. 2500"
              placeholderTextColor={palette.textSecondary}
              keyboardType="number-pad"
              style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
            />
          </View>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={createTicket.isPending}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: palette.primary, opacity: createTicket.isPending ? 0.6 : pressed ? 0.9 : 1 },
          ]}
        >
          {createTicket.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Send size={18} color="#FFF" />
              <Text style={styles.submitText}>Submit Complaint</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  chipText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: Typography.sm,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: Typography.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleTextWrap: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  toggleSub: { fontSize: Typography.xs },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  submitButton: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  submitText: { color: '#FFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
