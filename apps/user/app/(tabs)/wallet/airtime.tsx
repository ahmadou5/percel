import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountInput } from '@/components/wallet/AmountInput';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira, telecomNetworks } from '@/lib/wallet';
import { useBuyAirtime } from '@/hooks/useWallet';

const presetAmounts = [100, 200, 500, 1000, 2000] as const;

export default function AirtimeScreen() {
  const mutation = useBuyAirtime();
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<(typeof telecomNetworks)[number]>('MTN');
  const [amount, setAmount] = useState('500');
  const [previewOpen, setPreviewOpen] = useState(false);

  const amountValue = Number(amount.replace(/,/g, ''));
  const canSubmit = phone.trim().length >= 10 && amountValue > 0;

  const rows = useMemo(
    () => [
      { label: 'Phone', value: phone || 'Not set' },
      { label: 'Network', value: network },
      { label: 'Amount', value: formatNaira(amountValue) },
    ],
    [amountValue, network, phone],
  );

  const submit = async () => {
    setPreviewOpen(false);
    try {
      await mutation.mutateAsync({ phone, network, amount: amountValue });
      Alert.alert('Airtime bought', 'The wallet ledger has been updated.');
    } catch (error) {
      Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy airtime.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Airtime</Text>
        <Text style={styles.title}>Fast phone top-ups from your wallet balance.</Text>
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

      <AmountInput label="Amount" value={amount} onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))} />

      <View style={styles.quickRow}>
        {presetAmounts.map((value) => (
          <Pressable key={value} onPress={() => setAmount(String(value))} style={styles.quickChip}>
            <Text style={styles.quickChipText}>{formatNaira(value)}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => setPreviewOpen(true)} disabled={!canSubmit} style={[styles.primary, !canSubmit ? styles.disabled : null]}>
        <Text style={styles.primaryText}>{mutation.isPending ? 'Processing…' : 'Review airtime purchase'}</Text>
      </Pressable>

      <ConfirmSheet
        visible={previewOpen}
        title="Confirm airtime"
        description="Make sure the number and network are correct before continuing."
        rows={rows}
        confirmLabel="Buy airtime"
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
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 999, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border },
  quickChipText: { color: Colors.light.text, fontWeight: Typography.semibold },
  primary: { backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
