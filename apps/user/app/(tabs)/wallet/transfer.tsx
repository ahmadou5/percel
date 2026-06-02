import { useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { ArrowLeft, ArrowUpRight, Banknote, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Search, SearchCheck, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { AmountInput } from '@/components/wallet/AmountInput';
import { normalizeNigerianPhone } from '@/components/wallet/WalletFlow';
import { FlowProgressDots, useSlideStepTransition } from '@/components/wallet/WalletFlowProgress';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  useAccountLookup,
  useBankTransfer,
  useBanks,
  useResolveTransferRecipient,
  useTransfer,
  useVerifyTransferPin,
  useWallet,
} from '@/hooks/useWallet';
import { formatNaira } from '@/lib/wallet';

const modes = [
  { key: 'BANK', label: 'Bank transfer', description: 'Send to a bank account' },
  { key: 'PHONE', label: 'Inter-app transfer', description: 'Send to another Percel user' },
] as const;

type Mode = (typeof modes)[number]['key'];

type BankItem = {
  name: string;
  code: string;
  slug?: string | null;
  longcode?: string | null;
};

type BankValidation = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
};

type RecipientValidation = {
  phone: string;
  fullName: string;
  walletId: string;
};

function modeLabel(mode: Mode) {
  return mode === 'BANK' ? 'Bank transfer' : 'Inter-app transfer';
}

function compactPhone(value: string) {
  const normalized = normalizeNigerianPhone(value);
  return normalized || 'Recipient will appear here';
}

export default function TransferScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const walletQuery = useWallet();
  const wallet = walletQuery.data;
  const banksQuery = useBanks();
  const bankTransfer = useBankTransfer();
  const interAppTransfer = useTransfer();
  const resolveRecipient = useResolveTransferRecipient();
  const pinVerify = useVerifyTransferPin();
  const [mode, setMode] = useState<Mode>('BANK');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [bankCode, setBankCode] = useState('044');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [recipientValidation, setRecipientValidation] = useState<RecipientValidation | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [recipientError, setRecipientError] = useState('');
  const [pinStatus, setPinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pinError, setPinError] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const accountDigits = accountNumber.replace(/\D/g, '');
  const bankLookup = useAccountLookup(accountDigits, bankCode);
  const { opacity, translateX } = useSlideStepTransition(step);

  const amountValue = Number(amount.replace(/,/g, ''));
  const normalizedPhone = normalizeNigerianPhone(phone);
  const banks = (banksQuery.data ?? []) as BankItem[];
  const selectedBank = banks.find((item) => item.code === bankCode) ?? { name: 'Select bank', code: bankCode };
  const filteredBanks = useMemo(() => {
    const term = bankSearch.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter((bank) => `${bank.name} ${bank.code} ${bank.slug ?? ''}`.toLowerCase().includes(term));
  }, [bankSearch, banks]);

  const bankValidation: BankValidation | null =
    bankLookup.data && bankLookup.data.bankCode === bankCode && bankLookup.data.accountNumber === accountDigits
      ? bankLookup.data
      : null;
  const recipientReady = mode === 'BANK' ? Boolean(bankValidation) : Boolean(recipientValidation);
  const amountValid = amountValue > 0 && (!wallet || amountValue <= wallet.balance);
  const pinReady = /^\d{4,6}$/.test(pin.trim()) && pinStatus === 'success';
  const canContinueToReview = recipientReady && amountValid;
  const canSend =
    recipientReady &&
    amountValid &&
    pinReady &&
    !bankTransfer.isPending &&
    !interAppTransfer.isPending;

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  useEffect(() => {
    setStep(1);
    setAmount('');
    setPin('');
    setPinStatus('idle');
    setPinError('');
    setRecipientValidation(null);
    setRecipientStatus('idle');
    setRecipientError('');
  }, [mode]);

  useEffect(() => {
    if (mode !== 'BANK' || step !== 1 || !bankValidation) return;
    setStep(2);
  }, [bankValidation, mode, step]);

  useEffect(() => {
    if (mode !== 'PHONE' || step !== 1 || !recipientValidation) return;
    setStep(2);
  }, [mode, recipientValidation, step]);

  useEffect(() => {
    setPinStatus('idle');
    setPinError('');
  }, [amount, mode, recipientValidation, bankValidation]);

  useEffect(() => {
    if (mode !== 'PHONE') return;
    const digits = normalizedPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setRecipientValidation(null);
      setRecipientStatus('idle');
      setRecipientError('');
      return;
    }

    const timer = setTimeout(() => {
      setRecipientStatus('loading');
      void resolveRecipient.mutateAsync({ phone: normalizedPhone }).then((response) => {
        const result = response.data;
        setRecipientValidation({ phone: result.phone, fullName: result.fullName, walletId: result.walletId });
        setRecipientStatus('success');
        setRecipientError('');
      }).catch((error) => {
        setRecipientValidation(null);
        setRecipientStatus('error');
        setRecipientError(error instanceof Error ? error.message : 'We could not find that recipient on Percel.');
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [mode, normalizedPhone, resolveRecipient]);

  const headerBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as 1 | 2 | 3);
      return;
    }
    router.back();
  };

  const handleVerifyPin = async () => {
    const trimmed = pin.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setPinStatus('error');
      setPinError('Use a 4 to 6 digit transfer PIN.');
      return;
    }

    setPinStatus('loading');
    setPinError('');
    try {
      const result = await pinVerify.mutateAsync({ pin: trimmed });
      if (!result.data.verified) {
        setPinStatus('error');
        setPinError('That PIN is not valid.');
        return;
      }
      setPinStatus('success');
    } catch (error) {
      setPinStatus('error');
      setPinError(error instanceof Error ? error.message : 'Unable to verify the PIN.');
    }
  };

  const handleSend = async () => {
    if (!canSend) return;

    try {
      if (mode === 'BANK') {
        if (!bankValidation) return;
        await bankTransfer.mutateAsync({
          bankCode,
          accountNumber: bankValidation.accountNumber,
          amount: amountValue,
          pin: pin.trim(),
        });
        Alert.alert('Transfer sent', `${formatNaira(amountValue)} sent to ${bankValidation.accountName}.`);
      } else {
        if (!recipientValidation) return;
        await interAppTransfer.mutateAsync({
          toPhone: recipientValidation.phone,
          amount: amountValue,
          pin: pin.trim(),
        });
        Alert.alert('Transfer sent', `${formatNaira(amountValue)} sent to ${recipientValidation.fullName}.`);
      }

      router.back();
    } catch (error) {
      Alert.alert('Transfer failed', error instanceof Error ? error.message : 'Unable to complete transfer.');
    }
  };

  const currentRecipient = mode === 'BANK'
    ? bankValidation
      ? `${bankValidation.accountName} • ${bankValidation.bankName}`
      : selectedBank.name
    : recipientValidation?.fullName ?? compactPhone(phone);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={headerBack} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Send money</Text>
        <Text style={[styles.title, { color: palette.text }]}>Move money in three steps without keeping old forms on screen.</Text>
      </View>

      <View style={[styles.heroCard, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Active flow</Text>
            <Text style={styles.heroValue}>{modeLabel(mode)}</Text>
          </View>
          <View style={styles.heroIcon}>
            <ArrowUpRight size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>{mode === 'BANK' ? 'Resolve the bank account first, then enter the amount, then review and confirm.' : 'Resolve the recipient first, then enter the amount, then review and confirm.'}</Text>
        <FlowProgressDots currentStep={step} totalSteps={3} />
      </View>

      <View style={styles.modeRow}>
        {modes.map((item) => {
          const active = item.key === mode;
          return (
            <Pressable
              key={item.key}
              onPress={() => setMode(item.key)}
              style={[styles.modeCard, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}
            >
              <Text style={[styles.modeLabel, { color: active ? palette.card : palette.text }]}>{item.label}</Text>
              <Text style={[styles.modeMeta, { color: active ? 'rgba(255,255,255,0.76)' : palette.textSecondary }]}>{item.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View style={{ opacity, transform: [{ translateX }] }}>
        {step === 1 ? (
          mode === 'BANK' ? (
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                  <CreditCard size={16} color={palette.primary} />
                </View>
                <View style={styles.sectionCopy}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Bank lookup</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Choose a bank and enter the account number. The lookup runs automatically after a short pause.</Text>
                </View>
              </View>

              {!wallet?.kycComplete ? (
                <StateCard
                  title="KYC required for bank payouts"
                  description="Complete KYC in Settings before you can send to a bank account. Inter-app transfers still work."
                  icon={<ShieldCheck size={24} color={palette.textSecondary} />}
                  actionLabel="Complete KYC"
                  onActionPress={() => router.push('/settings/kyc')}
                />
              ) : null}

              <Pressable
                disabled={!wallet?.kycComplete}
                onPress={() => setBankPickerOpen(true)}
                style={[styles.selectRow, { backgroundColor: palette.bg, borderColor: palette.border, opacity: wallet?.kycComplete ? 1 : 0.5 }]}
              >
                <View style={styles.selectCopy}>
                  <Text style={[styles.selectLabel, { color: palette.textSecondary }]}>Bank</Text>
                  <View style={styles.selectValueRow}>
                    <Text style={[styles.selectValue, { color: palette.text }]}>{selectedBank.name}</Text>
                    <Text style={[styles.selectMeta, { color: palette.textSecondary }]}>{selectedBank.code}</Text>
                  </View>
                </View>
                <ChevronDown size={18} color={palette.textSecondary} />
              </Pressable>

              <Input
                label="Account number"
                value={accountNumber}
                onChangeText={(text) => {
                  setAccountNumber(text.replace(/\s/g, ''));
                  setPinStatus('idle');
                  setPinError('');
                }}
                keyboardType="number-pad"
                placeholder="0123456789"
                leftElement={<CreditCard size={16} color={palette.textSecondary} />}
                helperText="The next step unlocks when the account resolves successfully."
              />

              {!wallet?.kycComplete ? null : bankLookup.isFetching ? (
                <StateCard loading title="Resolving account" description="Checking the bank and beneficiary name now." icon={<Search size={24} color={palette.textSecondary} />} />
              ) : bankLookup.isError ? (
                <StateCard
                  title="Account lookup failed"
                  description="Choose the correct bank, then enter the account number again."
                  icon={<ShieldCheck size={24} color={palette.textSecondary} />}
                />
              ) : bankValidation ? (
                <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
                  <CheckCircle2 size={18} color={palette.success} />
                  <View style={styles.statusCopy}>
                    <Text style={[styles.statusTitle, { color: palette.success }]}>{bankValidation.accountName}</Text>
                    <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{bankValidation.bankName}</Text>
                    <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{bankValidation.accountNumber}</Text>
                  </View>
                </View>
              ) : (
                <StateCard
                  title="Enter a complete account number"
                  description="The lookup needs a valid bank and a 10-digit account number."
                  icon={<SearchCheck size={24} color={palette.textSecondary} />}
                />
              )}
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                  <Smartphone size={16} color={palette.primary} />
                </View>
                <View style={styles.sectionCopy}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Recipient lookup</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Enter the Percel phone number and we will resolve the recipient automatically.</Text>
                </View>
              </View>

              <Input
                label="Recipient phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+2348012345678"
                leftElement={<Smartphone size={16} color={palette.textSecondary} />}
                helperText="The next step unlocks when the recipient is found."
              />

              {recipientStatus === 'loading' ? (
                <StateCard loading title="Looking up recipient" description="Checking the phone number in Percel's database." icon={<Search size={24} color={palette.textSecondary} />} />
              ) : recipientStatus === 'success' && recipientValidation ? (
                <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
                  <CheckCircle2 size={18} color={palette.success} />
                  <View style={styles.statusCopy}>
                    <Text style={[styles.statusTitle, { color: palette.success }]}>{recipientValidation.fullName}</Text>
                    <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{recipientValidation.phone}</Text>
                  </View>
                </View>
              ) : recipientStatus === 'error' ? (
                <View style={[styles.statusCard, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: palette.error }]}>
                  <ShieldCheck size={18} color={palette.error} />
                  <View style={styles.statusCopy}>
                    <Text style={[styles.statusTitle, { color: palette.error }]}>Recipient not found</Text>
                    <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{recipientError || 'Enter a different Percel phone number.'}</Text>
                  </View>
                </View>
              ) : (
                <StateCard
                  title="Enter a Percel phone number"
                  description="We verify the phone number before the amount step appears."
                  icon={<SearchCheck size={24} color={palette.textSecondary} />}
                />
              )}
            </View>
          )
        ) : null}

        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Banknote size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Amount</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Add the transfer amount. Completed lookup details remain collapsed out of view.</Text>
              </View>
            </View>

            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Recipient</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>{currentRecipient}</Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{mode === 'BANK' ? accountDigits || 'Account pending' : compactPhone(phone)}</Text>
            </View>

            <AmountInput
              label="Transfer amount"
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
              helperText={wallet ? `Available balance: ${formatNaira(wallet.balance)}` : 'Load wallet balance to compare your amount.'}
            />

            {!amountValid && amountValue > 0 ? (
              <View style={[styles.statusCard, { backgroundColor: 'rgba(255,149,0,0.08)', borderColor: palette.warning }]}>
                <Banknote size={18} color={palette.warning} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: palette.warning }]}>Amount not ready</Text>
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{wallet && amountValue > wallet.balance ? 'This amount is higher than your wallet balance.' : 'Enter a positive numeric amount.'}</Text>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() => setStep(3)}
              disabled={!canContinueToReview}
              style={[styles.primaryAction, { backgroundColor: canContinueToReview ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>Review transfer</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: pinStatus === 'success' ? 'rgba(48,209,88,0.12)' : 'rgba(10,132,255,0.08)', borderColor: pinStatus === 'success' ? palette.success : palette.primary }]}>
                <CheckCircle2 size={16} color={pinStatus === 'success' ? palette.success : palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Review</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Confirm the recipient, verify your PIN, then send.</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Recipient</Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>{currentRecipient}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{mode === 'BANK' ? bankValidation?.accountNumber ?? accountDigits : recipientValidation?.phone ?? compactPhone(phone)}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{formatNaira(amountValue)}</Text>
            </View>

            <Input
              label="Transfer PIN"
              value={pin}
              onChangeText={(text) => {
                setPin(text.replace(/\s/g, ''));
                setPinStatus('idle');
                setPinError('');
              }}
              placeholder="1234"
              keyboardType="number-pad"
              secureTextEntry
              secureToggle
              helperText="Use the PIN you set in Profile."
            />

            <Pressable
              onPress={() => void handleVerifyPin()}
              disabled={pinVerify.isPending || !/^\d{4,6}$/.test(pin.trim())}
              style={[styles.secondaryAction, { backgroundColor: palette.primary, opacity: /^\d{4,6}$/.test(pin.trim()) ? 1 : 0.45 }]}
            >
              {pinStatus === 'loading' ? <ActivityIndicator color={palette.card} /> : <SearchCheck size={18} color={palette.card} />}
              <Text style={styles.secondaryActionText}>{pinStatus === 'success' ? 'PIN verified' : 'Verify PIN'}</Text>
            </Pressable>
            {pinError ? <Text style={[styles.errorText, { color: palette.error }]}>{pinError}</Text> : null}
            {pinStatus === 'success' ? (
              <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
                <CheckCircle2 size={18} color={palette.success} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: palette.success }]}>PIN verified</Text>
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>You can now send the transfer.</Text>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() => void handleSend()}
              disabled={!canSend}
              style={[styles.primaryAction, { backgroundColor: canSend ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>{bankTransfer.isPending || interAppTransfer.isPending ? 'Sending…' : 'Send money'}</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      <Modal visible={bankPickerOpen} transparent animationType="fade" onRequestClose={() => setBankPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBankPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a bank</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Search the bank list to switch the recipient bank.</Text>
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
                      setAccountNumber('');
                      setPinStatus('idle');
                      setPinError('');
                      setBankPickerOpen(false);
                    }}
                    style={[styles.bankRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg }]}
                  >
                    <View style={styles.bankRowCopy}>
                      <Text style={[styles.bankRowName, { color: palette.text }]}>{item.name}</Text>
                      <Text style={[styles.bankRowMeta, { color: palette.textSecondary }]}>{item.code}{item.slug ? ` • ${item.slug}` : ''}</Text>
                    </View>
                    <ChevronRight size={16} color={palette.textSecondary} />
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
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: Spacing.md, gap: 4 },
  modeLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modeMeta: { fontSize: Typography.xs, lineHeight: 16 },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepPill: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sectionSubtitle: { fontSize: Typography.xs, lineHeight: 17 },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, minHeight: 64 },
  selectCopy: { flex: 1, gap: 4 },
  selectLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  selectValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  selectMeta: { fontSize: Typography.xs },
  statusCard: { borderWidth: 1, borderRadius: 18, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusMeta: { fontSize: Typography.xs, lineHeight: 16 },
  summaryMini: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  summaryMiniLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryMiniValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryMiniMeta: { fontSize: Typography.xs },
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  reviewLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  reviewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.xs },
  primaryAction: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondaryAction: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  errorText: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, minHeight: 54 },
  searchInput: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.medium },
  bankList: { marginTop: 4 },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  bankRowCopy: { flex: 1 },
  bankRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  bankRowMeta: { fontSize: Typography.xs },
  emptyText: { fontSize: Typography.sm, textAlign: 'center', paddingVertical: 18 },
});
