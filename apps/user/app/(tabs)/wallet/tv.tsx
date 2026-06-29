import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Radio, Search, ShieldCheck, Tv2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { PaymentPinModal } from '@/components/wallet/PaymentPinModal';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { ProviderBadge, providerLabelFromService } from '@/components/wallet/WalletFlow';
import { FlowProgressDots, useSlideStepTransition, useStepBackHandler } from '@/components/wallet/WalletFlowProgress';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useBuyTv, useProviderServices, useProviderVariations, useValidateProviderAccount, useVerifyTransferPin } from '@/hooks/useWallet';
import { formatNaira } from '@/lib/wallet';
import { triggerBiometricAuth } from '@/lib/localAuthentication';
import { usePreferencesStore } from '@/store/preferences.store';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { useAppPalette } from '@/lib/theme';

type ValidationResult = {
  name: string;
  address?: string;
};

export default function TvScreen() {
  const palette = useAppPalette();
  const mutation = useBuyTv();
  const validateMutation = useValidateProviderAccount();
  const services = useProviderServices('tv-subscription').data ?? [];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedServiceID, setSelectedServiceID] = useState('');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [selectedVariationCode, setSelectedVariationCode] = useState('');
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState('');
  const [resultModal, setResultModal] = useState<null | { visible: boolean; type: 'success' | 'failed' | 'pending'; title: string; message: string; amount?: string; reference?: string; returnAfterClose: boolean }>(null);
  const pinVerify = useVerifyTransferPin();
  const confirmTransactionsBiometricEnabled = usePreferencesStore((state) => state.confirmTransactionsBiometricEnabled);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinStatus, setPinStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pinError, setPinError] = useState("");
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricToast, setBiometricToast] = useState("");
  const { translateX } = useSlideStepTransition(step);
  const back = useSafeBack("/wallet");
  useStepBackHandler(step, () => { if (step > 1) { setStep((current) => (current - 1) as typeof step); } });

  const selectedService = services.find((service) => service.serviceID === selectedServiceID);
  const variationsQuery = useProviderVariations(selectedService?.serviceID);
  const variations = variationsQuery.data ?? [];
  const selectedVariation = variations.find((variation) => variation.variation_code === selectedVariationCode) ?? variations[0];
  const selectedPrice = Number(selectedVariation?.variation_amount ?? 0);
  const canReview = validationStatus === 'success' && Boolean(selectedService) && Boolean(selectedVariation);

  useEffect(() => {
    if (!selectedServiceID && services.length) setSelectedServiceID(services[0].serviceID);
  }, [selectedServiceID, services]);

  useEffect(() => {
    if (selectedService && !selectedVariationCode && variations.length) setSelectedVariationCode(variations[0].variation_code);
  }, [selectedService, selectedVariationCode, variations]);

  useEffect(() => {
    if (step !== 1 || !selectedService) return;
    const digits = smartcardNumber.trim();
    if (digits.length < 6) {
      setValidation(null);
      setValidationStatus('idle');
      setValidationError('');
      return;
    }

    const timer = setTimeout(() => {
      setValidationStatus('loading');
      void validateMutation.mutateAsync({ serviceID: selectedService.serviceID, billersCode: digits }).then((result) => {
        setValidation({ name: String(result.Customer_Name ?? result.Account_Number ?? 'Verified customer'), address: result.Address ? String(result.Address) : undefined });
        setValidationStatus('success');
        setValidationError('');
      }).catch((error) => {
        setValidation(null);
        setValidationStatus('error');
        setValidationError(error instanceof Error ? error.message : 'Please check the provider and smartcard number.');
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedService, smartcardNumber, step, validateMutation]);

  useEffect(() => {
    if (validationStatus === 'success' && step === 1) setStep(2);
  }, [step, validationStatus]);

  useEffect(() => {
    if (selectedService && variations.length && !variations.find((variation) => variation.variation_code === selectedVariationCode)) {
      setSelectedVariationCode(variations[0].variation_code);
    }
  }, [selectedService, selectedVariationCode, variations]);

  const headerBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as 1 | 2 | 3);
      return;
    }
    back();
  };

  const handleCloseResult = () => {
    const shouldReturn = resultModal?.returnAfterClose;
    setResultModal(null);
    if (shouldReturn) back();
  };

  const resetPaymentAuthState = () => {
    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(false);
  };

  const executePayment = async () => {
    if (!selectedService || !selectedVariation) return;

    const response = await mutation.mutateAsync({ smartcardNumber: smartcardNumber.trim(), amount: selectedPrice, provider: selectedService.serviceID, variationCode: selectedVariation.variation_code });
    setResultModal({
      visible: true,
      type: "success",
      title: "TV subscription paid",
      message: "Your TV subscription renewal completed successfully.",
      amount: formatNaira(selectedPrice),
      reference: response.data.reference,
      returnAfterClose: true,
    });
  };

  const submitPaymentWithPin = async (overridePin?: string) => {
    if (!selectedService || !selectedVariation || mutation.isPending) return;

    const trimmed = (overridePin ?? pin).trim();
    if (!/^[0-9]{4,6}$/.test(trimmed)) {
      setPinStatus("error");
      setPinError("Use a 4 to 6 digit transfer PIN.");
      return;
    }

    setPinStatus("loading");
    setPinError("");

    try {
      const verification = await pinVerify.mutateAsync({ pin: trimmed });
      if (!verification.data.verified) {
        throw new Error("That PIN is not valid.");
      }

      await executePayment();
      resetPaymentAuthState();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to complete TV subscription.";
      setPinError(reason);
      setPinStatus("error");
    }
  };

  const openPaymentAuth = async () => {
    if (!selectedService || !selectedVariation || biometricBusy || mutation.isPending) return;

    if (confirmTransactionsBiometricEnabled) {
      setBiometricBusy(true);
      try {
        const result = await triggerBiometricAuth({
          promptMessage: "Confirm this TV subscription",
          cancelLabel: "Use PIN",
          fallbackLabel: "Use PIN",
        });

        if (result.success) {
          await executePayment();
          return;
        }

        if (result.reason === "cancelled") {
          setBiometricToast(result.message);
        }
      } finally {
        setBiometricBusy(false);
      }
    }

    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(true);
  };
  const displayService = selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : 'Choose a provider';

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={headerBack}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>TV Subscription</Text>
        <Text style={[styles.title, { color: palette.text }]}>Choose the provider first, validate the smartcard, then pick a bouquet.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Live TV pricing</Text>
            <Text style={styles.heroValue}>{displayService}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Tv2 color="#fff" size={20} />
          </View>
        </View>
        <Text style={styles.heroBody}>Validation keeps the subscriber details visible before payment while the old step labels stay out of the form body.</Text>
        <FlowProgressDots currentStep={step} totalSteps={3} onStepPress={(targetStep) => { if (targetStep < step) setStep(targetStep as typeof step); }} />
      </View>

      <Animated.View style={{ transform: [{ translateX }] }}>
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Tv2 size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Provider and validation</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Select the TV provider and validate the smartcard number first.</Text>
              </View>
            </View>

            <Pressable onPress={() => setProviderPickerOpen(true)} style={[styles.selectRow, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <View style={styles.selectCopy}>
                <Text style={[styles.selectLabel, { color: palette.textSecondary }]}>Provider</Text>
                <View style={styles.selectValueRow}>
                  {selectedService ? <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logoUrl={selectedService.logoUrl ?? selectedService.logo ?? selectedService.image ?? null} size={28} /> : null}
                  <View style={{ gap: 2 }}>
                    <Text style={[styles.selectValue, { color: palette.text }]}>{displayService}</Text>
                    <Text style={[styles.selectMeta, { color: palette.textSecondary }]}>{selectedService?.name ?? 'Choose provider'}</Text>
                  </View>
                </View>
              </View>
              <ChevronDown size={18} color={palette.textSecondary} />
            </Pressable>

            <Input
              label="Smartcard number"
              value={smartcardNumber}
              onChangeText={(value) => {
                setSmartcardNumber(value.replace(/\s/g, ''));
                setValidation(null);
                setValidationStatus('idle');
                setValidationError('');
              }}
              keyboardType="number-pad"
              placeholder="Enter smartcard number"
              helperText="Validate the card before paying so the subscriber details are visible."
            />

            {validationStatus === 'loading' ? (
              <StateCard loading title="Validating smartcard" description="Checking the provider and subscriber details now." icon={<Search size={24} color={palette.textSecondary} />} />
            ) : validationStatus === 'success' && validation ? (
              <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
                <CheckCircle2 size={18} color={palette.success} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: palette.success }]}>{validation.name}</Text>
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{validation.address ?? 'Validated subscriber'}</Text>
                </View>
              </View>
            ) : validationStatus === 'error' ? (
              <View style={[styles.statusCard, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: palette.error }]}>
                <ShieldCheck size={18} color={palette.error} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: palette.error }]}>Validation failed</Text>
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{validationError || 'Please check the provider and smartcard number.'}</Text>
                </View>
              </View>
            ) : (
              <StateCard
                title={smartcardNumber.trim().length >= 6 ? "Provider changed — re-validating" : "Enter a smartcard number"}
                description={smartcardNumber.trim().length >= 6 ? `Checking ${smartcardNumber.trim()} against the new provider. This will complete automatically.` : "The subscriber details will appear before the bouquet step."}
                icon={<Search size={24} color={palette.textSecondary} />}
              />
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Radio size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Bouquet selection</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Choose the live bouquet you want to renew.</Text>
              </View>
            </View>

            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Subscriber</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>{validation?.name ?? 'Verified subscriber'}</Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{displayService}</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: palette.text }]}>Live bouquets</Text>
            {selectedService ? (
              variationsQuery.isLoading ? (
                <StateCard loading title="Loading bouquets" description="Fetching the current bouquet list from VTpass." icon={<Tv2 size={24} color={palette.textSecondary} />} />
              ) : variations.length ? (
                <View style={styles.planList}>
                  {variations.map((variation) => {
                    const active = variation.variation_code === selectedVariationCode;
                    return (
                      <Pressable key={variation.variation_code} onPress={() => setSelectedVariationCode(variation.variation_code)} style={[styles.planRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.planName, { color: palette.text }]}>{variation.name}</Text>
                          <Text style={[styles.planMeta, { color: palette.textSecondary }]}>{variation.fixedPrice === 'Yes' ? 'Fixed price' : 'Variable price'}</Text>
                        </View>
                        <Text style={[styles.planPrice, { color: palette.text }]}>{formatNaira(Number(variation.variation_amount))}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <StateCard title="No bouquets available" description="VTpass did not return any TV variations for the selected provider." icon={<Radio size={24} color={palette.textSecondary} />} />
              )
            ) : null}

            <Text style={[styles.amountHint, { color: palette.textSecondary }]}>Selected bouquet: {selectedVariation?.name ?? 'None'}</Text>

            <Pressable disabled={!canReview} onPress={() => setStep(3)} style={[styles.primaryAction, { backgroundColor: canReview ? palette.primary : palette.border }]}>
              <Text style={styles.primaryActionText}>Review subscription</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <CheckCircle2 size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Review</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Confirm the provider, bouquet, and amount before payment.</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>TV subscription</Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>{selectedVariation?.name ?? 'Select a bouquet'}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{displayService}</Text>
              <Text style={[styles.reviewAmount, { color: palette.text }]}>{selectedPrice ? formatNaira(selectedPrice) : '₦0'}</Text>
            </View>

            <Pressable
              disabled={!selectedService || !selectedVariation || mutation.isPending || biometricBusy}
              onPress={() => void openPaymentAuth()}
              style={[styles.primaryAction, { backgroundColor: selectedService && selectedVariation ? palette.primary : palette.border }]}
            >
              {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={styles.primaryActionText}>{selectedVariation ? `Renew for ${formatNaira(selectedPrice)}` : "Select a bouquet"}</Text>}
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      <TransactionResultModal
        visible={Boolean(resultModal?.visible)}
        type={resultModal?.type ?? 'pending'}
        title={resultModal?.title ?? ''}
        message={resultModal?.message ?? ''}
        amount={resultModal?.amount}
        reference={resultModal?.reference}
        onClose={handleCloseResult}
      />

      <PaymentPinModal
        visible={pinModalOpen}
        title="Enter transfer PIN"
        subtitle={`You are about to renew ${formatNaira(selectedPrice)}.`}
        reviewLabel="TV subscription"
        reviewTitle={selectedVariation?.name ?? "Select a bouquet"}
        reviewMeta={displayService}
        reviewAmount={formatNaira(selectedPrice)}
        pin={pin}
        onPinChange={(value) => {
          setPin(value);
          if (pinStatus !== "idle") setPinStatus("idle");
          if (pinError) setPinError("");
          if (value.length === 4) {
            void submitPaymentWithPin(value);
          }
        }}
        loading={pinStatus === "loading" || mutation.isPending}
        error={pinError || undefined}
        confirmLabel="Verify and pay"
        onConfirm={() => void submitPaymentWithPin()}
        onClose={() => {
          if (pinStatus === "loading" || mutation.isPending) return;
          resetPaymentAuthState();
        }}
        canClose={!(pinStatus === "loading" || mutation.isPending)}
        footerHint={biometricToast ? <Text style={[styles.biometricToast, { color: palette.textSecondary }]}>{biometricToast}</Text> : undefined}
      />
      <Modal visible={providerPickerOpen} transparent animationType="fade" onRequestClose={() => setProviderPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a provider</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select your TV provider below.</Text>
              </View>
              <Pressable onPress={() => setProviderPickerOpen(false)} style={[styles.modalClose, { backgroundColor: palette.bg }]}>
                <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
              </Pressable>
            </View>
            {services.length ? (
              <FlatList
                data={services}
                keyExtractor={(item) => item.serviceID}
                renderItem={({ item }) => {
                  const active = item.serviceID === selectedServiceID;
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedServiceID(item.serviceID);
                        setValidation(null);
                        setValidationStatus('idle');
                        setValidationError('');
                        // Return to step 1 so the smartcard is re-validated
                        // against the newly selected provider
                        setStep(1);
                        setProviderPickerOpen(false);
                      }}
                      style={[styles.providerRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg }]}
                    >
                      <View style={styles.providerRowLeft}>
                        <ProviderBadge serviceID={item.serviceID} name={item.name} logoUrl={item.logoUrl ?? item.logo ?? item.image ?? null} size={36} />
                        <View>
                          <Text style={[styles.providerRowName, { color: palette.text }]}>{providerLabelFromService(item.serviceID, item.name)}</Text>
                          <Text style={[styles.providerRowMeta, { color: palette.textSecondary }]}>{item.name}</Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color={palette.textSecondary} />
                    </Pressable>
                  );
                }}
              />
            ) : (
              <StateCard title="No TV providers" description="VTpass did not return any TV providers." icon={<Tv2 size={24} color={palette.textSecondary} />} />
            )}
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
  hero: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
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
  planList: { gap: 10 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md },
  planName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  planMeta: { fontSize: Typography.xs },
  planPrice: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  amountHint: { fontSize: Typography.xs },
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  reviewLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  reviewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.xs },
  reviewAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 2 },
  primaryAction: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  providerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  providerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  providerRowMeta: { fontSize: Typography.xs },
  biometricToast: { fontSize: Typography.xs, lineHeight: 16, textAlign: 'center' },
});
