import { ArrowLeft, ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, Search, ShieldCheck, Smartphone, Zap } from 'lucide-react-native';
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
import { useBuyElectricity, useProviderServices, useValidateProviderAccount, useVerifyTransferPin } from '@/hooks/useWallet';
import { formatNaira } from '@/lib/wallet';
import { triggerBiometricAuth } from '@/lib/localAuthentication';
import { usePreferencesStore } from '@/store/preferences.store';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { useAppPalette } from '@/lib/theme';

const amountPresets = [500, 1000, 2000, 5000] as const;

type ValidationResult = {
  name: string;
  address?: string;
};

export default function ElectricityScreen() {
  const palette = useAppPalette();
  const mutation = useBuyElectricity();
  const validateMutation = useValidateProviderAccount();
  const services = useProviderServices('electricity-bill').data ?? [];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedServiceID, setSelectedServiceID] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [amountPreset, setAmountPreset] = useState<string>('1000');
  const [customAmount, setCustomAmount] = useState('');
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
  const { opacity, translateX } = useSlideStepTransition(step);
  const back = useSafeBack("/wallet");
  useStepBackHandler(step, () => { if (step > 1) { setStep((current) => (current - 1) as typeof step); } });

  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const amountValue = Number((customAmount || amountPreset || '0').replace(/,/g, ''));
  const displayService = selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : 'Choose a provider';

  useEffect(() => {
    if (!selectedServiceID && services.length) setSelectedServiceID(services[0].serviceID);
  }, [selectedServiceID, services]);

  useEffect(() => {
    if (step !== 1 || !selectedService) return;
    const digits = meterNumber.trim();
    if (digits.length < 8) {
      setValidation(null);
      setValidationStatus('idle');
      setValidationError('');
      return;
    }

    const timer = setTimeout(() => {
      setValidationStatus('loading');
      void validateMutation.mutateAsync({ serviceID: selectedService.serviceID, billersCode: digits, type: meterType }).then((result) => {
        setValidation({ name: String(result.Customer_Name ?? result.Meter_Number ?? 'Verified customer'), address: result.Address ? String(result.Address) : undefined });
        setValidationStatus('success');
        setValidationError('');
      }).catch((error) => {
        setValidation(null);
        setValidationStatus('error');
        setValidationError(error instanceof Error ? error.message : 'Please check the meter number and provider.');
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [meterNumber, meterType, selectedService, step, validateMutation]);

  useEffect(() => {
    if (validationStatus === 'success' && step === 1) setStep(2);
  }, [step, validationStatus]);

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

  const amountValid = amountValue > 0;

  const resetPaymentAuthState = () => {
    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(false);
  };

  const executePayment = async () => {
    if (!selectedService) return;

    const response = await mutation.mutateAsync({ meterNumber: meterNumber.trim(), amount: amountValue, disco: selectedService.serviceID, type: meterType });
    setResultModal({
      visible: true,
      type: "success",
      title: "Electricity paid",
      message: "Your electricity payment completed successfully.",
      amount: formatNaira(amountValue),
      reference: response.data.reference,
      returnAfterClose: true,
    });
  };

  const submitPaymentWithPin = async (overridePin?: string) => {
    if (!selectedService || mutation.isPending) return;

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
      const reason = error instanceof Error ? error.message : "Unable to complete electricity payment.";
      setPinError(reason);
      setPinStatus("error");
    }
  };

  const openPaymentAuth = async () => {
    if (!selectedService || biometricBusy || mutation.isPending) return;

    if (confirmTransactionsBiometricEnabled) {
      setBiometricBusy(true);
      try {
        const result = await triggerBiometricAuth({
          promptMessage: "Confirm this electricity payment",
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
  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={headerBack}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Electricity</Text>
        <Text style={[styles.title, { color: palette.text }]}>Pick the disco first, validate the meter, then choose the amount.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Selected provider</Text>
            <Text style={styles.heroValue}>{displayService}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Zap size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>Provider logos and validation status come from the provider APIs, and only one step stays visible at a time.</Text>
        <FlowProgressDots currentStep={step} totalSteps={3} onStepPress={(targetStep) => { if (targetStep < step) setStep(targetStep as typeof step); }} />
      </View>

      <Animated.View style={{ opacity, transform: [{ translateX }] }}>
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Zap size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Provider and validation</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Select the disco, meter type, and validate the meter first.</Text>
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

            <View style={styles.typeToggle}>
              {(['prepaid', 'postpaid'] as const).map((type) => {
                const active = type === meterType;
                return (
                  <Pressable key={type} onPress={() => setMeterType(type)} style={[styles.typePill, { backgroundColor: active ? palette.text : palette.bg }]}>
                    <Text style={[styles.typeText, { color: active ? palette.card : palette.text }]}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Meter number"
              value={meterNumber}
              onChangeText={(value) => {
                setMeterNumber(value);
                setValidation(null);
                setValidationStatus('idle');
                setValidationError('');
              }}
              keyboardType="number-pad"
              placeholder="1234567890"
              leftElement={<Smartphone size={16} color={palette.textSecondary} />}
              helperText="Validate the meter before payment so the customer name shows first."
            />

            {validationStatus === 'loading' ? (
              <StateCard loading title="Validating meter" description="Checking the provider and subscriber details now." icon={<Search size={24} color={palette.textSecondary} />} />
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
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{validationError || 'Please check the meter number and provider.'}</Text>
                </View>
              </View>
            ) : (
              <StateCard title="Enter a meter number" description="The subscriber details will appear before the amount step." icon={<Search size={24} color={palette.textSecondary} />} />
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <ArrowUpRight size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Amount</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Choose a preset or enter a custom amount for the meter.</Text>
              </View>
            </View>

            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Meter</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>{validation?.name ?? 'Validated subscriber'}</Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{displayService} • {meterType}</Text>
            </View>

            <View style={styles.amountGrid}>
              {amountPresets.map((value) => {
                const active = amountPreset === String(value) && !customAmount;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setAmountPreset(String(value));
                      setCustomAmount('');
                    }}
                    style={({ pressed }) => [styles.amountChip, { backgroundColor: active ? palette.text : palette.card, borderColor: active ? palette.text : palette.border, transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }] }]}
                  >
                    <Text style={[styles.amountChipText, { color: active ? palette.card : palette.text }]}>{formatNaira(value)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Custom amount"
              value={customAmount}
              onChangeText={(value) => {
                setCustomAmount(value.replace(/[^0-9]/g, ''));
                if (value) setAmountPreset('');
              }}
              keyboardType="number-pad"
              placeholder="Optional override"
              leftElement={<Text style={[styles.prefix, { color: palette.textSecondary }]}>₦</Text>}
            />

            <Text style={[styles.amountHint, { color: palette.textSecondary }]}>Selected amount: {amountValue ? formatNaira(amountValue) : '₦0'}</Text>

            <Pressable disabled={!amountValid || mutation.isPending || biometricBusy} onPress={() => void openPaymentAuth()} style={[styles.primaryAction, { backgroundColor: amountValid ? palette.primary : palette.border }]}>
              <Text style={styles.primaryActionText}>Review electricity payment</Text>
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
        subtitle={`You are about to pay ${formatNaira(amountValue)} for electricity.`}
        reviewLabel="Electricity"
        reviewTitle={displayService}
        reviewMeta={`${meterNumber} • ${meterType}`}
        reviewAmount={formatNaira(amountValue)}
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
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select your electricity disco below.</Text>
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
              <StateCard title="No electricity providers" description="VTpass did not return any electricity providers." icon={<Zap size={24} color={palette.textSecondary} />} />
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
  typeToggle: { flexDirection: 'row', gap: 10 },
  typePill: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontFamily: Typography.family.bold },
  statusCard: { borderWidth: 1, borderRadius: 18, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusMeta: { fontSize: Typography.xs, lineHeight: 16 },
  summaryMini: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  summaryMiniLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryMiniValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryMiniMeta: { fontSize: Typography.xs },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: { width: '48%', minHeight: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  amountChipText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  prefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
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
