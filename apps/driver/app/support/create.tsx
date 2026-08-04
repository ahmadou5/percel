import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useCreateDriverSupportTicket, DriverTicketCategory } from '@/hooks/useDriverSupport';
import { useAppPalette } from '@/lib/theme';

const CATEGORIES: Array<{ key: DriverTicketCategory; label: string }> = [
  { key: 'WRONG_CHARGE', label: 'Earnings / Commission Deduction Issue' },
  { key: 'FAILED_ORDER', label: 'Trip Cancellation / Failed Delivery' },
  { key: 'DRIVER_CONDUCT', label: 'Customer Misconduct' },
  { key: 'PAYMENT_ISSUE', label: 'Cashout / Wallet Payout Issue' },
  { key: 'ACCOUNT_ISSUE', label: 'KYC / Vehicle Profile Issue' },
  { key: 'OTHER', label: 'App Bug / General Issue' },
];

export default function CreateDriverSupportTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const palette = useAppPalette();

  const [category, setCategory] = useState<DriverTicketCategory>('WRONG_CHARGE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const createTicket = useCreateDriverSupportTicket();

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Missing fields', 'Please enter a subject and a description of your issue.');
      return;
    }

    try {
      const ticket = await createTicket.mutateAsync({
        orderId: params.orderId,
        category,
        subject: subject.trim(),
        description: description.trim(),
      });

      Alert.alert('Dispute Submitted', `Your ticket (${ticket.ticketNumber}) has been submitted. Our support team will review it.`, [
        {
          text: 'View Ticket',
          onPress: () => router.replace({ pathname: '/support/[id]', params: { id: ticket.id } } as any),
        },
      ]);
    } catch (error) {
      Alert.alert('Submission Error', error instanceof Error ? error.message : 'Could not submit support ticket.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>File a Driver Issue / Dispute</Text>
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
            placeholder="e.g. Commission deduction incorrect on order #TRK-8821"
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
            placeholder="Explain the issue with order numbers, amounts, or details..."
            placeholderTextColor={palette.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={[styles.textArea, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
          />
        </View>

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
              <Text style={styles.submitText}>Submit Driver Ticket</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
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
