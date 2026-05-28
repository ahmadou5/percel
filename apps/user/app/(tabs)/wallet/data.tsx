import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountInput } from '@/components/wallet/AmountInput';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { dataPlans, formatNaira, telecomNetworks } from '@/lib/wallet';
import { useBuyData } from '@/hooks/useWallet';

export default function DataScreen() {
  const mutation = useBuyData();
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<(typeof telecomNetworks)[number]>('MTN');
  const [plan, setPlan] = useState<(typeof dataPlans)[number]['value']>('monthly');
  const [amount, setAmount] = useState('5000');
  const [previewOpen, setPreviewOpen] = useState(false);

  const amountValue = Number(amount.replace(/,/g, ''));
  const selectedPlan = dataPlans.find((item) => item.value === plan) ?? dataPlans[0];
  const canSubmit = phone.trim().length >= 10 && amountValue > 0;

  const rows = useMemo(
    () => [
      { label: 'Phone', value: phone || 'Not set' },
      { label: 'Network', value: network },
      { label: 'Plan', value: selectedPlan.label },
      { label: 'Amount', value: formatNaira(amountValue) },
    ],
    [amountValue, network, phone, selectedPlan.label],
  );

  const submit = async () => {
    setPreviewOpen(false);
    try {
      await mutation.mutateAsync({ phone, network, amount: amountValue, plan });
      Alert.alert('Data purchased', 'The transaction has been recorded in your wallet ledger.');
    } catch (error) {
      Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy data.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Data bundles</Text>
        <Text style={styles.title}>Pick a plan, confirm the recipient, and pay from your balance.</Text>
      </View>

      <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />

      <View style={styles.section}>
        <Text style={styles.label}>Network</Text>
        <View style={styles.chips}>
          {telecomNetworks.map((item) => {
            const active = item === network;
            return (
              <Pressable key={item} onPress={() => setNetwork(item)} style={[styles.chip, active ? styles.chipActive : null]}>
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Plan</Text>
        <View style={styles.planGrid}>
          {dataPlans.map((item) => {
            const active = item.value === plan;
            return (
              <Pressable key={item.value} onPress={() => setPlan(item.value)} style={[styles.planCard, active ? styles.planCardActive : null]}>
                <Text style={[styles.planLabel, active ? styles.planLabelActive : null]}>{item.label}</Text>
                <Text style={[styles.planAmount, active ? styles.planLabelActive : null]}>{formatNaira(item.amount)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <AmountInput label="Custom amount" value={amount} onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))} helperText="You can override the default plan price if needed." />

      <Pressable onPress={() => setPreviewOpen(true)} disabled={!canSubmit} style={[styles.primary, !canSubmit ? styles.disabled : null]}>
        <Text style={styles.primaryText}>{mutation.isPending ? 'Processing…' : 'Review data purchase'}</Text>
      </Pressable>

      <ConfirmSheet
        visible={previewOpen}
        title="Confirm data purchase"
        description="The plan, phone, and network should match before you submit."
        rows={rows}
        confirmLabel="Buy data"
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
  section: { gap: Spacing.sm },
  label: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 999, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border },
  chipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipText: { color: Colors.light.text, fontWeight: Typography.semibold },
  chipTextActive: { color: '#fff' },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  planCard: { width: '48%', borderRadius: 18, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: 4 },
  planCardActive: { backgroundColor: 'rgba(10, 132, 255, 0.12)', borderColor: Colors.light.primary },
  planLabel: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  planLabelActive: { color: Colors.light.primaryDark },
  planAmount: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  primary: { backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
