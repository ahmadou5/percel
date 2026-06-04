import { useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { ArrowLeft, ArrowUpRight, Banknote, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Search, SearchCheck, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { AmountInput } from '@/components/wallet/AmountInput';
import { normalizeNigerianPhone } from '@/components/wallet/WalletFlow';
import { FlowProgressDots, useSlideStepTransition, useStepBackHandler } from '@/components/wallet/WalletFlowProgress';
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
import { TransactionResultModal } from '@/components/TransactionResultModal';

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
  avatarUrl?: string | null;
};

function modeLabel(mode: Mode) {
  return mode === 'BANK' ? 'Bank transfer' : 'Inter-app transfer';
}

function compactPhone(value: string) {
  const normalized = normalizeNigerianPhone(value);
  return normalized || 'Recipient will appear here';
}

function formatNigerianPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '—';

  const localDigits = digits.startsWith('234') && digits.length >= 13
    ? digits.slice(3)
    : digits.startsWith('0') && digits.length >= 11
      ? digits.slice(1)
      : digits.length === 10
        ? digits
        : digits.slice(-10);

  if (localDigits.length < 10) return localDigits;
  return `${localDigits.slice(0, 3)} ${localDigits.slice(3, 6)} ${localDigits.slice(6, 10)}`;
}

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
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
  const { mutateAsync: resolveRecipientAsync } = useResolveTransferRecipient();
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
  const [pinStatus, setPinStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pinError, setPinError] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferReceipt, setTransferReceipt] = useState<{
    reference: string;
    amount: number;
    mode: Mode;
    recipientName: string;
    recipientAvatarUrl?: string | null;
    recipientPhone?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  } | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptResult, setReceiptResult] = useState<null | { visible: boolean; type: 'success' | 'failed' | 'pending'; title: string; message: string; amount?: string; reference?: string }>(null);
  const lookupAttemptRef = useRef(0);
  const submissionAttemptRef = useRef(false);
  const accountDigits = accountNumber.replace(/\D/g, '');
  const bankLookup = useAccountLookup(accountDigits, bankCode);
  const { opacity, translateX } = useSlideStepTransition(step);
  const back = useSafeBack("/wallet");
  useStepBackHandler(step, () => { if (step > 1) { setStep((current) => (current - 1) as typeof step); } });

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
  const canContinueToReview = recipientReady && amountValid;
  const transferPending = pinStatus === 'loading' || bankTransfer.isPending || interAppTransfer.isPending || receiptBusy;

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
    setPinModalOpen(false);
    setSuccessModalOpen(false);
    setFailureModalOpen(false);
    setTransferReceipt(null);
    setTransferError('');
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
      lookupAttemptRef.current += 1;
      setRecipientValidation(null);
      setRecipientStatus('idle');
      setRecipientError('');
      return;
    }

    const requestId = ++lookupAttemptRef.current;
    const timer = setTimeout(() => {
      setRecipientStatus('loading');
      setRecipientError('');
      void resolveRecipientAsync({ phone: normalizedPhone })
        .then((response) => {
          if (requestId !== lookupAttemptRef.current) return;
          const result = response.data;
          setRecipientValidation({ phone: result.phone, fullName: result.fullName, walletId: result.walletId, avatarUrl: result.avatarUrl ?? null });
          setRecipientStatus('success');
          setRecipientError('');
        })
        .catch((error) => {
          if (requestId !== lookupAttemptRef.current) return;
          setRecipientValidation(null);
          setRecipientStatus('error');
          setRecipientError(error instanceof Error ? error.message : 'We could not find that recipient on Percel.');
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [mode, normalizedPhone, resolveRecipientAsync]);

  const headerBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as 1 | 2 | 3);
      return;
    }
    back();
  };

  const handleOpenPinModal = () => {
    if (!canContinueToReview || transferPending) return;
    setPin('');
    setPinStatus('idle');
    setPinError('');
    setPinModalOpen(true);
  };

  const handleSubmitTransfer = async (overridePin?: string) => {
    if (submissionAttemptRef.current || transferPending) return;

    const trimmed = (overridePin ?? pin).trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setPinStatus('error');
      setPinError('Use a 4 to 6 digit transfer PIN.');
      return;
    }

    submissionAttemptRef.current = true;
    setPinStatus('loading');
    setPinError('');
    try {
      const verification = await pinVerify.mutateAsync({ pin: trimmed });
      if (!verification.data.verified) {
        throw new Error('That PIN is not valid.');
      }

      if (mode === 'BANK') {
        if (!bankValidation) throw new Error('Bank details are unavailable.');
        const response = await bankTransfer.mutateAsync({
          bankCode,
          accountNumber: bankValidation.accountNumber,
          amount: amountValue,
          pin: trimmed,
        });
        const result = response.data;
        setTransferReceipt({
          reference: result.reference,
          amount: result.amount,
          mode,
          recipientName: result.accountName,
          bankName: result.bankName,
          accountName: result.accountName,
          accountNumber: result.accountNumber,
        });
      } else {
        if (!recipientValidation) throw new Error('Recipient details are unavailable.');
        const response = await interAppTransfer.mutateAsync({
          toPhone: recipientValidation.phone,
          amount: amountValue,
          pin: trimmed,
        });
        const result = response.data;
        setTransferReceipt({
          reference: result.reference,
          amount: result.amount,
          mode,
          recipientName: recipientValidation.fullName,
          recipientAvatarUrl: recipientValidation.avatarUrl ?? null,
          recipientPhone: result.toPhone,
        });
      }

      setPinModalOpen(false);
      setFailureModalOpen(false);
      setTransferError('');
      setSuccessModalOpen(true);
      setPin('');
      setPinStatus('idle');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to complete transfer.';
      setTransferError(reason);
      setPinError(reason);
      setPinStatus('error');
      setPinModalOpen(false);
      setSuccessModalOpen(false);
      setFailureModalOpen(true);
    } finally {
      submissionAttemptRef.current = false;
    }
  };

  const handleRetryTransfer = () => {
    setFailureModalOpen(false);
    setTransferError('');
    setPin('');
    setPinStatus('idle');
    setPinError('');
    setPinModalOpen(true);
  };

  const handleDismissFailure = () => {
    setFailureModalOpen(false);
    setTransferError('');
  };

  const handleDismissSuccess = () => {
    setSuccessModalOpen(false);
    setTransferReceipt(null);
    back();
  };

  const handleGenerateReceipt = async () => {
    if (!transferReceipt) return;
    setReceiptBusy(true);
    try {
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const recipientPhone = transferReceipt.recipientPhone ? formatNigerianPhoneDisplay(transferReceipt.recipientPhone) : '—';
      const html = `
        <html>
          <body style="font-family:sans-serif;padding:32px;color:#111827;">
            <h2 style="margin:0 0 8px 0;">Percel transfer receipt</h2>
            <p style="margin:0 0 24px 0;color:#6b7280;">${transferReceipt.mode === 'BANK' ? 'Bank transfer' : 'Inter-app transfer'}</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;">Recipient</td><td style="text-align:right;">${transferReceipt.recipientName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="text-align:right;">${recipientPhone}</td></tr>
              ${transferReceipt.accountNumber ? `<tr><td style="padding:8px 0;color:#6b7280;">Account number</td><td style="text-align:right;">${transferReceipt.accountNumber}</td></tr>` : ''}
              ${transferReceipt.bankName ? `<tr><td style="padding:8px 0;color:#6b7280;">Bank</td><td style="text-align:right;">${transferReceipt.bankName}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="text-align:right;font-weight:bold;">${formatNaira(transferReceipt.amount)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Reference</td><td style="text-align:right;">${transferReceipt.reference}</td></tr>
            </table>
            <p style="margin-top:24px;color:#9ca3af;font-size:12px;">Generated by Percel</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
        setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The transfer receipt is ready to share.', amount: formatNaira(transferReceipt.amount), reference: transferReceipt.reference });
      } else {
        setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The transfer receipt was saved to your device.', amount: formatNaira(transferReceipt.amount), reference: transferReceipt.reference });
      }
    } catch (error) {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt export failed', message: error instanceof Error ? error.message : 'Unable to create the receipt PDF on this device.', amount: formatNaira(transferReceipt.amount), reference: transferReceipt.reference });
    } finally {
      setReceiptBusy(false);
    }
  };

  const currentRecipient = mode === 'BANK'
    ? bankValidation
      ? `${bankValidation.accountName} • ${bankValidation.bankName}`
      : selectedBank.name
    : recipientValidation?.fullName ?? compactPhone(phone);

  const reviewRecipientAvatarUrl = mode === 'PHONE' ? recipientValidation?.avatarUrl ?? null : null;
  const reviewRecipientPhone = mode === 'PHONE'
    ? formatNigerianPhoneDisplay(recipientValidation?.phone ?? normalizedPhone)
    : accountDigits || 'Account pending';

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
        <FlowProgressDots currentStep={step} totalSteps={3} onStepPress={(targetStep) => { if (targetStep < step) setStep(targetStep as typeof step); }} />
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
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{mode === 'BANK' ? accountDigits || 'Account pending' : formatNigerianPhoneDisplay(normalizedPhone)}</Text>
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
              <View style={[styles.stepPill, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}> 
                <CheckCircle2 size={16} color={palette.success} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Review</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Confirm the transfer details, then enter your PIN in the modal.</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
              <View style={styles.reviewRecipientRow}>
                <View style={[styles.reviewAvatar, { backgroundColor: mode === 'PHONE' ? palette.primary : palette.primaryDark }]}> 
                  {mode === 'PHONE' && reviewRecipientAvatarUrl ? (
                    <Image source={{ uri: reviewRecipientAvatarUrl }} style={styles.reviewAvatarImage} />
                  ) : (
                    <Text style={styles.reviewAvatarText}>{mode === 'PHONE' ? initialsFromName(currentRecipient) : '₦'}</Text>
                  )}
                </View>
                <View style={styles.reviewRecipientCopy}>
                  <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Recipient</Text>
                  <Text style={[styles.reviewTitle, { color: palette.text }]}>{currentRecipient}</Text>
                  <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{mode === 'BANK' ? `${bankValidation?.bankName ?? selectedBank.name} • ${reviewRecipientPhone}` : reviewRecipientPhone}</Text>
                </View>
              </View>

              <View style={[styles.reviewAmountBox, { borderColor: palette.border }]}> 
                <Text style={[styles.reviewAmountLabel, { color: palette.textSecondary }]}>Amount to receive</Text>
                <Text style={[styles.reviewAmountValue, { color: palette.text }]}>{formatNaira(amountValue)}</Text>
              </View>
            </View>

            <Pressable
              onPress={handleOpenPinModal}
              disabled={!canContinueToReview || transferPending}
              style={[styles.primaryAction, { backgroundColor: canContinueToReview && !transferPending ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>{transferPending ? 'Preparing…' : 'Send money'}</Text>
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

      <Modal visible={pinModalOpen} transparent animationType="fade" onRequestClose={() => {
        if (transferPending) return;
        setPinModalOpen(false);
        setPinStatus('idle');
        setPinError('');
      }}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (transferPending) return;
              setPinModalOpen(false);
              setPinStatus('idle');
              setPinError('');
            }}
          />
          <View style={[styles.pinModalCard, { backgroundColor: palette.card, borderColor: palette.border }] }>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Enter transfer PIN</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>You are about to send {formatNaira(amountValue)}.</Text>
              </View>
              <Pressable
                onPress={() => {
                  if (transferPending) return;
                  setPinModalOpen(false);
                  setPinStatus('idle');
                  setPinError('');
                }}
                style={[styles.modalClose, { backgroundColor: palette.bg }]}
              >
                <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
              </Pressable>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Recipient</Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>{currentRecipient}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{mode === 'BANK' ? `${bankValidation?.bankName ?? selectedBank.name} • ${reviewRecipientPhone}` : reviewRecipientPhone}</Text>
              <View style={[styles.reviewAmountBox, { borderColor: palette.border }]}> 
                <Text style={[styles.reviewAmountLabel, { color: palette.textSecondary }]}>Amount to send</Text>
                <Text style={[styles.reviewAmountValue, { color: palette.text }]}>{formatNaira(amountValue)}</Text>
              </View>
            </View>

            <PinInput
              value={pin}
              onChangeText={(text) => {
                const cleaned = text.replace(/\s/g, '');
                setPin(cleaned);
                if (pinStatus !== 'idle') setPinStatus('idle');
                if (pinError) setPinError('');
                if (cleaned.length === 4) {
                  void handleSubmitTransfer(cleaned);
                }
              }}
              loading={pinStatus === 'loading'}
              error={pinError || undefined}
            />

            <Pressable
              onPress={() => void handleSubmitTransfer()}
              disabled={transferPending || pin.length < 4}
              style={[styles.secondaryAction, { backgroundColor: palette.primary, opacity: transferPending || pin.length < 4 ? 0.45 : 1 }]}
            >
              <SearchCheck size={18} color={palette.card} />
              <Text style={styles.secondaryActionText}>{pinStatus === 'loading' ? 'Sending…' : 'Verify and send'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={successModalOpen && Boolean(transferReceipt)} transparent animationType="fade" onRequestClose={handleDismissSuccess}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissSuccess} />
          <View style={[styles.resultModalCard, { backgroundColor: palette.card, borderColor: palette.border }] }>
            <View style={[styles.resultBadge, { backgroundColor: 'rgba(48,209,88,0.12)' }]}>
              <CheckCircle2 size={22} color={palette.success} />
            </View>
            <Text style={[styles.modalTitle, { color: palette.text, textAlign: 'center' }]}>Transfer complete</Text>
            <Text style={[styles.modalSubtitle, { color: palette.textSecondary, textAlign: 'center' }]}>
              {transferReceipt ? `${formatNaira(transferReceipt.amount)} sent to ${transferReceipt.recipientName}.` : 'Your transfer was processed successfully.'}
            </Text>

            {transferReceipt ? (
              <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
                <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Reference</Text>
                <Text style={[styles.reviewTitle, { color: palette.text }]}>{transferReceipt.reference}</Text>
                <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{transferReceipt.mode === 'BANK' ? `${transferReceipt.bankName ?? 'Bank transfer'} • ${transferReceipt.accountNumber ?? ''}` : formatNigerianPhoneDisplay(transferReceipt.recipientPhone ?? '')}</Text>
              </View>
            ) : null}

            <Pressable onPress={() => void handleGenerateReceipt()} disabled={receiptBusy || !transferReceipt} style={[styles.primaryAction, { backgroundColor: receiptBusy || !transferReceipt ? palette.border : palette.primary }]}>
              <Text style={styles.primaryActionText}>{receiptBusy ? 'Preparing receipt…' : 'Get Receipt'}</Text>
            </Pressable>

            <Pressable onPress={handleDismissSuccess} style={[styles.secondaryModalAction, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
              <Text style={[styles.secondaryModalActionText, { color: palette.text }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={failureModalOpen} transparent animationType="fade" onRequestClose={handleDismissFailure}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissFailure} />
          <View style={[styles.resultModalCard, { backgroundColor: palette.card, borderColor: palette.border }] }>
            <View style={[styles.resultBadge, { backgroundColor: 'rgba(255,69,58,0.12)' }]}>
              <ShieldCheck size={22} color={palette.error} />
            </View>
            <Text style={[styles.modalTitle, { color: palette.text, textAlign: 'center' }]}>Transfer failed</Text>
            <Text style={[styles.modalSubtitle, { color: palette.textSecondary, textAlign: 'center' }]}>{transferError || 'We could not complete the transfer.'}</Text>

            <Pressable onPress={handleRetryTransfer} style={[styles.primaryAction, { backgroundColor: palette.primary }]}>
              <Text style={styles.primaryActionText}>Retry transfer</Text>
            </Pressable>

            <Pressable onPress={handleDismissFailure} style={[styles.secondaryModalAction, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
              <Text style={[styles.secondaryModalActionText, { color: palette.text }]}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TransactionResultModal
        visible={Boolean(receiptResult?.visible)}
        type={receiptResult?.type ?? 'pending'}
        title={receiptResult?.title ?? ''}
        message={receiptResult?.message ?? ''}
        amount={receiptResult?.amount}
        reference={receiptResult?.reference}
        onClose={() => setReceiptResult(null)}
      />
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
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 12 },
  reviewRecipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewAvatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reviewAvatarImage: { width: '100%', height: '100%' },
  reviewAvatarText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewRecipientCopy: { flex: 1, gap: 2 },
  reviewLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  reviewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.xs, lineHeight: 16 },
  reviewAmountBox: { marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
  reviewAmountLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  reviewAmountValue: { fontSize: 28, fontFamily: Typography.family.bold },
  primaryAction: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondaryAction: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondaryModalAction: { minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryModalActionText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  errorText: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  pinModalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '90%' },
  resultModalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '90%' },
  resultBadge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
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
