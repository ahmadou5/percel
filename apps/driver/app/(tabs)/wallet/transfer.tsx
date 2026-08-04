import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Landmark,
  Search,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BankPickerModal, BankLogo, type BankItem } from '@/components/wallet/BankPickerModal';
import { PaymentPinModal } from '@/components/wallet/PaymentPinModal';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  useAccountLookup,
  useBankTransfer,
  useBanks,
  useResolveTransferRecipient,
  useTransfer,
  useWallet,
} from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira } from '@/lib/wallet';

type TransferMode = 'BANK' | 'TAG';
type Step = 1 | 2 | 3;

const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000] as const;

export default function DriverTransferScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const walletQuery = useWallet();

  const [mode, setMode] = useState<TransferMode>('BANK');
  const [step, setStep] = useState<Step>(1);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [resultModal, setResultModal] = useState<{
    visible: boolean;
    type: 'success' | 'failed';
    title: string;
    message: string;
    amount?: string;
    reference?: string;
  }>({ visible: false, type: 'success', title: '', message: '' });

  // Bank transfer state
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [bankNote, setBankNote] = useState('');

  // Tag/Phone transfer state
  const [recipientPhone, setRecipientPhone] = useState('');
  const [tagAmount, setTagAmount] = useState('');
  const [tagNote, setTagNote] = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState<{ fullName: string; phone: string } | null>(null);

  const banksQuery = useBanks();
  const accountLookup = useAccountLookup(accountNumber, selectedBank?.code ?? '');
  const bankTransferMutation = useBankTransfer();
  const p2pTransferMutation = useTransfer();
  const resolveRecipientMutation = useResolveTransferRecipient();

  const activeAmount = mode === 'BANK' ? bankAmount : tagAmount;
  const setActiveAmount = mode === 'BANK' ? setBankAmount : setTagAmount;

  const handleResolvePhone = async () => {
    if (!recipientPhone.trim()) return;
    try {
      const res = await resolveRecipientMutation.mutateAsync({ phone: recipientPhone.trim() });
      if (res.data) setResolvedRecipient(res.data);
    } catch (err: any) {
      modal.alert('Recipient Not Found', err?.message || 'No user registered with this phone number.', 'error');
      setResolvedRecipient(null);
    }
  };

  const handleContinueStep1 = () => {
    if (mode === 'BANK') {
      if (!selectedBank) { modal.alert('Error', 'Please select a bank', 'warning'); return; }
      if (!accountNumber || accountNumber.length < 10) { modal.alert('Error', 'Please enter a valid 10-digit account number', 'warning'); return; }
      if (!accountLookup.data?.accountName) { modal.alert('Error', 'Bank account could not be verified. Check account number.', 'warning'); return; }
    } else {
      if (!resolvedRecipient) { modal.alert('Error', 'Please look up recipient phone number first', 'warning'); return; }
    }
    setStep(2);
  };

  const handleContinueStep2 = () => {
    const amt = Number(activeAmount);
    if (isNaN(amt) || amt <= 0) { modal.alert('Error', 'Please enter a valid transfer amount', 'warning'); return; }
    if (amt > (walletQuery.data?.balance ?? 0)) { modal.alert('Insufficient Balance', 'Your wallet balance is lower than this transfer amount.', 'warning'); return; }
    setStep(3);
  };

  const handleInitiate = () => setPinModalVisible(true);

  const handleConfirmPin = async (pin: string) => {
    try {
      if (mode === 'BANK') {
        const res = await bankTransferMutation.mutateAsync({
          bankCode: selectedBank!.code,
          accountNumber: accountNumber.trim(),
          amount: Number(bankAmount),
          description: bankNote || 'Bank Transfer from Driver Wallet',
          pin,
        });
        setPinModalVisible(false);
        setResultModal({
          visible: true,
          type: 'success',
          title: 'Transfer Successful',
          message: `Transferred to ${accountLookup.data?.accountName} (${selectedBank?.name})`,
          amount: formatNaira(Number(bankAmount)),
          reference: res.data?.reference,
        });
      } else {
        const res = await p2pTransferMutation.mutateAsync({
          toPhone: recipientPhone.trim(),
          amount: Number(tagAmount),
          description: tagNote || 'P2P Transfer from Driver Wallet',
          pin,
        });
        setPinModalVisible(false);
        setResultModal({
          visible: true,
          type: 'success',
          title: 'Transfer Successful',
          message: `Transferred to ${resolvedRecipient?.fullName}`,
          amount: formatNaira(Number(tagAmount)),
          reference: res.data?.reference,
        });
      }
    } catch (err: any) {
      setPinModalVisible(false);
      setResultModal({
        visible: true,
        type: 'failed',
        title: 'Transfer Failed',
        message: err?.message || 'Could not complete transfer. Please try again.',
      });
    }
  };

  const stepDots = [1, 2, 3] as const;

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* back */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
            style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <ChevronLeft size={18} color={palette.text} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>

        {/* eyebrow */}
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Transfer Money</Text>
        </View>

        {/* hero */}
        <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Mode</Text>
              <Text style={styles.heroValue}>{mode === 'BANK' ? 'Bank transfer' : 'Inter-app'}</Text>
            </View>
            <View style={styles.heroIcon}>
              <ArrowUpRight size={20} color="#fff" />
            </View>
          </View>
          <View style={styles.dots}>
            {stepDots.map((d) => (
              <View
                key={d}
                style={[
                  styles.dot,
                  d === step
                    ? { backgroundColor: '#fff', width: 20 }
                    : d < step
                    ? { backgroundColor: 'rgba(255,255,255,0.6)' }
                    : { backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Step 1 — Recipient */}
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>

            {/* mode toggle */}
            <View style={[styles.modeToggle, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              {(['BANK', 'TAG'] as TransferMode[]).map((m) => {
                const active = mode === m;
                return (
                  <Pressable
                    key={m}
                    style={[styles.modeBtn, active && { backgroundColor: palette.primary }]}
                    onPress={() => { setMode(m); setStep(1); setResolvedRecipient(null); }}
                  >
                    {m === 'BANK' ? (
                      <Landmark size={14} color={active ? '#fff' : palette.textSecondary} />
                    ) : (
                      <Smartphone size={14} color={active ? '#fff' : palette.textSecondary} />
                    )}
                    <Text style={[styles.modeBtnText, { color: active ? '#fff' : palette.textSecondary }]}>
                      {m === 'BANK' ? 'Bank account' : 'Inter-app'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'BANK' ? (
              <>
                {/* select bank */}
                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Bank</Text>
                <Pressable
                  style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}
                  onPress={() => setBankModalVisible(true)}
                >
                  {selectedBank ? (
                    <View style={styles.bankRow}>
                      <BankLogo name={selectedBank.name} slug={selectedBank.slug} bankCode={selectedBank.code} size={26} />
                      <Text style={[styles.inputText, { color: palette.text }]}>{selectedBank.name}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.inputPlaceholder, { color: palette.textSecondary }]}>Choose recipient bank…</Text>
                  )}
                  <ChevronDown size={16} color={palette.textSecondary} />
                </Pressable>

                {/* account number */}
                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Account number</Text>
                <View style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <TextInput
                    style={[styles.input, { color: palette.text }]}
                    placeholder="10-digit NUBAN number"
                    placeholderTextColor={palette.textSecondary}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                  />
                  {accountLookup.isLoading ? <ActivityIndicator color={palette.primary} size="small" /> : null}
                </View>

                {accountLookup.data?.accountName ? (
                  <View style={[styles.lookupBanner, { backgroundColor: 'rgba(48,209,88,0.1)', borderColor: 'rgba(48,209,88,0.3)' }]}>
                    <CheckCircle2 size={16} color="#30D158" />
                    <Text style={[styles.lookupName, { color: '#30D158' }]}>{accountLookup.data.accountName}</Text>
                  </View>
                ) : accountLookup.isError ? (
                  <View style={[styles.lookupBanner, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: 'rgba(255,69,58,0.25)' }]}>
                    <ShieldCheck size={16} color="#FF453A" />
                    <Text style={[styles.lookupName, { color: '#FF453A' }]}>Invalid account or bank combination</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {/* phone recipient */}
                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Recipient phone</Text>
                <View style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <TextInput
                    style={[styles.input, { color: palette.text }]}
                    placeholder="08012345678"
                    placeholderTextColor={palette.textSecondary}
                    keyboardType="phone-pad"
                    value={recipientPhone}
                    onChangeText={(val) => { setRecipientPhone(val); setResolvedRecipient(null); }}
                  />
                  <Pressable
                    style={[styles.verifyBtn, { backgroundColor: palette.primary }]}
                    onPress={() => void handleResolvePhone()}
                  >
                    {resolveRecipientMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Search size={14} color="#fff" />
                    )}
                  </Pressable>
                </View>

                {resolvedRecipient ? (
                  <View style={[styles.lookupBanner, { backgroundColor: 'rgba(48,209,88,0.1)', borderColor: 'rgba(48,209,88,0.3)' }]}>
                    <User size={16} color="#30D158" />
                    <Text style={[styles.lookupName, { color: '#30D158' }]}>{resolvedRecipient.fullName}</Text>
                  </View>
                ) : null}
              </>
            )}

            <Pressable onPress={handleContinueStep1} style={[styles.primaryAction, { backgroundColor: palette.primary }]}>
              <Text style={styles.primaryActionText}>Choose amount</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Step 2 — Amount */}
        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Landmark size={16} color={palette.primary} />
              </View>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Choose a quick amount or enter a custom value.
              </Text>
            </View>

            {/* recipient mini summary */}
            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Recipient</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>
                {mode === 'BANK' ? (accountLookup.data?.accountName ?? selectedBank?.name) : resolvedRecipient?.fullName}
              </Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>
                {mode === 'BANK' ? `${selectedBank?.name} · ${accountNumber}` : recipientPhone}
              </Text>
            </View>

            {/* preset amounts */}
            <View style={styles.amountGrid}>
              {presetAmounts.map((v) => {
                const active = activeAmount === String(v);
                return (
                  <Pressable
                    key={v}
                    onPress={() => setActiveAmount(String(v))}
                    style={({ pressed }) => [
                      styles.amountChip,
                      {
                        backgroundColor: active ? palette.text : palette.card,
                        borderColor: active ? palette.text : palette.border,
                        transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }],
                      },
                    ]}
                  >
                    <Text style={[styles.amountChipText, { color: active ? palette.card : palette.text }]}>
                      {formatNaira(v)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* custom amount */}
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Custom amount</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.currencyPrefix, { color: palette.primary }]}>₦</Text>
              <TextInput
                style={[styles.input, { color: palette.text, fontSize: Typography.lg, fontFamily: Typography.family.bold }]}
                placeholder="0"
                placeholderTextColor={palette.textSecondary}
                keyboardType="numeric"
                value={activeAmount}
                onChangeText={(val) => setActiveAmount(val.replace(/[^0-9]/g, ''))}
              />
            </View>

            <Text style={[styles.amountHint, { color: palette.textSecondary }]}>
              Wallet balance: {formatNaira(walletQuery.data?.balance ?? 0)}
            </Text>

            {/* optional note */}
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Note (optional)</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="e.g. Courier payment"
                placeholderTextColor={palette.textSecondary}
                value={mode === 'BANK' ? bankNote : tagNote}
                onChangeText={mode === 'BANK' ? setBankNote : setTagNote}
              />
            </View>

            <Pressable
              onPress={handleContinueStep2}
              disabled={!activeAmount}
              style={[styles.primaryAction, { backgroundColor: activeAmount ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>Review transfer</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Step 3 — Confirm */}
        {step === 3 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <CheckCircle2 size={16} color={palette.primary} />
              </View>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Review and confirm the transfer details.
              </Text>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>
                {mode === 'BANK' ? 'Bank transfer' : 'Inter-app transfer'}
              </Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>
                {mode === 'BANK' ? (accountLookup.data?.accountName ?? selectedBank?.name) : resolvedRecipient?.fullName}
              </Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>
                {mode === 'BANK' ? `${selectedBank?.name} · ${accountNumber}` : recipientPhone}
              </Text>
              <Text style={[styles.reviewAmount, { color: palette.text }]}>
                {formatNaira(Number(activeAmount))}
              </Text>
            </View>

            <Pressable
              disabled={bankTransferMutation.isPending || p2pTransferMutation.isPending}
              onPress={handleInitiate}
              style={[styles.primaryAction, { backgroundColor: palette.primary }]}
            >
              {bankTransferMutation.isPending || p2pTransferMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryActionText}>Confirm & Transfer</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Modals */}
      <BankPickerModal
        visible={bankModalVisible}
        onClose={() => setBankModalVisible(false)}
        onSelect={(b) => setSelectedBank(b)}
        selectedBankCode={selectedBank?.code}
        banks={banksQuery.data ?? []}
        banksLoading={banksQuery.isLoading}
      />

      <PaymentPinModal
        onBiometricPress={handleInitiate}
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onConfirm={handleConfirmPin}
        loading={bankTransferMutation.isPending || p2pTransferMutation.isPending}
      />

      <TransactionResultModal
        visible={resultModal.visible}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        amount={resultModal.amount}
        reference={resultModal.reference}
        onClose={() => {
          setResultModal((prev) => ({ ...prev, visible: false }));
          if (resultModal.type === 'success') router.back();
        }}
      />
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: 40, gap: Spacing.lg },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 4 },
  eyebrow: {
    textTransform: 'uppercase', letterSpacing: 1.2,
    fontSize: Typography.xs, fontFamily: Typography.family.bold,
  },

  hero: { borderRadius: 28, padding: Spacing.lg, gap: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroValue: { color: '#fff', fontSize: Typography.xl, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, width: 6, borderRadius: 3 },

  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepPill: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionSubtitle: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.regular },

  // mode toggle
  modeToggle: {
    flexDirection: 'row', borderRadius: 18, borderWidth: 1, padding: 4, gap: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm, borderRadius: 14,
  },
  modeBtnText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },

  fieldLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, minHeight: 52,
  },
  input: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  inputText: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  inputPlaceholder: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.regular },
  bankRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  lookupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: 14, borderWidth: 1,
  },
  lookupName: { fontSize: Typography.sm, fontFamily: Typography.family.bold, flex: 1 },

  verifyBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  currencyPrefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  amountHint: { fontSize: Typography.xs, fontFamily: Typography.family.regular },

  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountChip: {
    width: '30%', paddingVertical: 12, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  amountChipText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },

  summaryMini: { borderRadius: 16, borderWidth: 1, padding: Spacing.md, gap: 2 },
  summaryMiniLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  summaryMiniValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryMiniMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },

  reviewCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  reviewLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  reviewTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  reviewAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 4 },

  primaryAction: {
    minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
