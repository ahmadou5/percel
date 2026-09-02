import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Clock, XCircle, ArrowRight, Wallet, RefreshCw } from "lucide-react-native";

import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAppPalette } from "@/lib/theme";
import { useVerifyTopUp, useWallet } from "@/hooks/useWallet";
import { formatNaira } from "@/lib/wallet";
import { haptics } from "@/utils/haptics";

export default function WalletCallbackScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const params = useLocalSearchParams();
  const reference = String(params.reference || params.trxref || "");

  const walletQuery = useWallet();
  const wallet = walletQuery.data;
  const providerName = wallet?.paymentProvider ? (wallet.paymentProvider.charAt(0) + wallet.paymentProvider.slice(1).toLowerCase()) : "Paystack";

  const verifyMutation = useVerifyTopUp();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [amount, setAmount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const checkCountRef = useRef(0);
  const hapticFiredRef = useRef(false);

  const checkStatus = async (ref: string) => {
    try {
      const response = await verifyMutation.mutateAsync({ reference: ref });
      const result = response.data;
      setAmount(result.amount);
      if (result.status === "success") {
        setStatus("success");
        if (!hapticFiredRef.current) {
          hapticFiredRef.current = true;
          void haptics.success();
        }
      } else if (result.status === "failed") {
        setStatus("failed");
        if (!hapticFiredRef.current) {
          hapticFiredRef.current = true;
          void haptics.error();
        }
      } else {
        // Pending state - we poll up to 3 times (every 3 seconds)
        if (checkCountRef.current < 3) {
          checkCountRef.current += 1;
          setTimeout(() => void checkStatus(ref), 3000);
        } else {
          setStatus("pending");
          if (!hapticFiredRef.current) {
            hapticFiredRef.current = true;
            void haptics.warning();
          }
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Verification failed");
      setStatus("failed");
      if (!hapticFiredRef.current) {
        hapticFiredRef.current = true;
        void haptics.error();
      }
    }
  };

  useEffect(() => {
    if (reference) {
      void checkStatus(reference);
    } else {
      setStatus("failed");
      setErrorMessage("No payment reference found in the callback URL.");
    }
  }, [reference]);

  const handleFinish = () => {
    void haptics.tap();
    router.replace("/");
  };

  const handleRetry = () => {
    void haptics.tap();
    if (reference) {
      setStatus("loading");
      checkCountRef.current = 0;
      hapticFiredRef.current = false;
      void checkStatus(reference);
    }
  };

  // Get status metadata
  const getStatusDetails = () => {
    switch (status) {
      case "success":
        return {
          title: "Payment Successful!",
          description: "Your wallet has been credited successfully. The balance is now updated.",
          icon: <CheckCircle2 size={54} color={palette.success} />,
          backgroundColor: "rgba(48,209,88,0.12)",
          accent: palette.success,
        };
      case "failed":
        return {
          title: "Payment Unsuccessful",
          description: errorMessage || "The top-up was canceled or could not be completed at this time.",
          icon: <XCircle size={54} color={palette.error} />,
          backgroundColor: "rgba(255,69,58,0.12)",
          accent: palette.error,
        };
      case "pending":
        return {
          title: "Payment Processing",
          description: `${providerName} is still processing your deposit. We will automatically update your balance once confirmed.`,
          icon: <Clock size={54} color={palette.warning} />,
          backgroundColor: "rgba(255,159,10,0.12)",
          accent: palette.warning,
        };
      case "loading":
      default:
        return {
          title: "Verifying Deposit",
          description: `Please wait while we confirm your payment status with ${providerName}…`,
          icon: <ActivityIndicator size="large" color={palette.primary} />,
          backgroundColor: "rgba(10,132,255,0.06)",
          accent: palette.primary,
        };
    }
  };

  const details = getStatusDetails();

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.centerContainer}>
        <View style={[styles.iconContainer, { backgroundColor: details.backgroundColor }]}>
          {details.icon}
        </View>

        <Text style={[styles.title, { color: palette.text }]}>{details.title}</Text>
        <Text style={[styles.description, { color: palette.textSecondary }]}>{details.description}</Text>

        {status !== "loading" && reference ? (
          <View style={[styles.detailsCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {amount > 0 && (
              <View style={[styles.row, { borderColor: palette.border }]}>
                <Text style={[styles.label, { color: palette.textSecondary }]}>Amount</Text>
                <Text style={[styles.value, { color: palette.text }]}>{formatNaira(amount)}</Text>
              </View>
            )}
            <View style={[styles.row, { borderColor: palette.border }]}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Reference</Text>
              <Text style={[styles.value, { color: palette.text }]} numberOfLines={1}>{reference}</Text>
            </View>
            <View style={[styles.row, { borderColor: palette.border }]}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Channel</Text>
              <Text style={[styles.value, { color: palette.text }]}>Paystack Checkout</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.buttonContainer}>
        {status === "failed" && reference && (
          <Pressable onPress={handleRetry} style={[styles.secondaryButton, { borderColor: palette.border }]}>
            <RefreshCw size={18} color={palette.text} style={styles.buttonIcon} />
            <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Retry Verification</Text>
          </Pressable>
        )}
        
        {status !== "loading" ? (
          <Pressable onPress={handleFinish} style={[styles.primaryButton, { backgroundColor: details.accent }]}>
            <Text style={styles.primaryButtonText}>Go to Wallet</Text>
            <ArrowRight size={18} color="#fff" style={styles.buttonIconRight} />
          </Pressable>
        ) : (
          <View style={styles.spinnerSpacing} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
    justifyContent: "space-between",
  },
  centerContainer: {
    alignItems: "center",
    marginTop: 60,
    gap: Spacing.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontFamily: Typography.family.bold,
    textAlign: "center",
  },
  description: {
    fontSize: Typography.md,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  detailsCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: Typography.family.bold,
  },
  value: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  buttonContainer: {
    width: "100%",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  secondaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonIconRight: {
    marginLeft: 8,
  },
  spinnerSpacing: {
    height: 56,
  },
});
