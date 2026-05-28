import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountInput } from '@/components/wallet/AmountInput';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { discos, formatNaira } from '@/lib/wallet';
import { useBuyElectricity } from '@/hooks/useWallet';

export default function ElectricityScreen() {
  const mutation = useBuyElectricity();
  const [meterNumber, setMeterNumber] = useState('');
  const [disco, setDisco] = useState<(typeof discos)[number]>('Ikeja');
  const [amount, setAmount] = useState('3000');
  const [previewOpen, setPreviewOpen] = useState(false);

  const amountValue = Number(amount.replace(/,/g, ''));
  const canSubmit = meterNumber.trim().length >= 8 && amountValue > 0;

  const rows = useMemo(
    () => [
      { label: 'Meter number', value: meterNumber || 'Not set' },
      { label: 'Disco', value: disco },
      { label: 'Amount', value: formatNaira(amountValue) },
    ],
    [amountValue, disco, meterNumber],
  );

  const submit = async () => {
    setPreviewOpen(false);
    try {
      await mutation.mutateAsync({ meterNumber, amount: amountValue, disco });
      Alert.alert('Electricity paid', 'The wallet ledger has been updated.');
    } catch (error) {
      Alert.alert('Payment failed', error instanceof Error ? error.message : 'Unable to pay electricity bill.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Electricity</Text>
        <Text style={styles.title}>Set the meter, choose the disco, and pay the bill in one flow.</Text>
      </View>

      <Input label="Meter number" value={meterNumber} onChangeText={setMeterNumber} keyboardType="number-pad" placeholder="1234567890" />

      <View style={styles.section}>
        <Text style={styles.label}>Disco</Text>
        <View style={styles.chips}>
          {discos.map((item) => {
            const active = item === disco;
            return (
              <Pressable key={item} onPress={() => setDisco(item)} style={[styles.chip, active ? styles.chipActive : null]}>
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <AmountInput label="Amount" value={amount} onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))} helperText="Payments are debited from the wallet balance." />

      <Pressable onPress={() => setPreviewOpen(true)} disabled={!canSubmit} style={[styles.primary, !canSubmit ? styles.disabled : null]}>
        <Text style={styles.primaryText}>{mutation.isPending ? 'Processing…' : 'Review electricity payment'}</Text>
      </Pressable>

      <ConfirmSheet
        visible={previewOpen}
        title="Confirm electricity payment"
        description="The meter and disco should be correct before you proceed."
        rows={rows}
        confirmLabel="Pay electricity"
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
  primary: { backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
