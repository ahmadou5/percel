import { useEffect, useMemo, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AmountInput } from '@/components/wallet/AmountInput';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { buildSearchPreview, formatNaira } from '@/lib/wallet';
import { useTransfer } from '@/hooks/useWallet';

const recentContacts = [
  { name: 'Ayo Martins', phone: '08031234567' },
  { name: 'Blessing Udo', phone: '08123456789' },
  { name: 'Musa Bello', phone: '07012345678' },
] as const;

export default function TransferScreen() {
  const router = useRouter();
  const mutation = useTransfer();
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('2500');
  const [note, setNote] = useState('Waybill support');
  const [pin, setPin] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const recipient = recentContacts.find((item) => item.phone === phone);
  const amountValue = Number(amount.replace(/,/g, ''));
  const canSubmit = phone.trim().length >= 10 && amountValue > 0 && /^\d{4,6}$/.test(pin.trim());

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const rows = useMemo(
    () => [
      { label: 'Recipient', value: recipient?.name ?? buildSearchPreview(phone) },
      { label: 'Phone', value: phone || 'Not set' },
      { label: 'Amount', value: formatNaira(amountValue) },
      { label: 'Note', value: note || 'None' },
    ],
    [amountValue, note, phone, recipient?.name],
  );

  const submit = async () => {
    if (!canSubmit) return;
    setPreviewOpen(false);
    try {
      await mutation.mutateAsync({ toPhone: phone, amount: amountValue, description: note, pin });
      Alert.alert('Transfer sent', 'The wallet balance will update after the transaction completes.');
      router.back();
    } catch (error) {
      Alert.alert('Transfer failed', error instanceof Error ? error.message : 'Unable to complete transfer.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Send money</Text>
        <Text style={styles.title}>Move balance to a phone number with a simple confirmation sheet.</Text>
        <Text style={styles.subtitle}>Quick recipient chips act as a lightweight contact picker fallback for this build.</Text>
      </View>

      <View style={styles.contactRow}>
        {recentContacts.map((contact) => (
          <Pressable key={contact.phone} onPress={() => setPhone(contact.phone)} style={styles.contactChip}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactPhone}>{contact.phone}</Text>
          </Pressable>
        ))}
      </View>

      <Input label="Recipient phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />

      <View style={styles.previewCard}>
        <Text style={styles.previewLabel}>Recipient preview</Text>
        <Text style={styles.previewValue}>{recipient?.name ?? buildSearchPreview(phone)}</Text>
      </View>

      <AmountInput label="Transfer amount" value={amount} onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))} />

      <Input label="Note" value={note} onChangeText={setNote} placeholder="What is this for?" />

      <Input
        label="Transfer PIN"
        value={pin}
        onChangeText={setPin}
        placeholder="1234"
        keyboardType="number-pad"
        secureTextEntry
        secureToggle
        helperText="Enter the PIN you set in Profile before reviewing the transfer."
      />

      <Pressable onPress={() => setPreviewOpen(true)} disabled={!canSubmit} style={[styles.primary, !canSubmit ? styles.disabled : null]}>
        <Text style={styles.primaryText}>{mutation.isPending ? 'Sending…' : 'Review transfer'}</Text>
      </Pressable>

      <ConfirmSheet
        visible={previewOpen}
        title="Confirm transfer"
        description="Double-check the recipient before sending."
        rows={rows}
        confirmLabel="Send money"
        loading={mutation.isPending}
        onConfirm={submit}
        onCancel={() => setPreviewOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.md, lineHeight: 22 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  contactChip: {
    width: '48%',
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 4,
  },
  contactName: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  contactPhone: { color: Colors.light.textSecondary, fontSize: Typography.xs },
  previewCard: { backgroundColor: Colors.light.card, borderRadius: 18, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border, gap: 4 },
  previewLabel: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase' },
  previewValue: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.semibold },
  primary: { backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
