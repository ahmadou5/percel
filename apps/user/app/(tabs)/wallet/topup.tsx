import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Banknote, Copy, CreditCard, Landmark, PlusCircle } from "lucide-react-native";

import { AppModal, useAppModal } from "@/components/ui/AppModal";
import { StateCard } from "@/components/ui/StateCard";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { haptics } from "@/utils/haptics";
import { useWallet } from "@/hooks/useWallet";
import { useAuthStore } from "@/store/auth.store";
import { useAppPalette } from "@/lib/theme";
import { getBankLogoUrl } from "@percel/shared";

export default function TopUpScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const walletQuery = useWallet();
  const user = useAuthStore((state) => state.user);

  const wallet = walletQuery.data;
  const kycReady = Boolean(wallet?.kycComplete);

  const headerBack = () => {
    router.navigate('/');
  };

  const copyText = async (value: string, label: string) => {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(value);
      modal.alert(`${label} copied`, "You can paste it into your bank app now.", "success");
      return;
    } catch {
      modal.alert(label, value || "Nothing to show yet.", "info");
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={headerBack}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Add funds</Text>
        <Text style={[styles.title, { color: palette.text }]}>Bank Deposit</Text>

      </View>

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
        <FormSkeleton count={2} />
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
            {wallet?.bankName ? (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: getBankLogoUrl(wallet.bankCode || undefined, wallet.bankName) }}
                  style={{ width: 32, height: 32 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.accountIcon, { backgroundColor: palette.primary }]}>
                <CreditCard size={20} color={palette.card} />
              </View>
            )}
            <View style={styles.accountCopy}>
              <Text style={[styles.accountLabel, { color: palette.textSecondary }]}>Bank name</Text>
              <Text style={[styles.accountValue, { color: palette.text }]}>{wallet?.bankName ?? "Generating account…"}</Text>
            </View>
            <Pressable onPressIn={() => void haptics.tap()} onPress={() => void copyText(wallet?.bankName ?? "", "Bank name")} style={[styles.copyButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Copy size={14} color={palette.text} />
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <Pressable onPressIn={() => void haptics.tap()} onPress={() => void copyText(wallet?.nuban ?? "", "Account number")} style={styles.accountRow}>
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

          <Pressable onPressIn={() => void haptics.tap()} onPress={() => void copyText(user?.fullName ?? "Percel User", "Account name")} style={styles.accountRow}>
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

      <AppModal config={modal.config} onClose={modal.hide} />
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
  simButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 16, marginTop: 8 },
  simButtonText: { color: "#fff", fontSize: Typography.sm, fontFamily: Typography.family.bold },
});
