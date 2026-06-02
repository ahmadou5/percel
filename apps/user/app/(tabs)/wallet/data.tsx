import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, ChevronDown, ChevronRight, Globe, Smartphone } from "lucide-react-native";
import { useRouter } from "expo-router";

import { Input } from "@/components/ui/Input";
import { StateCard } from "@/components/ui/StateCard";
import { useColorScheme } from "@/components/useColorScheme";
import { Colors } from "@/constants/palette";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { formatNaira } from "@/lib/wallet";
import { useBuyData, useProviderServices, useProviderVariations, useResolveAirtimeProvider, useWallet } from "@/hooks/useWallet";
import { ProviderBadge, WalletStepper, normalizeNigerianPhone, providerLabelFromService } from "@/components/wallet/WalletFlow";

export default function DataScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? "light") as keyof typeof Colors;
  const palette = Colors[scheme];
  const wallet = useWallet().data;
  const mutation = useBuyData();
  const providerResolve = useResolveAirtimeProvider();
  const services = useProviderServices("data").data ?? [];
  const [phone, setPhone] = useState("");
  const [selectedServiceID, setSelectedServiceID] = useState("");
  const [selectedVariationCode, setSelectedVariationCode] = useState("");
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [providerValidation, setProviderValidation] = useState<{ phone: string; serviceID: string; providerName: string; confidence: "high" | "low" } | null>(null);
  const [providerValidationStatus, setProviderValidationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [recentPurchases, setRecentPurchases] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);

  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const variationsQuery = useProviderVariations(selectedService?.serviceID);
  const variations = variationsQuery.data ?? [];
  const selectedVariation = variations.find((variation) => variation.variation_code === selectedVariationCode) ?? variations[0];
  const selectedPrice = Number(selectedVariation?.variation_amount ?? 0);
  const normalizedPhone = normalizeNigerianPhone(phone);
  const displayNetwork = providerValidation?.providerName ?? (selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : "Network");
  const amountValid = selectedPrice > 0 && (!wallet || selectedPrice <= wallet.balance);
  const canSubmit = normalizedPhone.replace(/\D/g, "").length >= 10 && Boolean(selectedService) && Boolean(selectedVariation) && amountValid && providerValidationStatus === "success" && !mutation.isPending;
  const currentStep = providerValidationStatus === "success" ? (selectedVariation ? 3 : 2) : 1;

  useEffect(() => {
    if (!selectedServiceID && services.length) setSelectedServiceID(services[0].serviceID);
  }, [selectedServiceID, services]);

  useEffect(() => {
    if (!selectedVariationCode && variations.length) setSelectedVariationCode(variations[0].variation_code);
  }, [selectedVariationCode, variations]);

  useEffect(() => {
    const digits = normalizedPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      setProviderValidation(null);
      setProviderValidationStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      setProviderValidationStatus("loading");
      void providerResolve.mutateAsync({ phone }).then((response) => {
        const result = response.data;
        setProviderValidation(result);
        setProviderValidationStatus("success");
        const match = result.serviceID.toLowerCase().includes("mtn") ? services.find((service) => service.serviceID.toLowerCase().includes("mtn")) : result.serviceID.toLowerCase().includes("airtel") ? services.find((service) => service.serviceID.toLowerCase().includes("airtel")) : result.serviceID.toLowerCase().includes("glo") ? services.find((service) => service.serviceID.toLowerCase().includes("glo")) : services.find((service) => service.serviceID.toLowerCase().includes("9mobile") || service.serviceID.toLowerCase().includes("etisalat") || service.name.toLowerCase().includes("9mobile"));
        if (match) setSelectedServiceID(match.serviceID);
      }).catch(() => {
        setProviderValidation(null);
        setProviderValidationStatus("error");
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [phone, providerResolve, services, normalizedPhone]);

  const steps = [
    { key: 1, label: "Verify", hint: "Confirm the network from the phone number" },
    { key: 2, label: "Bundle", hint: "Choose a live data plan" },
    { key: 3, label: "Pay", hint: "Review and buy the bundle" },
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
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Data</Text>
        <Text style={[styles.title, { color: palette.text }]}>Top up a number, pick a plan, and pay only for the bundle you choose.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Live provider check</Text>
            <Text style={styles.heroValue}>{displayNetwork}</Text>
          </View>
          <View style={styles.heroIcon}><Globe color="#fff" size={20} /></View>
        </View>
        <Text style={styles.heroBody}>The number is checked first, then the plan list updates from VTpass with live pricing and provider logos.</Text>
        <WalletStepper currentStep={currentStep} steps={steps} />
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Input
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="08012345678"
          leftElement={
            <Pressable onPress={() => setProviderPickerOpen(true)} style={styles.providerPill}>
              {selectedService ? <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logo={(selectedService as any).logo ?? selectedService.image ?? null} size={22} /> : null}
              <Text style={[styles.providerText, { color: palette.text }]}>{displayNetwork}</Text>
              <ChevronDown size={14} color={palette.textSecondary} />
            </Pressable>
          }
          helperText="When the lookup fails, you can pick the provider manually."
        />
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Plans</Text>
        {selectedService ? (
          useProviderVariations(selectedService.serviceID).isLoading ? (
            <StateCard loading title="Loading plans" description="Fetching live data bundles from VTpass." icon={<Globe size={24} color={palette.textSecondary} />} />
          ) : variations.length ? (
            <View style={styles.planGrid}>
              {variations.map((variation) => {
                const active = variation.variation_code === selectedVariationCode;
                return (
                  <Pressable key={variation.variation_code} onPress={() => setSelectedVariationCode(variation.variation_code)} style={[styles.planCard, { backgroundColor: active ? "rgba(10,132,255,0.08)" : palette.bg, borderColor: active ? palette.primary : palette.border }]}>
                    <View style={styles.planTop}>
                      <Text style={[styles.planName, { color: palette.text }]}>{variation.name}</Text>
                      <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logo={(selectedService as any).logo ?? selectedService.image ?? null} size={30} />
                    </View>
                    <Text style={[styles.planAmount, { color: palette.text }]}>{formatNaira(Number(variation.variation_amount))}</Text>
                    <Text style={[styles.planMeta, { color: palette.textSecondary }]}>{variation.fixedPrice === "Yes" ? "Fixed price" : "Variable price"}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <StateCard title="No bundles" description="VTpass did not return any data plans for this provider." icon={<Globe size={24} color={palette.textSecondary} />} />
          )
        ) : null}
      </View>

      <View style={[styles.summary, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Summary</Text>
        <Text style={[styles.summaryTitle, { color: palette.text }]}>{selectedVariation?.name ?? "Select a plan"}</Text>
        <Text style={[styles.summaryMeta, { color: palette.textSecondary }]}>{displayNetwork}</Text>
        <Text style={[styles.summaryAmount, { color: palette.text }]}>{selectedPrice ? formatNaira(selectedPrice) : "₦0"}</Text>
      </View>

      <Pressable disabled={!canSubmit} onPress={async () => {
        if (!selectedService || !selectedVariation) return;
        try {
          await mutation.mutateAsync({
            phone,
            network: displayNetwork,
            amount: selectedPrice,
            plan: selectedVariation.name,
            variationCode: selectedVariation.variation_code,
            serviceID: selectedService.serviceID,
          });
          setRecentPurchases((items) => [{ id: String(Date.now()), title: selectedVariation.name, meta: `${displayNetwork} data`, amount: formatNaira(selectedPrice) }, ...items].slice(0, 5));
          Alert.alert("Data purchased", `You bought ${selectedVariation.name} for ${formatNaira(selectedPrice)}.`);
        } catch (error) {
          Alert.alert("Purchase failed", error instanceof Error ? error.message : "Unable to buy data.");
        }
      }} style={[styles.cta, { backgroundColor: canSubmit ? palette.text : palette.border }]}>
        {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={[styles.ctaText, { color: palette.card }]}>{selectedVariation ? `Buy for ${formatNaira(selectedPrice)}` : "Select a bundle"}</Text>}
      </Pressable>

      <View style={[styles.recent, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent purchases</Text>
        {recentPurchases.length ? recentPurchases.map((item) => (
          <View key={item.id} style={styles.recentRow}>
            <View>
              <Text style={[styles.recentTitle, { color: palette.text }]}>{item.title}</Text>
              <Text style={[styles.recentMeta, { color: palette.textSecondary }]}>{item.meta}</Text>
            </View>
            <Text style={[styles.recentAmount, { color: palette.text }]}>{item.amount}</Text>
          </View>
        )) : <StateCard title="No data purchases yet" description="Buy a plan to see your recent activity here." icon={<Globe size={24} color={palette.textSecondary} />} />}
      </View>

      <Modal visible={providerPickerOpen} transparent animationType="fade" onRequestClose={() => setProviderPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a provider</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select the network operator for this number.</Text>
              </View>
              <Pressable onPress={() => setProviderPickerOpen(false)} style={[styles.modalClose, { backgroundColor: palette.bg }]}><Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text></Pressable>
            </View>
            {services.length ? (
              <FlatList
                data={services}
                keyExtractor={(item) => item.serviceID}
                renderItem={({ item }) => {
                  const active = item.serviceID === selectedServiceID;
                  return (
                    <Pressable onPress={() => {
                      setSelectedServiceID(item.serviceID);
                      setProviderValidation({ phone: normalizedPhone, serviceID: item.serviceID, providerName: providerLabelFromService(item.serviceID, item.name), confidence: "low" });
                      setProviderValidationStatus("success");
                      setProviderPickerOpen(false);
                    }} style={[styles.providerRow, { backgroundColor: active ? "rgba(10,132,255,0.08)" : palette.bg, borderColor: active ? palette.primary : palette.border }]}>
                      <View style={styles.providerRowLeft}>
                        <ProviderBadge serviceID={item.serviceID} name={item.name} logo={(item as any).logo ?? item.image ?? null} size={36} />
                        <View>
                          <Text style={[styles.providerName, { color: palette.text }]}>{providerLabelFromService(item.serviceID, item.name)}</Text>
                          <Text style={[styles.providerMeta, { color: palette.textSecondary }]}>{item.name}</Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color={palette.textSecondary} />
                    </Pressable>
                  );
                }}
              />
            ) : <StateCard title="No data providers" description="VTpass did not return any data providers." icon={<Globe size={24} color={palette.textSecondary} />} />}
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
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, marginBottom: 10 },
  providerPill: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  planGrid: { gap: 10 },
  planCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  planTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  planName: { fontSize: Typography.md, fontFamily: Typography.family.bold, flex: 1 },
  planAmount: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  planMeta: { fontSize: Typography.xs },
  summary: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  summaryTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  summaryMeta: { fontSize: Typography.xs },
  summaryAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 2 },
  cta: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recent: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
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
  providerName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  providerMeta: { fontSize: Typography.xs },
});
