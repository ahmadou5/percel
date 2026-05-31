import { useEffect, useMemo, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, Banknote, CreditCard, SearchCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AmountInput } from '@/components/wallet/AmountInput';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { buildSearchPreview, formatNaira } from '@/lib/wallet';
import { useBankTransfer, useResolveBankAccount, useTransfer } from '@/hooks/useWallet';

const recentContacts = [
  { name: 'Ayo Martins', phone: '08031234567' },
  { name: 'Blessing Udo', phone: '08123456789' },
  { name: 'Musa Bello', phone: '07012345678' },
] as const;

const banks = [
  { name: 'Access Bank', code: '044' },
  { name: 'GTBank', code: '058' },
  { name: 'First Bank', code: '011' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'UBA', code: '033' },
  { name: 'Wema Bank', code: '035' },
  { name: 'FCMB', code: '214' },
  { name: 'Stanbic IBTC', code: '232' },
] as const;

const modes = [
  { key: 'BANK', label: 'Bank transfer', description: 'Send to a bank account' },
  { key: 'PHONE', label: 'Phone transfer', description: 'Send to a wallet number' },
] as const;

type Mode = (typeof modes)[number]['key'];

export default function TransferScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const phoneMutation = useTransfer();
  const bankResolve = useResolveBankAccount();
  const bankMutation = useBankTransfer();
  const [mode, setMode] = useState<Mode>('BANK');
  const [phone, setPhone] = useState('');
  const [bankCode, setBankCode] = useState('044');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvedBank, setResolvedBank] = useState('');
  const [amount, setAmount] = useState('2500');
  const [note, setNote] = useState('Waybill support');
  const [pin, setPin] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const amountValue = Number(amount.replace(/,/g, ''));
  const recipient = recentContacts.find((item) => item.phone === phone);
  const selectedBank = banks.find((item) => item.code === bankCode) ?? banks[0];
  const canSubmitPhone = phone.trim().length >= 10 && amountValue > 0 && /^\d{4,6}$/.test(pin.trim());
  const canSubmitBank = bankCode.trim().length >= 3 && accountNumber.trim().length >= 8 && amountValue > 0 && /^\d{4,6}$/.test(pin.trim()) && Boolean(resolvedName);

  const rows = useMemo(() => {
    if (mode === 'BANK') {
      return [
        { label: 'Bank', value: resolvedBank || selectedBank.name },
        { label: 'Account number', value: accountNumber || 'Not set' },
        { label: 'Account name', value: resolvedName || 'Validate account first' },
        { label: 'Amount', value: formatNaira(amountValue) },
        { label: 'Note', value: note || 'None' },
      ];
    }

    return [
      { label: 'Recipient', value: recipient?.name ?? buildSearchPreview(phone) },
      { label: 'Phone', value: phone || 'Not set' },
      { label: 'Amount', value: formatNaira(amountValue) },
      { label: 'Note', value: note || 'None' },
    ];
  }, [amountValue, bankCode, mode, note, accountNumber, phone, recipient?.name, resolvedBank, resolvedName, selectedBank.name]);

  const validateBank = async () => {
    if (accountNumber.trim().length < 8) return;
    try {
      const response = await bankResolve.mutateAsync({ bankCode, accountNumber: accountNumber.trim() });
      setResolvedName(response.data.accountName);
      setResolvedBank(response.data.bankName);
    } catch (error) {
      Alert.alert('Could not validate account', error instanceof Error ? error.message : 'Please check the bank code and account number.');
    }
  };

  const submit = async () => {
    if (mode === 'BANK' && !canSubmitBank) return;
    if (mode === 'PHONE' && !canSubmitPhone) return;

    setPreviewOpen(false);
    try {
      if (mode === 'BANK') {
        await bankMutation.mutateAsync({
          bankCode,
          accountNumber: accountNumber.trim(),
          amount: amountValue,
          description: note,
          pin,
        });
      } else {
        await phoneMutation.mutateAsync({ toPhone: phone, amount: amountValue, description: note, pin });
      }
      Alert.alert('Transfer sent', 'The wallet balance will update after the transaction completes.');
      router.back();
    } catch (error) {
      Alert.alert('Transfer failed', error instanceof Error ? error.message : 'Unable to complete transfer.');
    }
  };

  const canContinue = mode === 'BANK' ? canSubmitBank : canSubmitPhone;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.backText, { color: palette.text }]}>Back</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Send money</Text>
          <Text style={[styles.title, { color: palette.text }]}>Move money to a wallet or a bank account with a checked preview first.</Text>
        </View>
      </View>

      <View style={[styles.heroCard, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Current mode</Text>
            <Text style={styles.heroValue}>{mode === 'BANK' ? 'Bank transfer' : 'Phone transfer'}</Text>
          </View>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <ArrowUpRight size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>{mode === 'BANK' ? 'Validate the account name before you send. The app will debit your wallet and initiate the payout.' : 'Send to another wallet number with the same confirmation flow.'}</Text>
      </View>

      <View style={styles.modeRow}>
        {modes.map((item) => {
          const active = item.key === mode;
          return (
            <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.modeCard, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }] }>
              <Text style={[styles.modeLabel, { color: active ? palette.card : palette.text }]}>{item.label}</Text>
              <Text style={[styles.modeMeta, { color: active ? 'rgba(255,255,255,0.76)' : palette.textSecondary }]}>{item.description}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'BANK' ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Bank details</Text>
          <View style={styles.bankRow}>
            {banks.map((bank) => {
              const active = bank.code === bankCode;
              return (
                <Pressable key={bank.code} onPress={() => { setBankCode(bank.code); setResolvedName(''); setResolvedBank(''); }} style={[styles.bankChip, { backgroundColor: active ? palette.primary : palette.bg, borderColor: active ? palette.primary : palette.border }]}>
                  <Text style={[styles.bankChipText, { color: active ? palette.card : palette.text }]}>{bank.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Input label="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" placeholder="0123456789" />
          <Pressable onPress={() => void validateBank()} disabled={bankResolve.isPending || accountNumber.trim().length < 8} style={[styles.inlineAction, { backgroundColor: palette.text }] }>
            <SearchCheck size={16} color={palette.card} />
            <Text style={[styles.inlineActionText, { color: palette.card }]}>{bankResolve.isPending ? 'Validating…' : 'Validate account'}</Text>
          </Pressable>
          {resolvedName ? (
            <View style={[styles.resolvedCard, { backgroundColor: 'rgba(48,209,88,0.12)' }]}>
              <Banknote size={16} color={palette.success} />
              <View style={styles.resolvedCopy}>
                <Text style={[styles.resolvedTitle, { color: palette.success }]}>{resolvedName}</Text>
                <Text style={[styles.resolvedMeta, { color: palette.textSecondary }]}>{resolvedBank || selectedBank.name} • {accountNumber}</Text>
              </View>
            </View>
          ) : (
            <StateCard
              title="Validate the account"
              description="Tap validate to confirm the beneficiary name before you continue."
              icon={<CreditCard size={24} color={palette.textSecondary} />}
            />
          )}
        </View>
      ) : (
        <View style={styles.contactRow}>
          {recentContacts.map((contact) => (
            <Pressable key={contact.phone} onPress={() => setPhone(contact.phone)} style={[styles.contactChip, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.contactName, { color: palette.text }]}>{contact.name}</Text>
              <Text style={[styles.contactPhone, { color: palette.textSecondary }]}>{contact.phone}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {mode === 'PHONE' ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Input label="Recipient phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08012345678" />
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Recipient preview</Text>
            <Text style={styles.previewValue}>{recipient?.name ?? buildSearchPreview(phone)}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <AmountInput label="Transfer amount" value={amount} onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))} />
        <Input label="Note" value={note} onChangeText={setNote} placeholder="What is this for?" />
        <Input label="Transfer PIN" value={pin} onChangeText={setPin} placeholder="1234" keyboardType="number-pad" secureTextEntry secureToggle helperText="Enter the PIN you set in Profile before reviewing the transfer." />
      </View>

      <Pressable onPress={() => setPreviewOpen(true)} disabled={!canContinue} style={[styles.primary, { backgroundColor: canContinue ? palette.primary : palette.border }]}>
        <Text style={styles.primaryText}>{mode === 'BANK' ? 'Review bank transfer' : 'Review transfer'}</Text>
      </Pressable>

      <ConfirmSheet
        visible={previewOpen}
        title={mode === 'BANK' ? 'Confirm bank transfer' : 'Confirm transfer'}
        description={mode === 'BANK' ? 'Double-check the bank account before sending.' : 'Double-check the recipient before sending.'}
        rows={rows}
        confirmLabel={mode === 'BANK' ? 'Send to bank' : 'Send money'}
        loading={mode === 'BANK' ? bankMutation.isPending : phoneMutation.isPending}
        onConfirm={submit}
        onCancel={() => setPreviewOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { gap: Spacing.lg },
  backButton: { alignSelf: 'flex-start', minHeight: 40, minWidth: 72, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  headerCopy: { gap: 8 },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: Spacing.md, gap: 4 },
  modeLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modeMeta: { fontSize: Typography.xs, fontFamily: Typography.family.regular, lineHeight: 16 },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  bankRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bankChip: { minHeight: 40, borderRadius: 999, paddingHorizontal: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bankChipText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  inlineAction: { minHeight: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  inlineActionText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  resolvedCard: { borderRadius: 20, padding: Spacing.md, flexDirection: 'row', gap: 10, alignItems: 'center' },
  resolvedCopy: { flex: 1, gap: 2 },
  resolvedTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  resolvedMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  contactChip: { width: '48%', borderRadius: 18, padding: Spacing.md, borderWidth: 1, gap: 4 },
  contactName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  contactPhone: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  previewCard: { backgroundColor: Colors.light.bg, borderRadius: 18, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border, gap: 4 },
  previewLabel: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase' },
  previewValue: { color: Colors.light.text, fontSize: Typography.md, fontFamily: Typography.family.bold },
  primary: { borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
