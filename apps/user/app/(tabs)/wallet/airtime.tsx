import { ArrowLeft, ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, ContactRound, Search, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBeneficiaryStore } from '@/store/beneficiary.store';
import { haptics } from '@/utils/haptics';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { PaymentPinModal } from '@/components/wallet/PaymentPinModal';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { normalizeNigerianPhone, isValidNigerianPhone, providerLabelFromService, ProviderBadge } from '@/components/wallet/WalletFlow';
import { FlowProgressDots, useSlideStepTransition, useStepBackHandler } from '@/components/wallet/WalletFlowProgress';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useBuyAirtime, useProviderServices, useResolveAirtimeProvider, useVerifyTransferPin, useWallet } from '@/hooks/useWallet';
import { formatNaira } from '@/lib/wallet';
import { triggerBiometricAuth } from '@/lib/localAuthentication';
import { usePreferencesStore } from '@/store/preferences.store';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { useAppPalette } from '@/lib/theme';

const presetAmounts = [100, 500, 1000, 2000, 5000, 10000] as const;

type ProviderSelection = {
  phone: string;
  serviceID: string;
  providerName: string;
  confidence: 'high' | 'low';
};

export default function AirtimeScreen() {
  const palette = useAppPalette();
  const walletQuery = useWallet();
  const wallet = walletQuery.data;
  const mutation = useBuyAirtime();
  const providerResolve = useResolveAirtimeProvider();
  const services = useProviderServices('airtime').data ?? [];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [selectedServiceID, setSelectedServiceID] = useState('');
  const [amountPreset, setAmountPreset] = useState<string>('500');
  const [customAmount, setCustomAmount] = useState('');
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [providerValidation, setProviderValidation] = useState<ProviderSelection | null>(null);
  const [providerStatus, setProviderStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [providerError, setProviderError] = useState('');
  const [lowConfidenceBanner, setLowConfidenceBanner] = useState(false);
  const [resultModal, setResultModal] = useState<null | { visible: boolean; type: 'success' | 'failed' | 'pending'; title: string; message: string; amount?: string; reference?: string; returnAfterClose: boolean }>(null);
  const pinVerify = useVerifyTransferPin();
  const confirmTransactionsBiometricEnabled = usePreferencesStore((state) => state.confirmTransactionsBiometricEnabled);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinStatus, setPinStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pinError, setPinError] = useState("");
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricToast, setBiometricToast] = useState("");
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const { beneficiaries, addBeneficiary, removeBeneficiary } = useBeneficiaryStore();
  const airtimeBeneficiaries = beneficiaries.filter((b) => b.type === 'AIRTIME');
  const { opacity, translateX } = useSlideStepTransition(step);
  const back = useSafeBack("/wallet");
  useStepBackHandler(step, () => { if (step > 1) { setStep((current) => (current - 1) as typeof step); } });

  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const normalizedPhone = normalizeNigerianPhone(phone);
  const selectedAmount = Number((customAmount || amountPreset || '0').replace(/,/g, ''));
  const amountValid = selectedAmount > 0 && (!wallet || selectedAmount <= wallet.balance);
  const displayNetwork = providerValidation?.providerName ?? (selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : 'Network');
  const canReview = providerStatus === 'success' && Boolean(selectedService) && amountValid;

  useEffect(() => {
    if (!selectedServiceID && services.length) setSelectedServiceID(services[0].serviceID);
  }, [selectedServiceID, services]);

  const handleResolveProvider = async () => {
    if (!isValidNigerianPhone(phone) || providerResolve.isPending) {
      setProviderValidation(null);
      setProviderStatus('error');
      setProviderError('Enter a valid Nigerian phone number.');
      return;
    }

    setProviderStatus('loading');
    setProviderError('');
    setLowConfidenceBanner(false);

    try {
      const response = await providerResolve.mutateAsync({ phone: normalizedPhone });
      const result = response.data;
      setProviderValidation(result);
      setProviderStatus('success');
      setProviderError('');
      const resolved = result.serviceID.toLowerCase();
      const match = resolved.includes('mtn')
        ? services.find((service) => service.serviceID.toLowerCase().includes('mtn'))
        : resolved.includes('airtel')
          ? services.find((service) => service.serviceID.toLowerCase().includes('airtel'))
          : resolved.includes('glo')
            ? services.find((service) => service.serviceID.toLowerCase().includes('glo'))
            : services.find((service) => {
                const haystack = `${service.serviceID} ${service.name}`.toLowerCase();
                return haystack.includes('9mobile') || haystack.includes('etisalat') || haystack.includes('t2');
              });
      if (match) setSelectedServiceID(match.serviceID);

      if (result.confidence === 'low') {
        setLowConfidenceBanner(true);
        setProviderPickerOpen(true);
        return;
      }

      setStep(2);
    } catch (error) {
      setProviderValidation(null);
      setProviderStatus('error');
      setProviderError(error instanceof Error ? error.message : 'Unable to detect the provider.');
    }
  };

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

  const title = providerValidation?.providerName ?? (selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : 'Airtime');
  const resetPaymentAuthState = () => {
    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(false);
  };

  const executePayment = async () => {
    // Pass the VTpass serviceID (e.g. "mtn-airtime") as the network so the
    // backend can use it directly rather than relying on string matching.
    const networkId = selectedService?.serviceID ?? displayNetwork;
    const response = await mutation.mutateAsync({ phone: normalizedPhone || phone, network: networkId, amount: selectedAmount });
    setResultModal({
      visible: true,
      type: "success",
      title: "Airtime bought",
      message: "Your airtime purchase completed successfully.",
      amount: formatNaira(selectedAmount),
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
      const reason = error instanceof Error ? error.message : "Unable to complete airtime purchase.";
      setPinError(reason);
      setPinStatus("error");
    }
  };

  const openPaymentAuth = async () => {
    if (!canReview || biometricBusy || mutation.isPending) return;

    if (confirmTransactionsBiometricEnabled) {
      setBiometricBusy(true);
      try {
        const result = await triggerBiometricAuth({
          promptMessage: "Confirm this airtime purchase",
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
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Airtime</Text>
        <Text style={[styles.title, { color: palette.text }]}>Resolve the network first, then choose the amount, then review.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Active provider</Text>
            <Text style={styles.heroValue}>{displayNetwork}</Text>
          </View>
          <View style={styles.heroIcon}>
            <ArrowUpRight size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>The provider is resolved from the phone number first, keeping the flow progressive and compact.</Text>
        <FlowProgressDots currentStep={step} totalSteps={3} onStepPress={(targetStep) => { if (targetStep < step) setStep(targetStep as typeof step); }} />
      </View>

      <Animated.View style={{ opacity, transform: [{ translateX }] }}>
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Smartphone size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Provider detection</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Enter the phone number and we will auto-detect the operator.</Text>
              </View>
            </View>

            <Input
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="08012345678"
              leftElement={
                <Pressable onPress={() => setProviderPickerOpen(true)} style={styles.networkPill}>
                  {selectedService ? <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logoUrl={selectedService.logoUrl ?? selectedService.logo ?? selectedService.image ?? null} size={22} /> : null}
                  <Text style={[styles.networkText, { color: palette.text }]}>{displayNetwork}</Text>
                  <ChevronDown size={14} color={palette.textSecondary} />
                </Pressable>
              }
              rightElement={
                <Pressable onPress={() => setContactsModalOpen(true)} style={styles.contactButton}>
                  <ContactRound size={18} color={palette.primary} />
                </Pressable>
              }
              helperText="If lookup fails, choose the provider manually."
            />

            <Pressable
              disabled={providerStatus === 'loading'}
              onPress={() => void handleResolveProvider()}
              style={[styles.primaryAction, { backgroundColor: providerStatus === 'loading' ? palette.border : palette.primary }]}
            >
              <Text style={styles.primaryActionText}>{providerStatus === 'loading' ? 'Checking provider...' : 'Validate number'}</Text>
            </Pressable>

            {providerStatus === 'loading' ? (
              <StateCard loading title="Detecting provider" description="Checking the phone number against the network resolver." icon={<Search size={24} color={palette.textSecondary} />} />
            ) : providerStatus === 'success' && providerValidation ? (
              <>
                {lowConfidenceBanner ? (
                  <View style={[styles.statusCard, { backgroundColor: 'rgba(255,159,10,0.10)', borderColor: '#FF9F0A' }]}>
                    <ShieldCheck size={18} color="#FF9F0A" />
                    <View style={styles.statusCopy}>
                      <Text style={[styles.statusTitle, { color: '#FF9F0A' }]}>Network guessed — please confirm</Text>
                      <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>We detected <Text style={{ fontFamily: 'System', fontWeight: '700' }}>{providerValidation.providerName}</Text> with low confidence. Tap to change if incorrect.</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
                    <CheckCircle2 size={18} color={palette.success} />
                    <View style={styles.statusCopy}>
                      <Text style={[styles.statusTitle, { color: palette.success }]}>{providerValidation.providerName}</Text>
                      <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{providerValidation.phone}</Text>
                    </View>
                  </View>
                )}
                {lowConfidenceBanner ? (
                  <>
                    <Pressable
                      onPress={() => setProviderPickerOpen(true)}
                      style={[styles.secondaryAction, { borderColor: palette.border, backgroundColor: palette.card }]}
                    >
                      <Text style={[styles.secondaryActionText, { color: palette.text }]}>Change network</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { setLowConfidenceBanner(false); setStep(2); }}
                      style={[styles.primaryAction, { backgroundColor: palette.primary }]}
                    >
                      <Text style={styles.primaryActionText}>Confirm {displayNetwork} and continue</Text>
                    </Pressable>
                  </>
                ) : null}
              </>
            ) : providerStatus === 'error' ? (
              <View style={[styles.statusCard, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: palette.error }]}>
                <ShieldCheck size={18} color={palette.error} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: palette.error }]}>Provider lookup failed</Text>
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{providerError || 'Choose a provider manually.'}</Text>
                </View>
              </View>
            ) : (
              <StateCard title="Enter a phone number" description="The network will be detected before the amount step appears." icon={<Search size={24} color={palette.textSecondary} />} />
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
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Choose a quick amount or enter a custom value.</Text>
              </View>
            </View>

            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Recipient</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>{normalizedPhone || 'No phone entered'}</Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{title}</Text>
            </View>

            <View style={styles.amountGrid}>
              {presetAmounts.map((value) => {
                const active = amountPreset === String(value) && !customAmount;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setAmountPreset(String(value));
                      setCustomAmount('');
                    }}
                    style={({ pressed }) => [
                      styles.amountChip,
                      { backgroundColor: active ? palette.text : palette.card, borderColor: active ? palette.text : palette.border, transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }] },
                    ]}
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
              placeholder="50 - 50,000"
              leftElement={<Text style={[styles.prefix, { color: palette.textSecondary }]}>₦</Text>}
              helperText={amountValid ? `Wallet balance covers ${formatNaira(selectedAmount)}.` : wallet ? 'Amount must not exceed the available wallet balance.' : undefined}
            />

            <Text style={[styles.amountHint, { color: palette.textSecondary }]}>Selected amount: {selectedAmount ? formatNaira(selectedAmount) : '₦0'}</Text>

            <Pressable
              disabled={!canReview}
              onPress={() => setStep(3)}
              style={[styles.primaryAction, { backgroundColor: canReview ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>Review airtime purchase</Text>
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
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Confirm the phone number and amount before you pay.</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Airtime</Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>{displayNetwork}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{normalizedPhone}</Text>
              <Text style={[styles.reviewAmount, { color: palette.text }]}>{selectedAmount ? formatNaira(selectedAmount) : '₦0'}</Text>
            </View>
            <Pressable
              disabled={!canReview || mutation.isPending || biometricBusy}
              onPress={() => void openPaymentAuth()}
              style={[styles.primaryAction, { backgroundColor: canReview ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>{selectedAmount > 0 ? `Pay ${formatNaira(selectedAmount)}` : "Select an amount"}</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      <Modal visible={providerPickerOpen} transparent animationType="fade" onRequestClose={() => setProviderPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a provider</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select your provider below.</Text>
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
                        setProviderValidation({ phone: normalizedPhone, serviceID: item.serviceID, providerName: providerLabelFromService(item.serviceID, item.name), confidence: 'low' });
                        setProviderStatus('success');
                        setProviderPickerOpen(false);
                      }}
                      style={[styles.providerRow, { backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg, borderColor: active ? palette.primary : palette.border }]}
                    >
                      <View style={styles.providerRowLeft}>
                        <ProviderBadge serviceID={item.serviceID} name={item.name} logoUrl={item.logoUrl ?? item.logo ?? item.image ?? null} size={36} />
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
            ) : (
              <StateCard title="No airtime providers" description="VTpass did not return any airtime providers." icon={<Smartphone size={24} color={palette.textSecondary} />} />
            )}
          </View>
        </View>
      </Modal>
      <PaymentPinModal
        visible={pinModalOpen}
        title="Enter transfer PIN"
        subtitle={`You are about to send ${formatNaira(selectedAmount)}.`}
        reviewLabel="Airtime"
        reviewTitle={displayNetwork}
        reviewMeta={normalizedPhone}
        reviewAmount={formatNaira(selectedAmount)}
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

      <TransactionResultModal
        visible={Boolean(resultModal?.visible)}
        type={resultModal?.type ?? 'pending'}
        title={resultModal?.title ?? ''}
        message={resultModal?.message ?? ''}
        amount={resultModal?.amount}
        reference={resultModal?.reference}
        onClose={handleCloseResult}
      />

      <Modal visible={contactsModalOpen} transparent animationType="slide" onRequestClose={() => { setContactsModalOpen(false); setIsAddingContact(false); setNewContactName(''); }}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setContactsModalOpen(false); setIsAddingContact(false); setNewContactName(''); }} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Saved Contacts</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select a saved contact or save the current number.</Text>
              </View>
              <Pressable onPress={() => { setContactsModalOpen(false); setIsAddingContact(false); setNewContactName(''); }} style={[styles.modalClose, { backgroundColor: palette.bg }]}>
                <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
              </Pressable>
            </View>

            {isAddingContact ? (
              <View style={styles.addContactForm}>
                <Input
                  label="Contact name"
                  value={newContactName}
                  onChangeText={setNewContactName}
                  placeholder="e.g. Mom, Work Phone"
                  helperText={`Saving phone number: ${phone}`}
                />
                <View style={styles.addContactActions}>
                  <Pressable
                    onPress={() => setIsAddingContact(false)}
                    style={[styles.cancelBtn, { borderColor: palette.border }]}
                  >
                    <Text style={{ color: palette.text, fontFamily: Typography.family.bold }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!newContactName.trim()) {
                        Alert.alert("Error", "Please enter a contact name.");
                        return;
                      }
                      void haptics.success();
                      addBeneficiary({
                        name: newContactName.trim(),
                        phone: normalizedPhone || phone,
                        serviceID: selectedServiceID,
                        bankName: displayNetwork,
                        type: 'AIRTIME',
                      });
                      setIsAddingContact(false);
                      setNewContactName('');
                    }}
                    style={[styles.saveBtn, { backgroundColor: palette.primary }]}
                  >
                    <Text style={{ color: '#fff', fontFamily: Typography.family.bold }}>Save Contact</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                {isValidNigerianPhone(phone) && !airtimeBeneficiaries.some(b => b.phone === (normalizedPhone || phone)) && (
                  <Pressable
                    onPress={() => setIsAddingContact(true)}
                    style={[styles.addCurrentRow, { borderColor: palette.primary, backgroundColor: 'rgba(10,132,255,0.05)' }]}
                  >
                    <ContactRound size={16} color={palette.primary} />
                    <Text style={[styles.addCurrentText, { color: palette.primary }]}>
                      Save "{phone}" to Contacts
                    </Text>
                  </Pressable>
                )}

                <FlatList
                  data={airtimeBeneficiaries}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: palette.textSecondary }]}>No saved contacts yet.</Text>
                  }
                  renderItem={({ item }) => (
                    <View style={[styles.contactRow, { borderColor: palette.border }]}>
                      <Pressable
                        onPress={() => {
                          void haptics.tap();
                          setPhone(item.phone || '');
                          if (item.serviceID) {
                            setSelectedServiceID(item.serviceID);
                            setProviderValidation({
                              phone: item.phone || '',
                              serviceID: item.serviceID,
                              providerName: item.bankName || 'Network',
                              confidence: 'high',
                            });
                            setProviderStatus('success');
                            setStep(2);
                          }
                          setContactsModalOpen(false);
                        }}
                        style={styles.contactRowLeft}
                      >
                        <View style={[styles.contactAvatarCircle, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                          <Text style={[styles.contactAvatarText, { color: palette.text }]}>
                            {item.name.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.contactName, { color: palette.text }]}>{item.name}</Text>
                          <Text style={[styles.contactPhone, { color: palette.textSecondary }]}>
                            {item.phone} • {item.bankName || 'Network'}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          void haptics.warning();
                          Alert.alert("Remove Contact", `Are you sure you want to remove ${item.name}?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Remove", style: "destructive", onPress: () => removeBeneficiary(item.id) }
                          ]);
                        }}
                        style={styles.deleteBtn}
                      >
                        <Text style={{ color: palette.error, fontSize: Typography.xs, fontFamily: Typography.family.bold }}>Remove</Text>
                      </Pressable>
                    </View>
                  )}
                  style={styles.contactsList}
                />
              </>
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
  networkPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  networkText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  contactButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,132,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  statusCard: { borderWidth: 1, borderRadius: 18, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusMeta: { fontSize: Typography.xs, lineHeight: 16 },
  summaryMini: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  summaryMiniLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryMiniValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryMiniMeta: { fontSize: Typography.xs },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: { borderRadius: 16, borderWidth: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', width: '48%' },
  amountChipText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  prefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  amountHint: { fontSize: Typography.xs, marginTop: -4 },
  biometricToast: { fontSize: Typography.xs, lineHeight: 16, textAlign: "center" },
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  reviewLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  reviewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.xs },
  reviewAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 2 },
  primaryAction: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondaryAction: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryActionText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  providerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  providerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  providerMeta: { fontSize: Typography.xs },
  addContactForm: {
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  addContactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 2,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: Spacing.md,
  },
  addCurrentText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  contactsList: {
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: 10,
  },
  contactRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contactAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  contactName: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  contactPhone: {
    fontSize: Typography.xs,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyText: {
    fontSize: Typography.sm,
    textAlign: 'center',
    paddingVertical: 18,
  },
});
