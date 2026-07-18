import { useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Landmark,
  CreditCard,
  Search,
  SearchCheck,
  ShieldCheck,
  Smartphone,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeBack } from "@/components/navigation/useSafeBack";
import { TransactionResultModal } from "@/components/TransactionResultModal";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { StateCard } from "@/components/ui/StateCard";
import { AmountInput } from "@/components/wallet/AmountInput";
import { BankPickerModal, BankLogo } from "@/components/wallet/BankPickerModal";
import {
  normalizeNigerianPhone,
  isValidNigerianPhone,
} from "@/components/wallet/WalletFlow";
import {
  FlowProgressDots,
  useStepBackHandler,
} from "@/components/wallet/WalletFlowProgress";

import { useAppPalette } from "@/lib/theme";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import {
  useWallet,
  useAccountLookup,
  useBankTransfer,
  useBanks,
  useResolveTransferRecipient,
  useTransfer,
  useVerifyTransferPin,
} from "@/hooks/useWallet";
import { triggerBiometricAuth } from "@/lib/localAuthentication";
import { formatNaira } from "@/lib/wallet";
import { usePreferencesStore } from "@/store/preferences.store";
import { haptics } from "@/utils/haptics";
import { useBeneficiaryStore } from "@/store/beneficiary.store";
import { getBankLogoUrl } from "@percel/shared";

const modes = [
  {
    key: "BANK",
    label: "Bank transfer",
    description: "Send to a bank account",
  },
  {
    key: "PHONE",
    label: "Inter-app transfer",
    description: "Send to another Percel user",
  },
] as const;

type Mode = (typeof modes)[number]["key"];

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

// Mode selection

function modeLabel(mode: Mode) {
  return mode === "BANK" ? "Bank transfer" : "Inter-app transfer";
}

function compactPhone(value: string) {
  const normalized = normalizeNigerianPhone(value);
  return normalized || "Recipient will appear here";
}

function formatNigerianPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "—";

  const localDigits =
    digits.startsWith("234") && digits.length >= 13
      ? digits.slice(3)
      : digits.startsWith("0") && digits.length >= 11
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
    .join("")
    .toUpperCase();
}

export default function TransferScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const walletQuery = useWallet();
  const wallet = walletQuery.data;
  const banksQuery = useBanks(wallet?.paymentProvider);
  const bankTransfer = useBankTransfer();
  const interAppTransfer = useTransfer();
  const { mutateAsync: resolveRecipientAsync } = useResolveTransferRecipient();
  const pinVerify = useVerifyTransferPin();
  const confirmTransactionsBiometricEnabled = usePreferencesStore(
    (state) => state.confirmTransactionsBiometricEnabled,
  );
  const allowScreenshots = usePreferencesStore(
    (state) => state.allowScreenshots,
  );
  const [mode, setMode] = useState<Mode>("BANK");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [bankCode, setBankCode] = useState("044");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [recipientValidation, setRecipientValidation] =
    useState<RecipientValidation | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [recipientError, setRecipientError] = useState("");
  const [pinStatus, setPinStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [pinError, setPinError] = useState("");
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankConfirmed, setBankConfirmed] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricToast, setBiometricToast] = useState<string | null>(null);
  const [isSavedBeneficiary, setIsSavedBeneficiary] = useState(false);
  const { beneficiaries, addBeneficiary, removeBeneficiary } =
    useBeneficiaryStore();
  const activeBeneficiaries = useMemo(() => {
    return beneficiaries.filter(
      (b) => b.type === (mode === "BANK" ? "BANK" : "PHONE"),
    );
  }, [beneficiaries, mode]);
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
  const [receiptResult, setReceiptResult] = useState<null | {
    visible: boolean;
    type: "success" | "failed" | "pending";
    title: string;
    message: string;
    amount?: string;
    reference?: string;
  }>(null);
  const lookupAttemptRef = useRef(0);
  const submissionAttemptRef = useRef(false);
  const accountDigits = accountNumber.replace(/\D/g, "");
  const bankLookup = useAccountLookup(accountDigits, bankCode);

  const back = useSafeBack("/wallet");
  useStepBackHandler(step, () => {
    if (step > 1) {
      setStep((current) => (current - 1) as typeof step);
    }
  });

  const amountValue = Number(amount.replace(/,/g, ""));
  const normalizedPhone = normalizeNigerianPhone(phone);
  const banks = (banksQuery.data ?? []) as BankItem[];
  const selectedBank = banks.find((item) => item.code === bankCode) ?? {
    name: "Select bank",
    code: bankCode,
  };

  const bankValidation: BankValidation | null =
    bankLookup.data &&
      bankLookup.data.bankCode === bankCode &&
      bankLookup.data.accountNumber === accountDigits
      ? bankLookup.data
      : null;
  const recipientReady =
    mode === "BANK"
      ? Boolean(bankValidation) && bankConfirmed
      : Boolean(recipientValidation);
  const amountValid =
    amountValue > 0 && (!wallet || amountValue <= wallet.balance);
  const canContinueToReview = recipientReady && amountValid;
  const transferPending =
    pinStatus === "loading" ||
    bankTransfer.isPending ||
    interAppTransfer.isPending ||
    receiptBusy;
  const stepOneLoading =
    mode === "BANK" ? walletQuery.isLoading || banksQuery.isLoading : false;

  useEffect(() => {
    if (!allowScreenshots) {
      void ScreenCapture.preventScreenCaptureAsync();
    } else {
      void ScreenCapture.allowScreenCaptureAsync();
    }
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, [allowScreenshots]);

  useEffect(() => {
    if (banks.length > 0 && !banks.some((item) => item.code === bankCode)) {
      setBankCode(banks[0].code);
    }
  }, [banks, bankCode]);

  const resetForm = () => {
    setStep(1);
    setAmount("");
    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(false);
    setSuccessModalOpen(false);
    setFailureModalOpen(false);
    setTransferReceipt(null);
    setTransferError("");
    setRecipientValidation(null);
    setRecipientStatus("idle");
    setRecipientError("");
    setAccountNumber("");
    setBankCode("044");
    setBankConfirmed(false);
    setPhone("");
    setIsSavedBeneficiary(false);
  };

  useEffect(() => {
    resetForm();
  }, [mode]);

  useEffect(() => {
    setPinStatus("idle");
    setPinError("");
  }, [amount, mode, recipientValidation, bankValidation]);

  // Reset confirmation when bank lookup result changes
  useEffect(() => {
    setBankConfirmed(false);
  }, [bankValidation]);

  useEffect(() => {
    if (!biometricToast) return;
    const timer = setTimeout(() => setBiometricToast(null), 2400);
    return () => clearTimeout(timer);
  }, [biometricToast]);

  useEffect(() => {
    if (mode !== "PHONE") return;

    if (!isValidNigerianPhone(phone)) {
      lookupAttemptRef.current += 1;
      setRecipientValidation(null);
      setRecipientStatus("idle");
      setRecipientError("");
      return;
    }

    const requestId = ++lookupAttemptRef.current;
    const timer = setTimeout(() => {
      setRecipientStatus("loading");
      setRecipientError("");
      void resolveRecipientAsync({ phone: normalizedPhone })
        .then((response) => {
          if (requestId !== lookupAttemptRef.current) return;
          const result = response.data;
          setRecipientValidation({
            phone: result.phone,
            fullName: result.fullName,
            walletId: result.walletId,
            avatarUrl: result.avatarUrl ?? null,
          });
          setRecipientStatus("success");
          setRecipientError("");
        })
        .catch((error) => {
          if (requestId !== lookupAttemptRef.current) return;
          setRecipientValidation(null);
          setRecipientStatus("error");
          setRecipientError(
            error instanceof Error
              ? error.message
              : "We could not find that recipient on Percel.",
          );
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

  const handleOpenPinModal = async () => {
    if (!canContinueToReview || transferPending || biometricBusy) return;

    if (confirmTransactionsBiometricEnabled) {
      setBiometricBusy(true);
      try {
        const result = await triggerBiometricAuth({
          promptMessage: "Confirm this transfer",
          cancelLabel: "Use PIN",
          fallbackLabel: "Use PIN",
        });

        if (result.success) {
          const savedPin = await SecureStore.getItemAsync(
            "percel_transfer_pin",
          );
          if (savedPin) {
            await handleSubmitTransfer(savedPin);
            return;
          } else {
            setBiometricToast(
              "Transfer PIN not set for biometrics. Please use PIN.",
            );
          }
        } else {
          setBiometricToast(result.message);
        }
      } catch (err) {
        setBiometricToast("Biometric confirmation failed. Please use PIN.");
      } finally {
        setBiometricBusy(false);
      }
    }

    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(true);
  };

  const handleSubmitTransfer = async (overridePin?: string) => {
    if (submissionAttemptRef.current || transferPending) return;

    const trimmed = (overridePin ?? pin).trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setPinStatus("error");
      setPinError("Use a 4 to 6 digit transfer PIN.");
      return;
    }

    submissionAttemptRef.current = true;
    setPinStatus("loading");
    setPinError("");
    try {
      const verification = await pinVerify.mutateAsync({ pin: trimmed });
      if (!verification.data.verified) {
        throw new Error("That PIN is not valid.");
      }

      if (mode === "BANK") {
        if (!bankValidation) throw new Error("Bank details are unavailable.");
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
        if (!recipientValidation)
          throw new Error("Recipient details are unavailable.");
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
      setTransferError("");
      setSuccessModalOpen(true);
      setPin("");
      setPinStatus("idle");
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unable to complete transfer.";
      setTransferError(reason);
      setPinError(reason);
      setPinStatus("error");
      setPinModalOpen(false);
      setSuccessModalOpen(false);
      setFailureModalOpen(true);
    } finally {
      submissionAttemptRef.current = false;
    }
  };

  const handleRetryTransfer = () => {
    setFailureModalOpen(false);
    setTransferError("");
    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(true);
  };

  const handleDismissFailure = () => {
    setFailureModalOpen(false);
    setTransferError("");
  };

  const handleDismissSuccess = () => {
    resetForm();
    back();
  };

  const handleGenerateReceipt = async () => {
    if (!transferReceipt) return;
    setReceiptBusy(true);
    try {
      const Print = await import("expo-print");
      const Sharing = await import("expo-sharing");
      const recipientPhone = transferReceipt.recipientPhone
        ? formatNigerianPhoneDisplay(transferReceipt.recipientPhone)
        : "—";
      const html = `
        <html>
          <body style="font-family:sans-serif;padding:32px;color:#111827;">
            <h2 style="margin:0 0 8px 0;">Percel transfer receipt</h2>
            <p style="margin:0 0 24px 0;color:#6b7280;">${transferReceipt.mode === "BANK" ? "Bank transfer" : "Inter-app transfer"}</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;">Recipient</td><td style="text-align:right;">${transferReceipt.recipientName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="text-align:right;">${recipientPhone}</td></tr>
              ${transferReceipt.accountNumber ? `<tr><td style="padding:8px 0;color:#6b7280;">Account number</td><td style="text-align:right;">${transferReceipt.accountNumber}</td></tr>` : ""}
              ${transferReceipt.bankName ? `<tr><td style="padding:8px 0;color:#6b7280;">Bank</td><td style="text-align:right;">${transferReceipt.bankName}</td></tr>` : ""}
              <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="text-align:right;font-weight:bold;">${formatNaira(transferReceipt.amount)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Reference</td><td style="text-align:right;">${transferReceipt.reference}</td></tr>
            </table>
            <p style="margin-top:24px;color:#9ca3af;font-size:12px;">Generated by Percel</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: ".pdf",
        });
        setReceiptResult({
          visible: true,
          type: "success",
          title: "Receipt exported",
          message: "The transfer receipt is ready to share.",
          amount: formatNaira(transferReceipt.amount),
          reference: transferReceipt.reference,
        });
      } else {
        setReceiptResult({
          visible: true,
          type: "success",
          title: "Receipt exported",
          message: "The transfer receipt was saved to your device.",
          amount: formatNaira(transferReceipt.amount),
          reference: transferReceipt.reference,
        });
      }
    } catch (error) {
      setReceiptResult({
        visible: true,
        type: "failed",
        title: "Receipt export failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create the receipt PDF on this device.",
        amount: formatNaira(transferReceipt.amount),
        reference: transferReceipt.reference,
      });
    } finally {
      setReceiptBusy(false);
    }
  };

  const currentRecipient =
    mode === "BANK"
      ? bankValidation
        ? `${bankValidation.accountName} • ${bankValidation.bankName}`
        : selectedBank.name
      : (recipientValidation?.fullName ?? compactPhone(phone));

  const reviewRecipientAvatarUrl =
    mode === "PHONE" ? (recipientValidation?.avatarUrl ?? null) : null;
  const reviewRecipientPhone =
    mode === "PHONE"
      ? formatNigerianPhoneDisplay(
        recipientValidation?.phone ?? normalizedPhone,
      )
      : accountDigits || "Account pending";

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={headerBack}
            style={[
              styles.backButton,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <ArrowLeft size={20} color={palette.text} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>
            Send money
          </Text>
          <Text style={[styles.title, { color: palette.text }]}>
            Move money with ease.
          </Text>
        </View>

        <View
          style={[styles.heroCard, { backgroundColor: palette.primaryDark }]}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Active flow</Text>
              <Text style={styles.heroValue}>{modeLabel(mode)}</Text>
            </View>
            <View style={styles.heroIcon}>
              <ArrowUpRight size={20} color="#fff" />
            </View>
          </View>
          <Text style={styles.heroBody}>
            {mode === "BANK"
              ? "Resolve the bank account first, then enter the amount, then review and confirm."
              : "Resolve the recipient first, then enter the amount, then review and confirm."}
          </Text>
          <FlowProgressDots
            currentStep={step}
            totalSteps={3}
            onStepPress={(targetStep) => {
              if (targetStep < step) setStep(targetStep as typeof step);
            }}
          />
        </View>

        <View style={styles.modeRow}>
          {modes.map((item) => {
            const active = item.key === mode;
            return (
              <Pressable
                key={item.key}
                onPress={() => setMode(item.key)}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: active ? palette.primary : palette.card,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeLabel,
                    { color: active ? palette.card : palette.text },
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.modeMeta,
                    {
                      color: active
                        ? "rgba(255,255,255,0.76)"
                        : palette.textSecondary,
                    },
                  ]}
                >
                  {item.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View>
          {step === 1 ? (
            mode === "BANK" ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.stepPill,
                      {
                        backgroundColor: "rgba(10,132,255,0.08)",
                        borderColor: palette.primary,
                      },
                    ]}
                  >
                    <Landmark size={16} color={palette.primary} />
                  </View>
                  <View style={styles.sectionCopy}>
                    <Text
                      style={[styles.sectionTitle, { color: palette.text }]}
                    >
                      Bank lookup
                    </Text>

                  </View>
                </View>

                {/* Saved Bank Beneficiaries */}
                {activeBeneficiaries.length > 0 && (
                  <View style={styles.beneficiariesSection}>
                    <Text
                      style={[
                        styles.beneficiariesTitle,
                        { color: palette.textSecondary },
                      ]}
                    >
                      Saved Beneficiaries
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.beneficiariesScroll}
                    >
                      {activeBeneficiaries.map((b) => (
                        <Pressable
                          key={b.id}
                          onPress={() => {
                            void haptics.tap();
                            setBankCode(b.bankCode || "044");
                            setAccountNumber(b.accountNumber || "");
                            setBankConfirmed(true);
                          }}
                          onLongPress={() => {
                            void haptics.warning();
                            Alert.alert(
                              "Remove Beneficiary",
                              `Are you sure you want to remove ${b.name}?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Remove",
                                  style: "destructive",
                                  onPress: () => removeBeneficiary(b.id),
                                },
                              ],
                            );
                          }}
                          style={styles.beneficiaryAvatarCard}
                        >
                          {b.bankName ? (
                            <BankLogo name={b.bankName} bankCode={b.bankCode} size={44} />
                          ) : (
                            <View
                              style={[
                                styles.beneficiaryAvatarCircle,
                                {
                                  backgroundColor: palette.bg,
                                  borderColor: palette.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.beneficiaryAvatarText,
                                  { color: palette.text },
                                ]}
                              >
                                {initialsFromName(b.name)}
                              </Text>
                            </View>
                          )}
                          <Text
                            style={[
                              styles.beneficiaryAvatarName,
                              { color: palette.text },
                            ]}
                            numberOfLines={1}
                          >
                            {b.name.split(" ")[0]}
                          </Text>
                          <Text
                            style={[
                              styles.beneficiaryBankLabel,
                              { color: palette.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {b.bankName || ""}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {stepOneLoading ? (
                  <StateCard
                    loading
                    title="Loading transfer details"
                    description="Fetching wallet and bank data before you continue."
                    icon={<Search size={24} color={palette.textSecondary} />}
                  />
                ) : !wallet?.kycComplete ? (
                  <StateCard
                    title="KYC required for bank payouts"
                    description="Complete KYC in Settings before you can send to a bank account. Inter-app transfers still work."
                    icon={
                      <ShieldCheck size={24} color={palette.textSecondary} />
                    }
                    actionLabel="Complete KYC"
                    onActionPress={() => router.push("/settings/kyc")}
                  />
                ) : null}

                <Pressable
                  disabled={!wallet?.kycComplete}
                  onPress={() => setBankPickerOpen(true)}
                  style={[
                    styles.selectRow,
                    {
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                      opacity: wallet?.kycComplete ? 1 : 0.5,
                    },
                  ]}
                >
                  <BankLogo name={selectedBank.name} bankCode={selectedBank.code} slug={selectedBank.slug} size={40} />
                  <View style={[styles.selectCopy, { marginLeft: 12 }]}>

                    <Text style={[styles.selectValue, { color: palette.text }]}>
                      {selectedBank.name}
                    </Text>
                  </View>
                  <ChevronDown size={18} color={palette.textSecondary} />
                </Pressable>

                <Input
                  label="Account number"
                  value={accountNumber}
                  onChangeText={(text) => {
                    setAccountNumber(text.replace(/\s/g, ""));
                    setPinStatus("idle");
                    setPinError("");
                  }}
                  keyboardType="number-pad"
                  placeholder="Enter Account Number"
                  leftElement={
                    <Landmark size={16} color={palette.textSecondary} />
                  }
                  helperText=""
                />

                {!wallet?.kycComplete ? null : bankLookup.isFetching ? (
                  <StateCard
                    loading
                    title="Resolving account"
                    description="Checking the bank and beneficiary name now."
                    icon={<Search size={24} color={palette.textSecondary} />}
                  />
                ) : bankLookup.isError ? (
                  <StateCard
                    title="Account lookup failed"
                    description="Choose the correct bank, then enter the account number again."
                    icon={
                      <ShieldCheck size={24} color={palette.textSecondary} />
                    }
                  />
                ) : bankValidation ? (
                  <>
                    <View
                      style={[
                        styles.statusCard,
                        {
                          backgroundColor: "rgba(48,209,88,0.12)",
                          borderColor: palette.success,
                        },
                      ]}
                    >
                      <CheckCircle2 size={18} color={palette.success} />
                      <View style={styles.statusCopy}>
                        <Text
                          style={[
                            styles.statusTitle,
                            { color: palette.success },
                          ]}
                        >
                          {bankValidation.accountName}
                        </Text>
                        <Text
                          style={[
                            styles.statusMeta,
                            { color: palette.textSecondary },
                          ]}
                        >
                          {bankValidation.bankName}
                        </Text>
                        <Text
                          style={[
                            styles.statusMeta,
                            { color: palette.textSecondary },
                          ]}
                        >
                          {bankValidation.accountNumber}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setBankConfirmed(!bankConfirmed)}
                      style={[
                        styles.confirmRow,
                        {
                          backgroundColor: bankConfirmed
                            ? "rgba(48,209,88,0.08)"
                            : palette.bg,
                          borderColor: bankConfirmed
                            ? palette.success
                            : palette.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.confirmCheck,
                          {
                            backgroundColor: bankConfirmed
                              ? palette.success
                              : "transparent",
                            borderColor: bankConfirmed
                              ? palette.success
                              : palette.border,
                          },
                        ]}
                      >
                        {bankConfirmed ? (
                          <CheckCircle2 size={14} color="#fff" />
                        ) : null}
                      </View>
                      <Text
                        style={[styles.confirmText, { color: palette.text }]}
                      >
                        I confirm this is the correct account
                      </Text>
                    </Pressable>

                    {!isSavedBeneficiary &&
                      !beneficiaries.some(
                        (b) =>
                          b.type === "BANK" &&
                          b.accountNumber === bankValidation.accountNumber,
                      ) && (
                        <Pressable
                          onPress={() => {
                            void haptics.success();
                            addBeneficiary({
                              name: bankValidation.accountName,
                              accountNumber: bankValidation.accountNumber,
                              bankCode: bankValidation.bankCode,
                              bankName: bankValidation.bankName,
                              type: "BANK",
                            });
                            setIsSavedBeneficiary(true);
                          }}
                          style={[
                            styles.saveCardRow,
                            {
                              borderColor: palette.primary,
                              backgroundColor: "rgba(10,132,255,0.05)",
                            },
                          ]}
                        >
                          <CreditCard size={16} color={palette.primary} />
                          <Text
                            style={[
                              styles.saveCardText,
                              { color: palette.primary },
                            ]}
                          >
                            Save this account
                          </Text>
                        </Pressable>
                      )}
                    {isSavedBeneficiary && (
                      <View
                        style={[
                          styles.saveCardRow,
                          {
                            borderColor: palette.success,
                            backgroundColor: "rgba(48,209,88,0.06)",
                          },
                        ]}
                      >
                        <CheckCircle2 size={16} color={palette.success} />
                        <Text
                          style={[
                            styles.saveCardText,
                            { color: palette.success },
                          ]}
                        >
                          Account saved
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <StateCard
                    title="Enter a complete account number"
                    description="The lookup needs a valid bank and a 10-digit account number."
                    icon={
                      <SearchCheck size={24} color={palette.textSecondary} />
                    }
                  />
                )}
                {recipientReady ? (
                  <Pressable
                    onPress={() => setStep(2)}
                    style={[
                      styles.primaryAction,
                      {
                        backgroundColor: palette.primary,
                        marginTop: Spacing.md,
                      },
                    ]}
                  >
                    <Text style={styles.primaryActionText}>Continue</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.stepPill,
                      {
                        backgroundColor: "rgba(10,132,255,0.08)",
                        borderColor: palette.primary,
                      },
                    ]}
                  >
                    <Smartphone size={16} color={palette.primary} />
                  </View>
                  <View style={styles.sectionCopy}>
                    <Text
                      style={[styles.sectionTitle, { color: palette.text }]}
                    >
                      Recipient lookup
                    </Text>

                  </View>
                </View>

                {/* Saved Phone Contacts */}
                {activeBeneficiaries.length > 0 && (
                  <View style={styles.beneficiariesSection}>
                    <Text
                      style={[
                        styles.beneficiariesTitle,
                        { color: palette.textSecondary },
                      ]}
                    >
                      Saved Contacts
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.beneficiariesScroll}
                    >
                      {activeBeneficiaries.map((b) => (
                        <Pressable
                          key={b.id}
                          onPress={() => {
                            void haptics.tap();
                            setPhone(b.phone || "");
                          }}
                          onLongPress={() => {
                            void haptics.warning();
                            Alert.alert(
                              "Remove Contact",
                              `Are you sure you want to remove ${b.name}?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Remove",
                                  style: "destructive",
                                  onPress: () => removeBeneficiary(b.id),
                                },
                              ],
                            );
                          }}
                          style={styles.beneficiaryAvatarCard}
                        >
                          <View
                            style={[
                              styles.beneficiaryAvatarCircle,
                              {
                                backgroundColor: palette.bg,
                                borderColor: palette.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.beneficiaryAvatarText,
                                { color: palette.text },
                              ]}
                            >
                              {initialsFromName(b.name)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.beneficiaryAvatarName,
                              { color: palette.text },
                            ]}
                            numberOfLines={1}
                          >
                            {b.name.split(" ")[0]}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Input
                  label="Recipient"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter Percel Phone number"
                  leftElement={
                    <Smartphone size={16} color={palette.textSecondary} />
                  }
                  helperText=""
                />

                {recipientStatus === "loading" ? (
                  <StateCard
                    loading
                    title="Looking up recipient"
                    description="Checking the user account..."
                    icon={<Search size={24} color={palette.textSecondary} />}
                  />
                ) : recipientStatus === "success" && recipientValidation ? (
                  <>
                    <View
                      style={[
                        styles.statusCard,
                        {
                          backgroundColor: "rgba(48,209,88,0.12)",
                          borderColor: palette.success,
                        },
                      ]}
                    >
                      {mode === "PHONE" && reviewRecipientAvatarUrl ? (
                        <Image
                          source={{ uri: reviewRecipientAvatarUrl }}
                          style={styles.reviewAvatarImage}
                        />
                      ) : (
                        <Text style={styles.reviewAvatarText}>
                          {mode === "PHONE"
                            ? initialsFromName(currentRecipient)
                            : "₦"}
                        </Text>
                      )}
                      <CheckCircle2 size={18} color={palette.success} />
                      <View style={styles.statusCopy}>
                        <Text
                          style={[
                            styles.statusTitle,
                            { color: palette.success },
                          ]}
                        >
                          {recipientValidation.fullName}
                        </Text>
                        <Text
                          style={[
                            styles.statusMeta,
                            { color: palette.textSecondary },
                          ]}
                        >
                          {recipientValidation.phone}
                        </Text>
                      </View>
                    </View>

                    {!isSavedBeneficiary &&
                      !beneficiaries.some(
                        (b) =>
                          b.type === "PHONE" &&
                          b.phone === recipientValidation.phone,
                      ) && (
                        <Pressable
                          onPress={() => {
                            void haptics.success();
                            addBeneficiary({
                              name: recipientValidation.fullName,
                              phone: recipientValidation.phone,
                              type: "PHONE",
                            });
                            setIsSavedBeneficiary(true);
                          }}
                          style={[
                            styles.saveCardRow,
                            {
                              borderColor: palette.primary,
                              backgroundColor: "rgba(10,132,255,0.05)",
                            },
                          ]}
                        >
                          <Smartphone size={16} color={palette.primary} />
                          <Text
                            style={[
                              styles.saveCardText,
                              { color: palette.primary },
                            ]}
                          >
                            Save this contact
                          </Text>
                        </Pressable>
                      )}
                    {isSavedBeneficiary && (
                      <View
                        style={[
                          styles.saveCardRow,
                          {
                            borderColor: palette.success,
                            backgroundColor: "rgba(48,209,88,0.06)",
                          },
                        ]}
                      >
                        <CheckCircle2 size={16} color={palette.success} />
                        <Text
                          style={[
                            styles.saveCardText,
                            { color: palette.success },
                          ]}
                        >
                          Contact saved
                        </Text>
                      </View>
                    )}
                  </>
                ) : recipientStatus === "error" ? (
                  <View
                    style={[
                      styles.statusCard,
                      {
                        backgroundColor: "rgba(255,69,58,0.08)",
                        borderColor: palette.error,
                      },
                    ]}
                  >
                    <ShieldCheck size={18} color={palette.error} />
                    <View style={styles.statusCopy}>
                      <Text
                        style={[styles.statusTitle, { color: palette.error }]}
                      >
                        Recipient not found
                      </Text>
                      <Text
                        style={[
                          styles.statusMeta,
                          { color: palette.textSecondary },
                        ]}
                      >
                        {recipientError ||
                          "Enter a different Percel phone number."}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <StateCard
                    title="Enter a Percel phone number"
                    description="We verify the phone number before the amount step appears."
                    icon={
                      <SearchCheck size={24} color={palette.textSecondary} />
                    }
                  />
                )}
                {recipientReady ? (
                  <Pressable
                    onPress={() => setStep(2)}
                    style={[
                      styles.primaryAction,
                      {
                        backgroundColor: palette.primary,
                        marginTop: Spacing.md,
                      },
                    ]}
                  >
                    <Text style={styles.primaryActionText}>Continue</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          ) : null}

          {step === 2 ? (
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.stepPill,
                    {
                      backgroundColor: "rgba(10,132,255,0.08)",
                      borderColor: palette.primary,
                    },
                  ]}
                >
                  <Banknote size={16} color={palette.primary} />
                </View>
                <View style={styles.sectionCopy}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Amount
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: palette.textSecondary },
                    ]}
                  >
                    Add the transfer amount. Completed lookup details remain
                    collapsed out of view.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.summaryMini,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                <Text
                  style={[
                    styles.summaryMiniLabel,
                    { color: palette.textSecondary },
                  ]}
                >
                  Recipient
                </Text>
                <Text
                  style={[styles.summaryMiniValue, { color: palette.text }]}
                >
                  {currentRecipient}
                </Text>
                <Text
                  style={[
                    styles.summaryMiniMeta,
                    { color: palette.textSecondary },
                  ]}
                >
                  {mode === "BANK"
                    ? accountDigits || "Account pending"
                    : formatNigerianPhoneDisplay(normalizedPhone)}
                </Text>
              </View>

              <AmountInput
                label="Transfer amount"
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
                helperText={
                  wallet
                    ? `Available balance: ${formatNaira(wallet.balance)}`
                    : "Load wallet balance to compare your amount."
                }
              />

              {!amountValid && amountValue > 0 ? (
                <View
                  style={[
                    styles.statusCard,
                    {
                      backgroundColor: "rgba(255,149,0,0.08)",
                      borderColor: palette.warning,
                    },
                  ]}
                >
                  <Banknote size={18} color={palette.warning} />
                  <View style={styles.statusCopy}>
                    <Text
                      style={[styles.statusTitle, { color: palette.warning }]}
                    >
                      Amount not ready
                    </Text>
                    <Text
                      style={[
                        styles.statusMeta,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {wallet && amountValue > wallet.balance
                        ? "This amount is higher than your wallet balance."
                        : "Enter a positive numeric amount."}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Pressable
                onPress={() => setStep(3)}
                disabled={!canContinueToReview}
                style={[
                  styles.primaryAction,
                  {
                    backgroundColor: canContinueToReview
                      ? palette.primary
                      : palette.border,
                  },
                ]}
              >
                <Text style={styles.primaryActionText}>Review transfer</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 3 ? (
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.stepPill,
                    {
                      backgroundColor: "rgba(48,209,88,0.12)",
                      borderColor: palette.success,
                    },
                  ]}
                >
                  <CheckCircle2 size={16} color={palette.success} />
                </View>
                <View style={styles.sectionCopy}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>
                    Review
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: palette.textSecondary },
                    ]}
                  >
                    Confirm the transfer details, then enter your PIN in the
                    modal.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.reviewCard,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                <View style={styles.reviewRecipientRow}>
                  {mode === "BANK" ? (
                    <BankLogo
                      name={bankValidation?.bankName ?? selectedBank.name}
                      bankCode={bankCode || selectedBank.code}
                      slug={selectedBank?.slug}
                      size={52}
                    />
                  ) : (
                    <View
                      style={[
                        styles.reviewAvatar,
                        {
                          backgroundColor: palette.primary,
                        },
                      ]}
                    >
                      {reviewRecipientAvatarUrl ? (
                        <Image
                          source={{ uri: reviewRecipientAvatarUrl }}
                          style={styles.reviewAvatarImage}
                        />
                      ) : (
                        <Text style={styles.reviewAvatarText}>
                          {initialsFromName(currentRecipient)}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={styles.reviewRecipientCopy}>
                    <Text
                      style={[
                        styles.reviewLabel,
                        { color: palette.textSecondary },
                      ]}
                    >
                      Recipient
                    </Text>
                    <Text style={[styles.reviewTitle, { color: palette.text }]}>
                      {currentRecipient}
                    </Text>
                    <Text
                      style={[
                        styles.reviewMeta,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {mode === "BANK"
                        ? `${bankValidation?.bankName ?? selectedBank.name} • ${reviewRecipientPhone}`
                        : reviewRecipientPhone}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.reviewAmountBox,
                    { borderColor: palette.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewAmountLabel,
                      { color: palette.textSecondary },
                    ]}
                  >
                    Amount to receive
                  </Text>
                  <Text
                    style={[styles.reviewAmountValue, { color: palette.text }]}
                  >
                    {formatNaira(amountValue)}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleOpenPinModal}
                disabled={
                  !canContinueToReview || transferPending || biometricBusy
                }
                style={[
                  styles.primaryAction,
                  {
                    backgroundColor:
                      canContinueToReview && !transferPending && !biometricBusy
                        ? palette.primary
                        : palette.border,
                  },
                ]}
              >
                {transferPending || biometricBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryActionText}>Send money</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        <BankPickerModal
          visible={bankPickerOpen}
          onClose={() => setBankPickerOpen(false)}
          selectedBankCode={bankCode}
          banks={(banksQuery.data ?? []) as import('@/components/wallet/BankPickerModal').BankItem[]}
          banksLoading={banksQuery.isLoading}
          onSelect={(bank) => {
            setBankCode(bank.code);
            setAccountNumber("");
            setPinStatus("idle");
            setPinError("");
          }}
        />

        <Modal
          visible={pinModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (transferPending) return;
            setPinModalOpen(false);
            setPinStatus("idle");
            setPinError("");
          }}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (transferPending) return;
                setPinModalOpen(false);
                setPinStatus("idle");
                setPinError("");
              }}
            />
            <View
              style={[
                styles.pinModalCard,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.text }]}>
                    Enter transfer PIN
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: palette.textSecondary },
                    ]}
                  >
                    You are about to send {formatNaira(amountValue)}.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (transferPending) return;
                    setPinModalOpen(false);
                    setPinStatus("idle");
                    setPinError("");
                  }}
                  style={[styles.modalClose, { backgroundColor: palette.bg }]}
                >
                  <Text
                    style={[styles.modalCloseText, { color: palette.text }]}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>

              <View
                style={[
                  styles.reviewCard,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                <Text
                  style={[styles.reviewLabel, { color: palette.textSecondary }]}
                >
                  Recipient
                </Text>
                <Text style={[styles.reviewTitle, { color: palette.text }]}>
                  {currentRecipient}
                </Text>
                <Text
                  style={[styles.reviewMeta, { color: palette.textSecondary }]}
                >
                  {mode === "BANK"
                    ? `${bankValidation?.bankName ?? selectedBank.name} • ${reviewRecipientPhone}`
                    : reviewRecipientPhone}
                </Text>
                <View
                  style={[
                    styles.reviewAmountBox,
                    { borderColor: palette.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewAmountLabel,
                      { color: palette.textSecondary },
                    ]}
                  >
                    Amount to send
                  </Text>
                  <Text
                    style={[styles.reviewAmountValue, { color: palette.text }]}
                  >
                    {formatNaira(amountValue)}
                  </Text>
                </View>
              </View>

              <PinInput
                value={pin}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\s/g, "");
                  setPin(cleaned);
                  if (pinStatus !== "idle") setPinStatus("idle");
                  if (pinError) setPinError("");
                  if (cleaned.length === 4) {
                    void handleSubmitTransfer(cleaned);
                  }
                }}
                loading={pinStatus === "loading"}
                error={pinError || undefined}
              />

              <Pressable
                onPress={() => void handleSubmitTransfer()}
                disabled={transferPending || pin.length < 4}
                style={[
                  styles.secondaryAction,
                  {
                    backgroundColor: palette.primary,
                    opacity: transferPending || pin.length < 4 ? 0.45 : 1,
                  },
                ]}
              >
                <SearchCheck size={18} color={palette.card} />
                <Text style={styles.secondaryActionText}>
                  {pinStatus === "loading" ? "Sending…" : "Verify and send"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {biometricToast ? (
          <View style={styles.toastWrap} pointerEvents="none">
            <View
              style={[
                styles.toast,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.toastText, { color: palette.text }]}>
                {biometricToast}
              </Text>
            </View>
          </View>
        ) : null}

        <Modal
          visible={successModalOpen && Boolean(transferReceipt)}
          transparent
          animationType="fade"
          onRequestClose={handleDismissSuccess}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleDismissSuccess}
            />
            <View
              style={[
                styles.resultModalCard,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <View
                style={[
                  styles.resultBadge,
                  { backgroundColor: "rgba(48,209,88,0.12)" },
                ]}
              >
                <CheckCircle2 size={22} color={palette.success} />
              </View>
              <Text
                style={[
                  styles.modalTitle,
                  { color: palette.text, textAlign: "center" },
                ]}
              >
                Transfer complete
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: palette.textSecondary, textAlign: "center" },
                ]}
              >
                {transferReceipt
                  ? `${formatNaira(transferReceipt.amount)} sent to ${transferReceipt.recipientName}.`
                  : "Your transfer was processed successfully."}
              </Text>

              {transferReceipt ? (
                <View
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewLabel,
                      { color: palette.textSecondary },
                    ]}
                  >
                    Reference
                  </Text>
                  <Text style={[styles.reviewTitle, { color: palette.text }]}>
                    {transferReceipt.reference}
                  </Text>
                  <Text
                    style={[
                      styles.reviewMeta,
                      { color: palette.textSecondary },
                    ]}
                  >
                    {transferReceipt.mode === "BANK"
                      ? `${transferReceipt.bankName ?? "Bank transfer"} • ${transferReceipt.accountNumber ?? ""}`
                      : formatNigerianPhoneDisplay(
                        transferReceipt.recipientPhone ?? "",
                      )}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void handleGenerateReceipt()}
                disabled={receiptBusy || !transferReceipt}
                style={[
                  styles.primaryAction,
                  {
                    backgroundColor:
                      receiptBusy || !transferReceipt
                        ? palette.border
                        : palette.primary,
                  },
                ]}
              >
                <Text style={styles.primaryActionText}>
                  {receiptBusy ? "Preparing receipt…" : "Get Receipt"}
                </Text>
              </Pressable>

              {transferReceipt && !isSavedBeneficiary && (
                <Pressable
                  onPress={() => {
                    void haptics.success();
                    addBeneficiary({
                      name: transferReceipt.recipientName,
                      phone: transferReceipt.recipientPhone || undefined,
                      bankCode:
                        transferReceipt.mode === "BANK" ? bankCode : undefined,
                      bankName:
                        transferReceipt.mode === "BANK"
                          ? transferReceipt.bankName
                          : undefined,
                      accountNumber:
                        transferReceipt.mode === "BANK"
                          ? transferReceipt.accountNumber
                          : undefined,
                      type: transferReceipt.mode === "BANK" ? "BANK" : "PHONE",
                    });
                    setIsSavedBeneficiary(true);
                  }}
                  style={[
                    styles.secondaryModalAction,
                    {
                      borderColor: palette.primary,
                      borderWidth: 1,
                      backgroundColor: "rgba(10,132,255,0.06)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryModalActionText,
                      { color: palette.primary },
                    ]}
                  >
                    Save to Contacts
                  </Text>
                </Pressable>
              )}

              {isSavedBeneficiary && (
                <View
                  style={[
                    styles.secondaryModalAction,
                    {
                      borderColor: palette.success,
                      borderWidth: 1,
                      backgroundColor: "rgba(48,209,88,0.06)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryModalActionText,
                      { color: palette.success },
                    ]}
                  >
                    ✓ Saved to Contacts
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleDismissSuccess}
                style={[
                  styles.secondaryModalAction,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                <Text
                  style={[
                    styles.secondaryModalActionText,
                    { color: palette.text },
                  ]}
                >
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={failureModalOpen}
          transparent
          animationType="fade"
          onRequestClose={handleDismissFailure}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleDismissFailure}
            />
            <View
              style={[
                styles.resultModalCard,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <View
                style={[
                  styles.resultBadge,
                  { backgroundColor: "rgba(255,69,58,0.12)" },
                ]}
              >
                <ShieldCheck size={22} color={palette.error} />
              </View>
              <Text
                style={[
                  styles.modalTitle,
                  { color: palette.text, textAlign: "center" },
                ]}
              >
                Transfer failed
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: palette.textSecondary, textAlign: "center" },
                ]}
              >
                {transferError || "We could not complete the transfer."}
              </Text>

              <Pressable
                onPress={handleRetryTransfer}
                style={[
                  styles.primaryAction,
                  { backgroundColor: palette.primary },
                ]}
              >
                <Text style={styles.primaryActionText}>Retry transfer</Text>
              </Pressable>

              <Pressable
                onPress={handleDismissFailure}
                style={[
                  styles.secondaryModalAction,
                  { backgroundColor: palette.bg, borderColor: palette.border },
                ]}
              >
                <Text
                  style={[
                    styles.secondaryModalActionText,
                    { color: palette.text },
                  ]}
                >
                  Dismiss
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <TransactionResultModal
          visible={Boolean(receiptResult?.visible)}
          type={receiptResult?.type ?? "pending"}
          title={receiptResult?.title ?? ""}
          message={receiptResult?.message ?? ""}
          amount={receiptResult?.amount}
          reference={receiptResult?.reference}
          onClose={() => setReceiptResult(null)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    gap: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroValue: {
    color: "#fff",
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
    marginTop: 2,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
    lineHeight: 20,
  },
  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    gap: 4,
  },
  modeLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modeMeta: { fontSize: Typography.xs, lineHeight: 13, fontFamily: Typography.family.regular, },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  sectionSubtitle: { fontSize: Typography.xs, lineHeight: 15, fontFamily: Typography.family.bold, },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  selectCopy: { flex: 1, gap: 4 },
  selectLabel: {
    fontSize: Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  selectValueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  selectMeta: { fontSize: Typography.xs },
  statusCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusMeta: { fontSize: Typography.xs, lineHeight: 16 },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: 4,
  },
  confirmCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    flex: 1,
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  summaryMini: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  summaryMiniLabel: {
    fontSize: Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  summaryMiniValue: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  summaryMiniMeta: { fontSize: Typography.xs },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 12,
  },
  reviewRecipientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  reviewAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  reviewAvatarImage: { width: 60, height: 60 },
  reviewAvatarText: {
    color: "#fff",
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  reviewRecipientCopy: { flex: 1, gap: 2 },
  reviewLabel: {
    fontSize: Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  reviewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.xs, lineHeight: 16 },
  reviewAmountBox: {
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 4,
  },
  reviewAmountLabel: {
    fontSize: Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  reviewAmountValue: { fontSize: 28, fontFamily: Typography.family.bold },
  primaryAction: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: "#fff",
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  secondaryAction: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryActionText: {
    color: "#fff",
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  secondaryModalAction: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryModalActionText: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: "70%",
  },
  pinModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: "90%",
  },
  resultModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: "90%",
  },
  resultBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
  },
  bankList: { marginTop: 4 },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 10,
  },
  bankRowCopy: { flex: 1 },
  bankRowName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  bankRowMeta: { fontSize: Typography.xs },
  emptyText: {
    fontSize: Typography.sm,
    textAlign: "center",
    paddingVertical: 18,
  },
  toastWrap: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  toastText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.semibold,
    textAlign: "center",
  },
  beneficiariesSection: {
    marginVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  beneficiariesTitle: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  beneficiariesScroll: {
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  beneficiaryAvatarCard: {
    alignItems: "center",
    width: 72,
    gap: 4,
  },
  beneficiaryAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  beneficiaryAvatarText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  beneficiaryAvatarName: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.semibold,
    textAlign: "center",
  },
  beneficiaryBankLabel: {
    fontSize: 9,
    textAlign: "center",
  },
  saveCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  saveCardText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
});
