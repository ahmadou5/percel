import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Radio, Tv2 } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Input } from "@/components/ui/Input";
import { StateCard } from "@/components/ui/StateCard";
import { useColorScheme } from "@/components/useColorScheme";
import { Colors } from "@/constants/palette";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { formatNaira } from "@/lib/wallet";
import { useBuyTv, useProviderServices, useProviderVariations, useValidateProviderAccount } from "@/hooks/useWallet";
import { ProviderBadge, WalletStepper, providerLabelFromService } from "@/components/wallet/WalletFlow";

export default function TvScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? "light") as keyof typeof Colors;
  const palette = Colors[scheme];
  const mutation = useBuyTv();
  const validateMutation = useValidateProviderAccount();
  const services = useProviderServices("tv-subscription").data ?? [];
  const [selectedServiceID, setSelectedServiceID] = useState("");
  const [smartcardNumber, setSmartcardNumber] = useState("");
  const [selectedVariationCode, setSelectedVariationCode] = useState("");
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [validation, setValidation] = useState<{ name: string; address?: string } | null>(null);
  const [providerValidationStatus, setProviderValidationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [recentSubscriptions, setRecentSubscriptions] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);

  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const variations = useProviderVariations(selectedService?.serviceID).data ?? [] as any[];
  const selectedVariation = variations.find((variation) => variation.variation_code === selectedVariationCode) ?? variations[0];
  const selectedPrice = Number(selectedVariation?.variation_amount ?? 0);
  const canPay = smartcardNumber.trim().length >= 6 && Boolean(selectedService) && Boolean(selectedVariation) && providerValidationStatus === "success" && !mutation.isPending;
  const currentStep = providerValidationStatus === "success" ? (selectedVariation ? 4 : 3) : smartcardNumber.trim().length > 0 ? 2 : 1;

  useEffect(() => {
    if (!selectedServiceID && services.length) setSelectedServiceID(services[0].serviceID);
  }, [selectedServiceID, services]);

  useEffect(() => {
    if (!selectedVariationCode && variations.length) setSelectedVariationCode(variations[0].variation_code);
  }, [selectedVariationCode, variations]);

  const steps = [
    { key: 1, label: "Provider", hint: "Choose the TV operator" },
    { key: 2, label: "Validate", hint: "Confirm the smartcard" },
    { key: 3, label: "Bouquet", hint: "Pick a live plan" },
    { key: 4, label: "Pay", hint: "Review and renew" },
  ];

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>TV Subscription</Text>
        <Text style={[styles.title, { color: palette.text }]}>Validate the smartcard first, then pick a live bouquet and pay.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Live TV pricing</Text>
            <Text style={styles.heroValue}>{selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : "Choose a provider"}</Text>
          </View>
          <View style={styles.heroIcon}><Tv2 color="#fff" size={20} /></View>
        </View>
        <Text style={styles.heroBody}>Provider logos come from the provider API, while validation keeps the subscriber details visible before payment.</Text>
        <WalletStepper currentStep={currentStep} steps={steps} />
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>TV provider</Text>
        <Pressable onPress={() => setProviderPickerOpen(true)} style={[styles.dropdownSelect, { backgroundColor: palette.bg, borderColor: palette.border, marginBottom: 14 }]}>
          <View style={styles.dropdownSelectCopy}>
            {selectedService ? (
              <View style={styles.dropdownValueRow}>
                <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logo={(selectedService as any).logo ?? selectedService.image ?? null} size={28} />
                <View style={{ gap: 2 }}>
                  <Text style={[styles.dropdownValueName, { color: palette.text }]}>{providerLabelFromService(selectedService.serviceID, selectedService.name)}</Text>
                  <Text style={[styles.dropdownValueMeta, { color: palette.textSecondary }]}>{selectedService.name}</Text>
                </View>
              </View>
            ) : <Text style={[styles.dropdownPlaceholder, { color: palette.textSecondary }]}>Choose TV provider</Text>}
          </View>
          <ChevronDown size={18} color={palette.textSecondary} />
        </Pressable>

        <Input
          label="Smartcard number"
          value={smartcardNumber}
          onChangeText={(value) => { setSmartcardNumber(value); setValidation(null); setProviderValidationStatus("idle"); }}
          keyboardType="number-pad"
          placeholder="Enter smartcard number"
          helperText="Validate the card before paying so the account details are visible."
        />

        <Pressable
          onPress={async () => {
            if (!selectedService || !smartcardNumber.trim()) return;
            try {
              setProviderValidationStatus("loading");
              const result = await validateMutation.mutateAsync({ serviceID: selectedService.serviceID, billersCode: smartcardNumber.trim() });
              setValidation({ name: String(result.Customer_Name ?? result.Account_Number ?? "Verified customer"), address: result.Address ? String(result.Address) : undefined });
              setProviderValidationStatus("success");
            } catch (error) {
              setProviderValidationStatus("error");
              Alert.alert("Could not validate smartcard", error instanceof Error ? error.message : "Please check the provider and smartcard number.");
            }
          }}
          disabled={validateMutation.isPending || smartcardNumber.trim().length < 6 || !selectedService}
          style={[styles.inlineAction, { backgroundColor: palette.text }]}
        >
          <CheckCircle2 size={16} color={palette.card} />
          <Text style={[styles.inlineActionText, { color: palette.card }]}>{validateMutation.isPending ? "Validating..." : "Validate smartcard"}</Text>
        </Pressable>
        {validation ? <View style={[styles.successPill, { backgroundColor: "rgba(48,209,88,0.12)" }]}><CheckCircle2 size={16} color={palette.success} /><Text style={[styles.successText, { color: palette.success }]}>{validation.name}{validation.address ? ` - ${validation.address}` : ""}</Text></View> : null}
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Live bouquets</Text>
        {selectedService ? useProviderVariations(selectedService.serviceID).isLoading ? <StateCard loading title="Loading bouquets" description="Fetching the current bouquet list from VTpass." icon={<Tv2 size={24} color={palette.textSecondary} />} /> : variations.length ? (
          <View style={styles.planList}>
            {variations.map((variation) => {
              const active = variation.variation_code === selectedVariationCode;
              return (
                <Pressable key={variation.variation_code} onPress={() => setSelectedVariationCode(variation.variation_code)} style={[styles.planRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? "rgba(10,132,255,0.08)" : "transparent" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: palette.text }]}>{variation.name}</Text>
                    <Text style={[styles.planMeta, { color: palette.textSecondary }]}>{variation.fixedPrice === "Yes" ? "Fixed price" : "Variable price"}</Text>
                  </View>
                  <Text style={[styles.planPrice, { color: palette.text }]}>{formatNaira(Number(variation.variation_amount))}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : <StateCard title="No bouquets available" description="VTpass did not return any TV variations for the selected provider." icon={<Radio size={24} color={palette.textSecondary} />} /> : null}
      </View>

      <View style={[styles.summary, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Summary</Text>
        <Text style={[styles.summaryTitle, { color: palette.text }]}>{selectedVariation?.name ?? "Select a bouquet"}</Text>
        <Text style={[styles.summaryMeta, { color: palette.textSecondary }]}>{selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : "No provider selected"}</Text>
        <Text style={[styles.summaryAmount, { color: palette.text }]}>{selectedPrice ? formatNaira(selectedPrice) : "₦0"}</Text>
      </View>

      <Pressable
        disabled={!canPay}
        onPress={async () => {
          if (!selectedService || !selectedVariation) return;
          try {
            await mutation.mutateAsync({ smartcardNumber: smartcardNumber.trim(), amount: selectedPrice, provider: selectedService.name, variationCode: selectedVariation.variation_code });
            setRecentSubscriptions((items) => [{ id: String(Date.now()), title: `${selectedService.name} ${selectedVariation.name}`, meta: "TV subscription", amount: formatNaira(selectedPrice) }, ...items].slice(0, 5));
            Alert.alert("TV subscription paid", `You renewed ${selectedVariation.name} for ${formatNaira(selectedPrice)}.`);
          } catch (error) {
            Alert.alert("Subscription failed", error instanceof Error ? error.message : "Unable to renew the TV subscription.");
          }
        }}
        style={[styles.cta, { backgroundColor: canPay ? palette.primary : palette.border }]}
      >
        {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={styles.ctaText}>{selectedVariation ? `Renew for ${formatNaira(selectedPrice)}` : "Select a bouquet"}</Text>}
      </Pressable>

      <View style={[styles.recentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent subscriptions</Text>
        {recentSubscriptions.length ? recentSubscriptions.map((item) => (
          <View key={item.id} style={styles.recentRow}>
            <View>
              <Text style={[styles.recentTitle, { color: palette.text }]}>{item.title}</Text>
              <Text style={[styles.recentMeta, { color: palette.textSecondary }]}>{item.meta}</Text>
            </View>
            <Text style={[styles.recentAmount, { color: palette.text }]}>{item.amount}</Text>
          </View>
        )) : <StateCard title="No recent subscriptions" description="Your TV renewals will appear here after a successful payment." icon={<Radio size={24} color={palette.textSecondary} />} />}
      </View>

      <Modal visible={providerPickerOpen} transparent animationType="fade" onRequestClose={() => setProviderPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a provider</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select your TV provider below.</Text>
              </View>
              <Pressable onPress={() => setProviderPickerOpen(false)} style={[styles.modalClose, { backgroundColor: palette.bg }]}><Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text></Pressable>
            </View>
            {services.length ? <FlatList data={services} keyExtractor={(item) => item.serviceID} renderItem={({ item }) => {
              const active = item.serviceID === selectedServiceID;
              return (
                <Pressable onPress={() => {
                  setSelectedServiceID(item.serviceID);
                  setValidation(null);
                  setProviderValidationStatus("idle");
                  setProviderPickerOpen(false);
                }} style={[styles.providerRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? "rgba(10,132,255,0.08)" : palette.bg }]}>
                  <View style={styles.providerRowLeft}>
                    <ProviderBadge serviceID={item.serviceID} name={item.name} logo={(item as any).logo ?? item.image ?? null} size={36} />
                    <View>
                      <Text style={[styles.providerRowName, { color: palette.text }]}>{providerLabelFromService(item.serviceID, item.name)}</Text>
                      <Text style={[styles.providerRowMeta, { color: palette.textSecondary }]}>{item.name}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={palette.textSecondary} />
                </Pressable>
              );
            }} /> : <StateCard title="No TV providers" description="VTpass did not return any TV providers." icon={<Tv2 size={24} color={palette.textSecondary} />} />}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: "uppercase", letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  hero: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroLabel: { color: "rgba(255,255,255,0.68)", fontSize: Typography.xs, textTransform: "uppercase", letterSpacing: 1 },
  heroValue: { color: "#fff", fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
  heroBody: { color: "rgba(255,255,255,0.82)", fontSize: Typography.sm, lineHeight: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  inputLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  dropdownSelect: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, minHeight: 64 },
  dropdownSelectCopy: { flex: 1 },
  dropdownValueRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dropdownValueName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  dropdownValueMeta: { fontSize: Typography.xs },
  dropdownPlaceholder: { fontSize: Typography.md, fontFamily: Typography.family.medium },
  inlineAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  inlineActionText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  successPill: { flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 },
  successText: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, marginBottom: 10 },
  planList: { gap: 10 },
  planRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md },
  planName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  planMeta: { fontSize: Typography.xs },
  planPrice: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summary: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  summaryTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  summaryMeta: { fontSize: Typography.xs },
  summaryAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 2 },
  cta: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  recentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.08)" },
  recentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentMeta: { marginTop: 2, fontSize: Typography.xs },
  recentAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, color: "#64748b", marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  providerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  providerRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  providerRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  providerRowMeta: { fontSize: Typography.xs },
  providerPill: { flexDirection: "row", alignItems: "center", gap: 8 },
});
