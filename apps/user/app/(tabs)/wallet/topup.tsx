import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Banknote, Copy, CreditCard, ExternalLink, Landmark, PlusCircle } from "lucide-react-native";

import { AmountInput } from "@/components/wallet/AmountInput";
import { ConfirmSheet } from "@/components/wallet/ConfirmSheet";
import { StateCard } from "@/components/ui/StateCard";
import { useColorScheme } from "@/components/useColorScheme";
import { Colors } from "@/constants/palette";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { formatNaira } from "@/lib/wallet";
import { TransactionResultModal } from "@/components/TransactionResultModal";
import { useTopUp, useWallet } from "@/hooks/useWallet";
import { useAuthStore } from "@/store/auth.store";
import { useSafeBack } from "@/components/navigation/useSafeBack";

WebBrowser.maybeCompleteAuthSession();

const quickAmounts = [1000, 2500, 5000, 10000] as const;

type FundingMethod = "bank" | "paystack";

export default function TopUpScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? "light") as keyof typeof Colors;
  const palette = Colors[scheme];
  const back = useSafeBack("/wallet");
  const mutation = useTopUp();
  const walletQuery = useWallet();
  const user = useAuthStore((state) => state.user);
  const [activeMethod, setActiveMethod] = useState<FundingMethod>("bank");
  const [amount, setAmount] = useState("5000");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resultModal, setResultModal] = useState<null | { visible: boolean; type: "success" | "failed" | "pending"; title: string; message: string; amount?: string; reference?: string; returnAfterClose: boolean }>(null);

  const wallet = walletQuery.data;
  const kycReady = Boolean(wallet?.kycComplete);
  const amountValue = Number(amount.replace(/,/g, ""));
  const canSubmit = amountValue >= 100 && kycReady;
  const isBankView = activeMethod === "bank";

  const rows = useMemo(
    () => [
      { label: "Amount", value: formatNaira(amountValue) },
      { label: "Channel", value: "Paystack checkout" },
      { label: "Status", value: "Card or bank transfer" },
    ],
    [amountValue],
  );

  const copyText = async (value: string, label: string) => {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(value);
      Alert.alert(`${label} copied`, "You can paste it into your bank app now.");
      return;
    } catch {
      Alert.alert(label, value || "Nothing to show yet.");
    }
  };

  const handleCloseResult = () => {
    setResultModal(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setPreviewOpen(false);
    try {
      setResultModal({
        visible: true,
        type: "pending",
        title: "Top-up pending",
        message: "Complete the payment in the browser window. We will refresh your wallet after Paystack confirms the transfer.",
        amount: formatNaira(amountValue),
        returnAfterClose: false,
      });

      const response = await mutation.mutateAsync({ amount: amountValue });
      const completed = response.authResult.type === "success";
      setResultModal({
        visible: true,
        type: completed ? "success" : "failed",
        title: completed ? "Top-up complete" : "Top-up not completed",
        message: completed
          ? "Your wallet top up was confirmed and the balance will refresh shortly."
          : "The Paystack checkout was closed before payment completed.",
        amount: formatNaira(amountValue),
        reference: response.reference,
        returnAfterClose: false,
      });
    } catch (error) {
      setResultModal({
        visible: true,
        type: "failed",
        title: "Top-up failed",
        message: error instanceof Error ? error.message : "Unable to start payment.",
        amount: formatNaira(amountValue),
        returnAfterClose: false,
      });
    }
  };

  const headerSubtitle = isBankView
    ? "Use the NUBAN details below for direct bank transfers."
    : "Use Paystack for card or browser-based payment.";

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={back}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Add funds</Text>
        <Text style={[styles.title, { color: palette.text }]}>Instant deposits.</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{headerSubtitle}</Text>
      </View>

      <View style={[styles.toggleRow, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Pressable onPress={() => setActiveMethod("bank")} style={[styles.toggleButton, { backgroundColor: isBankView ? palette.primary : "transparent" }]}> 
          <Text style={[styles.toggleText, { color: isBankView ? palette.card : palette.text }]}>Bank</Text>
        </Pressable>
        <Pressable onPress={() => setActiveMethod("paystack")} style={[styles.toggleButton, { backgroundColor: !isBankView ? palette.primary : "transparent" }]}> 
          <Text style={[styles.toggleText, { color: !isBankView ? palette.card : palette.text }]}>Paystack</Text>
        </Pressable>
      </View>

      {isBankView ? (
        <>
          <View style={[styles.depositHero, { backgroundColor: palette.primaryDark }]}> 
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Account name</Text>
                <Text style={styles.heroValue}>{user?.fullName ?? "Percel User"}</Text>
              </View>
              <View style={[styles.heroIcon, { backgroundColor: "rgba(255,255,255,0.14)" }]}> 
                <Landmark size={20} color="#fff" />
              </View>
            </View>
            <Text style={styles.heroBody}>Transfer from another bank app using the account number below. Tap any row to copy it.</Text>
          </View>

          {!kycReady ? (
            <StateCard
              title="Complete KYC first"
              description="We need your address, date of birth, and a completed KYC method before we create your NUBAN and unlock bank deposits."
              icon={<Landmark size={24} color={palette.textSecondary} />}
              actionLabel="Open KYC"
              onActionPress={() => router.push('/settings/kyc')}
            />
          ) : walletQuery.isLoading ? (
            <StateCard loading title="Loading wallet details" description="We’re fetching your deposit account details." icon={<Banknote size={24} color={palette.textSecondary} />} />
          ) : walletQuery.isError ? (
            <StateCard
              title="Could not load wallet"
              description="Try again to see your deposit account details."
              icon={<Banknote size={24} color={palette.textSecondary} />}
              actionLabel="Retry"
              onActionPress={() => void walletQuery.refetch()}
            />
          ) : (
            <View style={[styles.accountCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <View style={styles.accountRow}>
                <View style={[styles.accountIcon, { backgroundColor: palette.primary }]}> 
                  <CreditCard size={20} color={palette.card} />
                </View>
                <View style={styles.accountCopy}>
                  <Text style={[styles.accountLabel, { color: palette.textSecondary }]}>Bank name</Text>
                  <Text style={[styles.accountValue, { color: palette.text }]}>{wallet?.bankName ?? "Generating account…"}</Text>
                </View>
                <Pressable onPress={() => void copyText(wallet?.bankName ?? "", "Bank name")} style={[styles.copyButton, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
                  <Copy size={14} color={palette.text} />
                </Pressable>
              </View>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <Pressable onPress={() => void copyText(wallet?.nuban ?? "", "Account number")} style={styles.accountRow}>
                <View style={[styles.accountIcon, { backgroundColor: "rgba(10,132,255,0.12)" }]}> 
                  <PlusCircle size={20} color={palette.primary} />
                </View>
                <View style={styles.accountCopy}>
                  <Text style={[styles.accountLabel, { color: palette.textSecondary }]}>Account number</Text>
                  <Text style={[styles.accountValue, { color: palette.text }]}>{wallet?.nuban ?? "Pending setup"}</Text>
                </View>
                <Copy size={14} color={palette.textSecondary} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <Pressable onPress={() => void copyText(user?.fullName ?? "Percel User", "Account name")} style={styles.accountRow}>
                <View style={[styles.accountIcon, { backgroundColor: "rgba(48,209,88,0.12)" }]}> 
                  <Landmark size={20} color={palette.success} />
                </View>
                <View style={styles.accountCopy}>
                  <Text style={[styles.accountLabel, { color: palette.textSecondary }]}>Account name</Text>
                  <Text style={[styles.accountValue, { color: palette.text }]}>{user?.fullName ?? "Percel User"}</Text>
                </View>
                <Copy size={14} color={palette.textSecondary} />
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <>
          {!kycReady ? (
            <StateCard
              title="Complete KYC first"
              description="We need your address, date of birth, and a completed KYC method before we unlock Paystack top ups."
              icon={<Landmark size={24} color={palette.textSecondary} />}
              actionLabel="Open KYC"
              onActionPress={() => router.push('/settings/kyc')}
            />
          ) : (
            <>
              <View style={styles.quickSection}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick top up</Text>
                <View style={styles.quickRow}>
                  {quickAmounts.map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setAmount(String(value))}
                      style={[styles.quickChip, { backgroundColor: amountValue === value ? palette.primary : palette.card, borderColor: amountValue === value ? palette.primary : palette.border }]}
                    >
                      <Text style={[styles.quickChipText, { color: amountValue === value ? palette.card : palette.text }]}>{formatNaira(value)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.paystackCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
                <View style={styles.paystackRow}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: palette.text }]}>Paystack checkout</Text>
                    <Text style={[styles.paystackMeta, { color: palette.textSecondary }]}>Use this for card or browser-based payment.</Text>
                  </View>
                  <ExternalLink size={18} color={palette.primary} />
                </View>

                <AmountInput
                  label="Top up amount"
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                  helperText="Minimum top up is ₦100."
                />

                <View style={styles.summaryCard}>
                  <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>Payment summary</Text>
                  <Text style={[styles.summaryValue, { color: palette.text }]}>{formatNaira(amountValue || 0)}</Text>
                </View>

                <Pressable onPress={() => setPreviewOpen(true)} disabled={!canSubmit} style={[styles.primary, { backgroundColor: canSubmit ? palette.primary : palette.border }]}> 
                  <Text style={styles.primaryText}>{mutation.isPending ? 'Preparing checkout…' : 'Continue to Paystack'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </>
      )}

      <Pressable onPress={back} style={[styles.secondary, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.secondaryText, { color: palette.text }]}>Cancel</Text>
      </Pressable>

      <TransactionResultModal
        visible={Boolean(resultModal?.visible)}
        type={resultModal?.type ?? 'pending'}
        title={resultModal?.title ?? ''}
        message={resultModal?.message ?? ''}
        amount={resultModal?.amount}
        reference={resultModal?.reference}
        onClose={handleCloseResult}
        onViewReceipt={resultModal?.type === 'success' ? () => router.push('/wallet/transactions') : undefined}
      />

      <ConfirmSheet
        visible={previewOpen}
        title="Confirm top up"
        description="Review the amount before opening the payment flow."
        rows={rows}
        confirmLabel="Open payment modal"
        loading={mutation.isPending}
        onConfirm={submit}
        onCancel={() => setPreviewOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: "uppercase", letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  toggleRow: { flexDirection: "row", gap: 8, borderRadius: 20, borderWidth: 1, padding: 6 },
  toggleButton: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  toggleText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  depositHero: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroLabel: { color: "rgba(255,255,255,0.68)", fontSize: Typography.xs, textTransform: "uppercase", letterSpacing: 1 },
  heroValue: { color: "#fff", fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroBody: { color: "rgba(255,255,255,0.82)", fontSize: Typography.sm, lineHeight: 20 },
  accountCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  accountCopy: { flex: 1, gap: 2 },
  accountLabel: { fontSize: Typography.xs, textTransform: "uppercase", letterSpacing: 1 },
  accountValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  copyButton: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth, width: "100%" },
  quickSection: { gap: 10 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickChip: { paddingHorizontal: 16, minHeight: 44, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quickChipText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  paystackCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  paystackRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  paystackMeta: { marginTop: 4, fontSize: Typography.sm, lineHeight: 20 },
  summaryCard: { borderRadius: 20, backgroundColor: "rgba(10,132,255,0.06)", padding: Spacing.lg, gap: 6 },
  summaryLabel: { fontSize: Typography.sm },
  summaryValue: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  primary: { borderRadius: 18, minHeight: 54, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondary: { borderRadius: 18, minHeight: 54, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
