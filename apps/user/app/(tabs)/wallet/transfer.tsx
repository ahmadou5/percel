import { useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { ArrowLeft, ArrowUpRight, Banknote, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Search, SearchCheck, Smartphone, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  useBankTransfer,
  useBanks,
  useResolveBankAccount,
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
};

type RecipientValidation = {
  phone: string;
  fullName: string;
  walletId: string;
};

function normalizeNigerianPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('234') && digits.length === 13) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  return trimmed;
}

function formatPhoneLabel(value: string) {
  const normalized = normalizeNigerianPhone(value);
  if (!normalized) return 'Recipient will appear here';
  return normalized;
}

function sectionTone(active: boolean, complete: boolean, palette: (typeof Colors)[keyof typeof Colors]) {
  if (complete) return { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success, textColor: palette.success };
  if (active) return { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary, textColor: palette.primary };
  return { backgroundColor: palette.bg, borderColor: palette.border, textColor: palette.textSecondary };
}

export default function TransferScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const walletQuery = useWallet();
  const phoneMutation = useTransfer();
  const banksQuery = useBanks();
  const bankResolve = useResolveBankAccount();
  const phoneResolve = useResolveTransferRecipient();
  const bankMutation = useBankTransfer();
  const pinVerify = useVerifyTransferPin();
  const [mode, setMode] = useState<Mode>('BANK');
  const [phone, setPhone] = useState('');
  const [bankCode, setBankCode] = useState('044');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankValidation, setBankValidation] = useState<BankValidation | null>(null);
  const [bankValidationStatus, setBankValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bankValidationError, setBankValidationError] = useState('');
  const [recipientValidation, setRecipientValidation] = useState<RecipientValidation | null>(null);
  const [recipientValidationStatus, setRecipientValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [recipientValidationError, setRecipientValidationError] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('Waybill support');
  const [pin, setPin] = useState('');
  const [pinValidationStatus, setPinValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pinValidationError, setPinValidationError] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const bankValidationSeq = useRef(0);
  const recipientValidationSeq = useRef(0);
  const pinValidationSeq = useRef(0);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const wallet = walletQuery.data;
  const amountValue = Number(amount.replace(/,/g, ''));
  const accountDigits = accountNumber.replace(/\D/g, '');
  const kycReady = Boolean(wallet?.kycComplete);
  const banks = (banksQuery.data ?? []) as BankItem[];
  const selectedBank = banks.find((item) => item.code === bankCode) ?? { name: 'Select bank', code: bankCode, slug: null, longcode: null };
  const filteredBanks = useMemo(() => {
    const term = bankSearch.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter((bank) => `${bank.name} ${bank.code} ${bank.slug ?? ''}`.toLowerCase().includes(term));
  }, [bankSearch, banks]);

  const recipientReady = mode === 'BANK' ? Boolean(bankValidation) : Boolean(recipientValidation);
  const recipientReference = mode === 'BANK' ? `${bankValidation?.bankName ?? selectedBank.name} • ${bankValidation?.accountNumber ?? (accountDigits || 'pending')}` : formatPhoneLabel(recipientValidation?.phone ?? phone);
  const amountValid = amountValue > 0 && (!wallet || amountValue <= wallet.balance);
  const pinReady = amountValid && recipientReady && pinValidationStatus === 'success';
  const canSend = pinReady && !bankMutation.isPending && !phoneMutation.isPending;

  const resetBankValidation = useCallback(() => {
    bankValidationSeq.current += 1;
    setBankValidation(null);
    setBankValidationStatus('idle');
    setBankValidationError('');
    setPinValidationStatus('idle');
    setPinValidationError('');
  }, []);

  const resetRecipientValidation = useCallback(() => {
    recipientValidationSeq.current += 1;
    setRecipientValidation(null);
    setRecipientValidationStatus('idle');
    setRecipientValidationError('');
    setPinValidationStatus('idle');
    setPinValidationError('');
  }, []);

  const resetPinValidation = useCallback(() => {
    pinValidationSeq.current += 1;
    setPinValidationStatus('idle');
    setPinValidationError('');
  }, []);

  const validateBankAccount = useCallback(async () => {
    if (!kycReady || accountDigits.length < 10 || !selectedBank.code) return;
    const requestId = ++bankValidationSeq.current;
    setBankValidationStatus('loading');
    setBankValidationError('');
    setPinValidationStatus('idle');
    setPinValidationError('');

    try {
      const response = await bankResolve.mutateAsync({ bankCode, accountNumber: accountDigits });
      if (bankValidationSeq.current !== requestId) return;
      setBankValidation({
        bankName: response.data.bankName,
        accountName: response.data.accountName,
        accountNumber: response.data.accountNumber,
      });
      setBankValidationStatus('success');
    } catch (error) {
      if (bankValidationSeq.current !== requestId) return;
      setBankValidation(null);
      setBankValidationStatus('error');
      setBankValidationError(error instanceof Error ? error.message : 'Please check the bank and account number.');
    }
  }, [accountDigits, bankCode, bankResolve, kycReady, selectedBank.code]);

  const validateRecipientPhone = useCallback(async () => {
    const normalizedPhone = normalizeNigerianPhone(phone);
    if (normalizedPhone.length < 10) return;
    const requestId = ++recipientValidationSeq.current;
    setRecipientValidationStatus('loading');
    setRecipientValidationError('');
    setPinValidationStatus('idle');
    setPinValidationError('');

    try {
      const response = await phoneResolve.mutateAsync({ phone: normalizedPhone });
      if (recipientValidationSeq.current !== requestId) return;
      setRecipientValidation({
        phone: response.data.phone,
        fullName: response.data.fullName,
        walletId: response.data.walletId,
      });
      setRecipientValidationStatus('success');
    } catch (error) {
      if (recipientValidationSeq.current !== requestId) return;
      setRecipientValidation(null);
      setRecipientValidationStatus('error');
      setRecipientValidationError(error instanceof Error ? error.message : 'We could not find that recipient on Percel.');
    }
  }, [phone, phoneResolve]);

  const validateTransferPin = useCallback(async () => {
    const trimmed = pin.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setPinValidationStatus('error');
      setPinValidationError('Use a 4 to 6 digit transfer PIN.');
      return;
    }

    const requestId = ++pinValidationSeq.current;
    setPinValidationStatus('loading');
    setPinValidationError('');

    try {
      const response = await pinVerify.mutateAsync({ pin: trimmed });
      if (pinValidationSeq.current !== requestId) return;
      if (!response.data.verified) {
        setPinValidationStatus('error');
        setPinValidationError('That PIN is not valid.');
        return;
      }
      setPinValidationStatus('success');
    } catch (error) {
      if (pinValidationSeq.current !== requestId) return;
      setPinValidationStatus('error');
      setPinValidationError(error instanceof Error ? error.message : 'Unable to verify the PIN.');
    }
  }, [pin, pinVerify]);

  const submit = useCallback(async () => {
    if (!canSend) return;

    try {
      const amountNumber = amountValue;
      const description = note.trim() || undefined;
      const transferPin = pin.trim();

      if (mode === 'BANK') {
        if (!bankValidation) return;
        await bankMutation.mutateAsync({
          bankCode,
          accountNumber: bankValidation.accountNumber,
          amount: amountNumber,
          description,
          pin: transferPin,
        });
        Alert.alert('Transfer sent', `${formatNaira(amountNumber)} sent to ${bankValidation.accountName}.`);
      } else {
        if (!recipientValidation) return;
        await phoneMutation.mutateAsync({
          toPhone: recipientValidation.phone,
          amount: amountNumber,
          description,
          pin: transferPin,
        });
        Alert.alert('Transfer sent', `${formatNaira(amountNumber)} sent to ${recipientValidation.fullName}.`);
      }

      router.back();
    } catch (error) {
      Alert.alert('Transfer failed', error instanceof Error ? error.message : 'Unable to complete transfer.');
    }
  }, [amountValue, bankCode, bankMutation, bankValidation, canSend, mode, note, pin, phoneMutation, recipientValidation, router]);

  useEffect(() => {
    if (mode !== 'BANK') return;
    if (!kycReady || accountDigits.length < 10 || !selectedBank.code) {
      resetBankValidation();
      return;
    }

    const timer = setTimeout(() => {
      void validateBankAccount();
    }, 500);

    return () => clearTimeout(timer);
  }, [accountDigits, kycReady, mode, resetBankValidation, selectedBank.code, validateBankAccount]);

  useEffect(() => {
    if (mode !== 'PHONE') return;
    const normalizedPhone = normalizeNigerianPhone(phone);
    if (normalizedPhone.replace(/\D/g, '').length < 10) {
      resetRecipientValidation();
      return;
    }

    const timer = setTimeout(() => {
      void validateRecipientPhone();
    }, 500);

    return () => clearTimeout(timer);
  }, [mode, phone, resetRecipientValidation, validateRecipientPhone]);

  useEffect(() => {
    resetPinValidation();
  }, [amount, mode, resetPinValidation]);

  const bankStatusTone = sectionTone(true, bankValidationStatus === 'success', palette);
  const phoneStatusTone = sectionTone(true, recipientValidationStatus === 'success', palette);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ArrowLeft size={20} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Send money</Text>
        <Text style={[styles.title, { color: palette.text }]}>Instant transfers to any Nigerian bank.</Text>
      </View>

      <View style={[styles.heroCard, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Current mode</Text>
            <Text style={styles.heroValue}>{mode === 'BANK' ? 'Bank transfer' : 'Inter-app transfer'}</Text>
          </View>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <ArrowUpRight size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>{mode === 'BANK' ? 'Enter the account number, let the app resolve the bank account, then continue step by step.' : 'Enter a Percel phone number, resolve the recipient, then continue step by step.'}</Text>
      </View>

      <View style={styles.modeRow}>
        {modes.map((item) => {
          const active = item.key === mode;
          return (
            <Pressable key={item.key} onPress={() => {
              setMode(item.key);
              resetBankValidation();
              resetRecipientValidation();
              resetPinValidation();
              setAmount('');
            }} style={[styles.modeCard, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
              <Text style={[styles.modeLabel, { color: active ? palette.card : palette.text }]}>{item.label}</Text>
              <Text style={[styles.modeMeta, { color: active ? 'rgba(255,255,255,0.76)' : palette.textSecondary }]}>{item.description}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'BANK' ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: bankStatusTone.backgroundColor, borderColor: bankStatusTone.borderColor }]}>
              <Text style={[styles.stepBadgeText, { color: bankStatusTone.textColor }]}>1</Text>
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Recipient details</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Select a bank, enter the account number, then let the app resolve it automatically.</Text>
            </View>
            {bankValidationStatus === 'success' ? <CheckCircle2 size={18} color={palette.success} /> : null}
          </View>

          {!kycReady ? (
            <StateCard
              title="KYC required for bank payouts"
              description="Complete KYC in Settings before you can send to a bank account. Inter-app transfers still work."
              icon={<CreditCard size={24} color={palette.textSecondary} />}
              actionLabel="Complete KYC"
              onActionPress={() => router.push('/settings/kyc')}
            />
          ) : null}

          <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Bank name</Text>
          <Pressable
            disabled={!kycReady}
            onPress={() => setBankPickerOpen(true)}
            style={[styles.dropdownSelect, { backgroundColor: palette.bg, borderColor: palette.border, marginBottom: 14, opacity: kycReady ? 1 : 0.45 }]}
          >
            <View style={styles.dropdownSelectCopy}>
              {selectedBank.name !== 'Select bank' ? (
                <View style={styles.dropdownValueRow}>
                  <View style={[styles.bankLogoPlaceholder, { backgroundColor: palette.primary }]}>
                    <Text style={[styles.bankLogoText, { color: palette.card }]}>{selectedBank.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text style={[styles.dropdownValueName, { color: palette.text }]}>{selectedBank.name}</Text>
                    <Text style={[styles.dropdownValueMeta, { color: palette.textSecondary }]}>{selectedBank.code}</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.dropdownPlaceholder, { color: palette.textSecondary }]}>Choose beneficiary bank</Text>
              )}
            </View>
            <ChevronDown size={18} color={palette.textSecondary} />
          </Pressable>

          <Input
            label="Account number"
            value={accountNumber}
            onChangeText={(text) => {
              setAccountNumber(text.replace(/\s/g, ''));
              resetBankValidation();
            }}
            keyboardType="number-pad"
            placeholder="0123456789"
            leftElement={<CreditCard size={16} color={palette.textSecondary} />}
            rightElement={
              <Pressable
                onPress={() => void validateBankAccount()}
                disabled={bankResolve.isPending || accountDigits.length < 10 || !kycReady}
                style={[styles.inlineAction, { backgroundColor: palette.text, opacity: kycReady ? 1 : 0.45 }]}
              >
                <SearchCheck size={16} color={palette.card} />
                <Text style={[styles.inlineActionText, { color: palette.card }]}>{bankValidationStatus === 'loading' ? 'Checking…' : bankValidationStatus === 'success' ? 'Revalidate' : 'Validate'}</Text>
              </Pressable>
            }
            helperText="The account will be validated automatically once the number looks complete."
          />

          {bankValidationStatus === 'loading' ? (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
              <ActivityIndicator color={palette.primary} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.text }]}>Resolving account</Text>
                <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>Checking the bank and beneficiary name now.</Text>
              </View>
            </View>
          ) : bankValidationStatus === 'success' && bankValidation ? (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
              <CheckCircle2 size={18} color={palette.success} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.success }]}>{bankValidation.accountName}</Text>
                <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{bankValidation.bankName} • {bankValidation.accountNumber}</Text>
              </View>
            </View>
          ) : bankValidationStatus === 'error' ? (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: palette.error }]}>
              <ShieldCheck size={18} color={palette.error} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.error }]}>Account lookup failed</Text>
                <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{bankValidationError || 'Choose the correct bank, then validate again.'}</Text>
              </View>
              <Pressable onPress={() => setBankPickerOpen(true)} style={[styles.inlineAction, { backgroundColor: palette.primary }]}>
                <Text style={[styles.inlineActionText, { color: palette.card }]}>Pick bank</Text>
              </Pressable>
            </View>
          ) : (
            <StateCard
              title="Validate the account"
              description="The next step stays locked until we resolve the beneficiary name."
              icon={<CreditCard size={24} color={palette.textSecondary} />}
            />
          )}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: phoneStatusTone.backgroundColor, borderColor: phoneStatusTone.borderColor }]}>
              <Text style={[styles.stepBadgeText, { color: phoneStatusTone.textColor }]}>1</Text>
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Recipient details</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Enter the phone number, then resolve the recipient from Percel&apos;s database.</Text>
            </View>
            {recipientValidationStatus === 'success' ? <CheckCircle2 size={18} color={palette.success} /> : null}
          </View>

          <Input
            label="Recipient phone"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              resetRecipientValidation();
            }}
            keyboardType="phone-pad"
            placeholder="+2348012345678"
            leftElement={<Smartphone size={16} color={palette.textSecondary} />}
            rightElement={
              <Pressable
                onPress={() => void validateRecipientPhone()}
                disabled={phoneResolve.isPending || normalizeNigerianPhone(phone).replace(/\D/g, '').length < 10}
                style={[styles.inlineAction, { backgroundColor: palette.text, opacity: 1 }]}
              >
                <SearchCheck size={16} color={palette.card} />
                <Text style={[styles.inlineActionText, { color: palette.card }]}>{recipientValidationStatus === 'loading' ? 'Checking…' : recipientValidationStatus === 'success' ? 'Revalidate' : 'Validate'}</Text>
              </Pressable>
            }
            helperText="We verify this number against the Percel database before the amount step appears."
          />

          <View style={[styles.previewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Text style={[styles.previewLabel, { color: palette.textSecondary }]}>Recipient preview</Text>
            <Text style={[styles.previewValue, { color: palette.text }]}>{recipientValidation?.fullName ?? formatPhoneLabel(phone)}</Text>
          </View>

          {recipientValidationStatus === 'loading' ? (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
              <ActivityIndicator color={palette.primary} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.text }]}>Looking up recipient</Text>
                <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>Checking the phone number in Percel&apos;s user database.</Text>
              </View>
            </View>
          ) : recipientValidationStatus === 'success' && recipientValidation ? (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
              <CheckCircle2 size={18} color={palette.success} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.success }]}>{recipientValidation.fullName}</Text>
                <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{recipientValidation.phone}</Text>
              </View>
            </View>
          ) : recipientValidationStatus === 'error' ? (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: palette.error }]}>
              <ShieldCheck size={18} color={palette.error} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.error }]}>Recipient not found</Text>
                <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{recipientValidationError || 'Enter a different Percel phone number.'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {recipientReady ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: amountValid ? 'rgba(48,209,88,0.12)' : 'rgba(10,132,255,0.08)', borderColor: amountValid ? palette.success : palette.primary }]}>
              <Text style={[styles.stepBadgeText, { color: amountValid ? palette.success : palette.primary }]}>2</Text>
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Amount</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Enter a valid amount to unlock PIN verification.</Text>
            </View>
            {amountValid ? <CheckCircle2 size={18} color={palette.success} /> : null}
          </View>

          <Input
            label="Transfer amount"
            value={amount}
            onChangeText={(text) => {
              setAmount(text.replace(/[^0-9]/g, ''));
              resetPinValidation();
            }}
            placeholder="0"
            keyboardType="number-pad"
            leftElement={<Text style={[styles.prefix, { color: palette.textSecondary }]}>₦</Text>}
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

          <Input
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="What is this for?"
            helperText="Optional transfer note for receipts and notifications."
          />
        </View>
      ) : null}

      {amountValid ? (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepBadge, { backgroundColor: pinValidationStatus === 'success' ? 'rgba(48,209,88,0.12)' : 'rgba(10,132,255,0.08)', borderColor: pinValidationStatus === 'success' ? palette.success : palette.primary }]}>
              <Text style={[styles.stepBadgeText, { color: pinValidationStatus === 'success' ? palette.success : palette.primary }]}>3</Text>
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Transfer PIN</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Validate your PIN before the send button activates.</Text>
            </View>
            {pinValidationStatus === 'success' ? <CheckCircle2 size={18} color={palette.success} /> : null}
          </View>

          <Input
            label="Transfer PIN"
            value={pin}
            onChangeText={(text) => {
              setPin(text.replace(/\s/g, ''));
              resetPinValidation();
            }}
            placeholder="1234"
            keyboardType="number-pad"
            secureTextEntry
            secureToggle
            helperText="Use the PIN you set in Profile."
          />

          <Pressable onPress={() => void validateTransferPin()} disabled={pinVerify.isPending || !/^\d{4,6}$/.test(pin.trim())} style={[styles.pinButton, { backgroundColor: palette.primary, opacity: /^\d{4,6}$/.test(pin.trim()) ? 1 : 0.45 }]}>
            {pinValidationStatus === 'loading' ? <ActivityIndicator color={palette.card} /> : <Text style={[styles.pinButtonText, { color: palette.card }]}>{pinValidationStatus === 'success' ? 'PIN verified' : 'Validate PIN'}</Text>}
          </Pressable>

          {pinValidationStatus === 'error' ? <Text style={[styles.pinError, { color: palette.error }]}>{pinValidationError}</Text> : null}
          {pinValidationStatus === 'success' ? (
            <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
              <CheckCircle2 size={18} color={palette.success} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.success }]}>PIN verified</Text>
                <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>You can now send the transfer.</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {pinReady ? (
        <View style={[styles.summaryCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Ready to send</Text>
          <Text style={[styles.summaryAmount, { color: palette.text }]}>{formatNaira(amountValue)}</Text>
          <Text style={[styles.summaryMeta, { color: palette.textSecondary }]}>{mode === 'BANK' ? bankValidation?.accountName : recipientValidation?.fullName}</Text>
          <Text style={[styles.summaryMeta, { color: palette.textSecondary }]}>{recipientReference}</Text>
        </View>
      ) : null}

      <Pressable onPress={() => void submit()} disabled={!canSend} style={[styles.primary, { backgroundColor: canSend ? palette.primary : palette.border }]}>
        <Text style={styles.primaryText}>{mode === 'BANK' ? 'Send to bank' : 'Send money'}</Text>
      </Pressable>

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
                      setBankPickerOpen(false);
                      resetBankValidation();
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
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
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
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: Spacing.md, gap: 4 },
  modeLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modeMeta: { fontSize: Typography.xs, lineHeight: 16 },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sectionHeaderCopy: { flex: 1, gap: 3 },
  stepBadge: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sectionSubtitle: { fontSize: Typography.xs, lineHeight: 17 },
  inputLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, minHeight: 64 },
  dropdownSelectCopy: { flex: 1 },
  dropdownValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropdownValueName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  dropdownValueMeta: { fontSize: Typography.xs },
  dropdownPlaceholder: { fontSize: Typography.md, fontFamily: Typography.family.medium },
  bankLogoPlaceholder: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bankLogoText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  prefix: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  statusCard: { borderWidth: 1, borderRadius: 18, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusMeta: { fontSize: Typography.xs, lineHeight: 16 },
  previewCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  previewLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Typography.family.bold },
  previewValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  inlineAction: { minHeight: 38, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  inlineActionText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  pinButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  pinButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  pinError: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  summaryCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 4 },
  summaryLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Typography.family.bold },
  summaryAmount: { fontSize: 26, fontFamily: Typography.family.bold },
  summaryMeta: { fontSize: Typography.sm, lineHeight: 18 },
  primary: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, minHeight: 54 },
  searchInput: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  emptyText: { fontSize: Typography.sm, textAlign: 'center', paddingVertical: 18 },
  bankList: { maxHeight: 340 },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  bankRowCopy: { flex: 1, gap: 2 },
  bankRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  bankRowMeta: { fontSize: Typography.xs },
});
