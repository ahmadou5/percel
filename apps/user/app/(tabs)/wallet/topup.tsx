import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountInput } from '@/components/wallet/AmountInput';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira } from '@/lib/wallet';
import { useTopUp } from '@/hooks/useWallet';

WebBrowser.maybeCompleteAuthSession();

const quickAmounts = [1000, 2500, 5000, 10000] as const;

export default function TopUpScreen() {
  const router = useRouter();
  const mutation = useTopUp();
  const [amount, setAmount] = useState('5000');
  const [previewOpen, setPreviewOpen] = useState(false);

  const amountValue = Number(amount.replace(/,/g, ''));
  const canSubmit = amountValue >= 100;

  const rows = useMemo(
    () => [
      { label: 'Amount', value: formatNaira(amountValue) },
      { label: 'Channel', value: 'Paystack checkout' },
      { label: 'Status', value: 'Card or bank transfer' },
    ],
    [amountValue],
  );

  const submit = async () => {
    if (!canSubmit) return;
    setPreviewOpen(false);
    try {
      await mutation.mutateAsync({ amount: amountValue });
      Alert.alert('Top-up opened', 'Complete the payment in the browser window, then return to refresh your wallet.');
      router.back();
    } catch (error) {
      Alert.alert('Top-up failed', error instanceof Error ? error.message : 'Unable to start payment.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Add funds</Text>
        <Text style={styles.title}>Top up your wallet with a clean Paystack checkout.</Text>
        <Text style={styles.subtitle}>Choose an amount, review the summary, and open the payment modal. After checkout, the wallet refreshes automatically.</Text>
      </View>

      <AmountInput
        label="Top up amount"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
        helperText="Minimum top up is ₦100."
      />

      <View style={styles.quickRow}>
        {quickAmounts.map((value) => (
          <Pressable key={value} onPress={() => setAmount(String(value))} style={styles.quickChip}>
            <Text style={styles.quickChipText}>{formatNaira(value)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Your payment will open in a secure browser modal.</Text>
        <Text style={styles.summaryValue}>{formatNaira(amountValue || 0)}</Text>
      </View>

      <Pressable onPress={() => setPreviewOpen(true)} disabled={!canSubmit} style={[styles.primary, !canSubmit ? styles.disabled : null]}>
        <Text style={styles.primaryText}>{mutation.isPending ? 'Preparing checkout…' : 'Continue to Paystack'}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.secondary}>
        <Text style={styles.secondaryText}>Cancel</Text>
      </Pressable>

      <ConfirmSheet
        visible={previewOpen}
        title="Confirm top up"
        description="Review the amount before opening the payment flow."
        rows={rows}
        confirmLabel="Open payment modal"
        loading={mutation.isPending}
        onConfirm={submit}
        onCancel={() => setPreviewOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.md, lineHeight: 22 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickChipText: { color: Colors.light.text, fontWeight: Typography.semibold },
  summaryCard: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: 6 },
  summaryLabel: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  summaryValue: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  primary: { backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
  secondary: { backgroundColor: Colors.light.card, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.light.border },
  secondaryText: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.semibold },
});
