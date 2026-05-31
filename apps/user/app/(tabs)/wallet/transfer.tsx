import { useEffect, useMemo, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowUpRight, Banknote, ChevronLeft, CreditCard, Search, SearchCheck } from 'lucide-react-native';
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
import { useBankTransfer, useBanks, useResolveBankAccount, useTransfer, useWallet } from '@/hooks/useWallet';

const recentContacts = [
  { name: 'Ayo Martins', phone: '08031234567' },
  { name: 'Blessing Udo', phone: '08123456789' },
  { name: 'Musa Bello', phone: '07012345678' },
] as const;

const modes = [
  { key: 'BANK', label: 'Bank transfer', description: 'Send to a bank account' },
  { key: 'PHONE', label: 'Phone transfer', description: 'Send to a wallet number' },
] as const;

type Mode = (typeof modes)[number]['key'];

type BankItem = {
  name: string;
  code: string;
  slug?: string | null;
  longcode?: string | null;
};

export default function TransferScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const walletQuery = useWallet();
  const phoneMutation = useTransfer();
  const banksQuery = useBanks();
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
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const amountValue = Number(amount.replace(/,/g, ''));
  const wallet = walletQuery.data;
  const kycReady = Boolean(wallet?.kycComplete);
  const recipient = recentContacts.find((item) => item.phone === phone);
  const banks = (banksQuery.data ?? []) as BankItem[];
  const selectedBank = banks.find((item) => item.code === bankCode) ?? { name: 'Select bank', code: bankCode, slug: null, longcode: null };
  const filteredBanks = useMemo(() => {
    const term = bankSearch.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter((bank) => `${bank.name} ${bank.code} ${bank.slug ?? ''}`.toLowerCase().includes(term));
  }, [bankSearch, banks]);

  const canSubmitPhone = phone.trim().length >= 10 && amountValue > 0 && /^\d{4,6}$/.test(pin.trim());
  const canSubmitBank =
    kycReady &&
    bankCode.trim().length >= 3 &&
    accountNumber.trim().length >= 8 &&
    amountValue > 0 &&
    /^\d{4,6}$/.test(pin.trim()) &&
    Boolean(resolvedName);

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
  }, [amountValue, accountNumber, bankCode, mode, note, phone, recipient?.name, resolvedBank, resolvedName, selectedBank.name]);

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
          <ChevronLeft size={20} color={palette.text} />
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
        <Text style={styles.heroBody}>{mode === 'BANK' ? 'Pick a bank from the searchable list, validate the account name, then send.' : 'Send to another wallet number with the same confirmation flow.'}</Text>
      </View>

      <View style={styles.modeRow}>
        {modes.map((item) => {
          const active = item.key === mode;
          return (
            <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.modeCard, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
              <Text style={[styles.modeLabel, { color: active ? palette.card : palette.text }]}>{item.label}</Text>
              <Text style={[styles.modeMeta, { color: active ? 'rgba(255,255,255,0.76)' : palette.textSecondary }]}>{item.description}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'BANK' ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Bank details</Text>
            <Pressable onPress={() => setBankPickerOpen(true)} style={[styles.sectionButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Search size={14} color={palette.textSecondary} />
              <Text style={[styles.sectionButtonText, { color: palette.text }]}>{selectedBank.name}</Text>
            </Pressable>
          </View>

          {!kycReady ? (
            <StateCard
              title="KYC required for bank payouts"
              description="Complete KYC in Settings before you can send to a bank account. Phone transfers still work."
              icon={<CreditCard size={24} color={palette.textSecondary} />}
              actionLabel="Complete KYC"
              onActionPress={() => router.push('/settings/kyc')}
            />
          ) : null}

          <View style={styles.bankSummary}>
            <Text style={[styles.bankSummaryTitle, { color: palette.text }]}>{selectedBank.name}</Text>
            <Text style={[styles.bankSummaryMeta, { color: palette.textSecondary }]}>{selectedBank.code}{selectedBank.slug ? ` • ${selectedBank.slug}` : ''}</Text>
          </View>

          <Input label="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" placeholder="0123456789" />
          <Pressable onPress={() => void validateBank()} disabled={bankResolve.isPending || accountNumber.trim().length < 8 || !kycReady} style={[styles.inlineAction, { backgroundColor: palette.text, opacity: kycReady ? 1 : 0.45 }]}>
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

      <Modal visible={bankPickerOpen} transparent animationType="fade" onRequestClose={() => setBankPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBankPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a bank</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Search the bank list to switch the transfer recipient bank.</Text>
              </View>
              <Pressable onPress={() => setBankPickerOpen(false)} style={[styles.modalClose, { backgroundColor: palette.bg }]}> 
                <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
              </Pressable>
            </View>

            <View style={[styles.searchWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Search size={16} color={palette.textSecondary} />
              <TextInput
                value={bankSearch}
                onChangeText={setBankSearch}
                placeholder="Search bank"
                placeholderTextColor={palette.textSecondary}
                style={[styles.searchInput, { color: palette.text }]}
              />
            </View>

            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                banksQuery.isLoading ? (
                  <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Loading banks…</Text>
                ) : (
                  <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No banks matched your search.</Text>
                )
              }
              renderItem={({ item }) => {
                const active = item.code === bankCode;
                return (
                  <Pressable
                    onPress={() => {
                      setBankCode(item.code);
                      setResolvedName('');
                      setResolvedBank('');
                      setBankPickerOpen(false);
                    }}
                    style={[styles.bankRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg }]}
                  >
                    <View style={styles.bankRowCopy}>
                      <Text style={[styles.bankRowName, { color: palette.text }]}>{item.name}</Text>
                      <Text style={[styles.bankRowMeta, { color: palette.textSecondary }]}>{item.code}{item.slug ? ` • ${item.slug}` : ''}</Text>
                    </View>
                    {active ? <Text style={[styles.bankRowSelected, { color: palette.primary }]}>Selected</Text> : null}
                  </Pressable>
                );
              }}
              style={styles.bankList}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { gap: Spacing.lg },
  backButton: { alignSelf: 'flex-start', minHeight: 40, minWidth: 72, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: Spacing.md, gap: 4 },
  modeLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modeMeta: { fontSize: Typography.xs, lineHeight: 16 },
  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sectionButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  sectionButtonText: { fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  bankSummary: { borderRadius: 20, padding: Spacing.md, gap: 4, backgroundColor: 'rgba(10,132,255,0.08)' },
  bankSummaryTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  bankSummaryMeta: { fontSize: Typography.sm },
  inlineAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 16 },
  inlineActionText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  resolvedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: Spacing.md },
  resolvedCopy: { flex: 1, gap: 2 },
  resolvedTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  resolvedMeta: { fontSize: Typography.xs },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactChip: { flex: 1, borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 2 },
  contactName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  contactPhone: { fontSize: Typography.xs },
  previewCard: { borderRadius: 18, padding: Spacing.md, backgroundColor: 'rgba(10,132,255,0.08)', gap: 4 },
  previewLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  previewValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  primary: { borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '82%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, lineHeight: 20, marginTop: 2, maxWidth: 280 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, paddingHorizontal: Spacing.md, minHeight: 52 },
  searchInput: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  bankList: { flexGrow: 0 },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  bankRowCopy: { flex: 1, gap: 2 },
  bankRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  bankRowMeta: { fontSize: Typography.xs },
  bankRowSelected: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  emptyText: { paddingVertical: Spacing.lg, textAlign: 'center', fontSize: Typography.sm },
});
