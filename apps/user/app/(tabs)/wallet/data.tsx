import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, ContactRound, Globe, Search, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
import { useBuyData, useProviderServices, useProviderVariations, useResolveAirtimeProvider, useVerifyTransferPin, useWallet } from '@/hooks/useWallet';
import { formatNaira } from '@/lib/wallet';
import { triggerBiometricAuth } from '@/lib/localAuthentication';
import { usePreferencesStore } from '@/store/preferences.store';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { useAppPalette, isLight } from '@/lib/theme';

type ProviderSelection = {
  phone: string;
  serviceID: string;
  providerName: string;
  confidence: 'high' | 'low';
};

export default function DataScreen() {
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const walletQuery = useWallet();
  const wallet = walletQuery.data;
  const mutation = useBuyData();
  const providerResolve = useResolveAirtimeProvider();
  const services = useProviderServices('data').data ?? [];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [selectedServiceID, setSelectedServiceID] = useState('');
  const [selectedVariationCode, setSelectedVariationCode] = useState('');
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [providerValidation, setProviderValidation] = useState<ProviderSelection | null>(null);
  const [providerStatus, setProviderStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [providerError, setProviderError] = useState('');
  const [resultModal, setResultModal] = useState<null | { visible: boolean; type: 'success' | 'failed' | 'pending'; title: string; message: string; amount?: string; reference?: string; returnAfterClose: boolean }>(null);
  const pinVerify = useVerifyTransferPin();
  const confirmTransactionsBiometricEnabled = usePreferencesStore((state) => state.confirmTransactionsBiometricEnabled);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinStatus, setPinStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pinError, setPinError] = useState("");
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricToast, setBiometricToast] = useState("");
  const [dataContactsModalOpen, setDataContactsModalOpen] = useState(false);
  const { beneficiaries, removeBeneficiary } = useBeneficiaryStore();
  // Reuse AIRTIME type — these are phone-based contacts shared with airtime screen
  const dataContacts = beneficiaries.filter((b) => b.type === 'AIRTIME');
  const { translateX } = useSlideStepTransition(step);
  const back = useSafeBack("/wallet");
  useStepBackHandler(step, () => { if (step > 1) { setStep((current) => (current - 1) as typeof step); } });

  const TABS = ['Popular', 'Daily', 'Weekly', 'Monthly', 'Broad'] as const;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Popular');

  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const variationsQuery = useProviderVariations(selectedService?.serviceID);
  const variations = variationsQuery.data ?? [];

  const parsedVariations = useMemo(() => {
    return variations.map((v) => {
      const name = v.name;
      const sizeMatch = name.match(/(\d+(?:\.\d+)?\s*(?:GB|MB|KB|TB))/i);
      const size = sizeMatch ? sizeMatch[0] : name;

      let duration = '30 Days';
      const lower = name.toLowerCase();

      let category: 'popular' | 'daily' | 'weekly' | 'monthly' | 'broad' = 'popular';

      if (lower.includes('broadband') || lower.includes('router') || lower.includes('mifi') || lower.includes('fiber') || lower.includes('unlimited')) {
        category = 'broad';
        duration = 'Broadband';
      } else if (lower.includes('daily') || lower.includes('1-day') || lower.includes('1 day') || lower.includes('24 hrs') || lower.includes('24hrs') || lower.includes('2-day') || lower.includes('2 day') || lower.includes('3-day') || lower.includes('3 day') || lower.includes('1d') || lower.includes('2d') || lower.includes('3d')) {
        category = 'daily';
        duration = 'Daily';
      } else if (lower.includes('weekly') || lower.includes('7-day') || lower.includes('7 day') || lower.includes('14-day') || lower.includes('14 day') || lower.includes('7d') || lower.includes('14d')) {
        category = 'weekly';
        duration = 'Weekly';
      } else if (lower.includes('monthly') || lower.includes('30-day') || lower.includes('30 day') || lower.includes('31-day') || lower.includes('30 days') || lower.includes('30d') || lower.includes('month') || lower.includes('mo')) {
        category = 'monthly';
        duration = 'Monthly';
      } else {
        category = 'popular';
        duration = 'Monthly';
      }

      const dayMatch = name.match(/(\d+\s*days?)/i);
      if (dayMatch) {
        duration = dayMatch[0];
      } else if (category === 'daily') {
        duration = '1 Day';
      } else if (category === 'weekly') {
        duration = '7 Days';
      }

      return {
        ...v,
        size,
        duration,
        category,
      };
    });
  }, [variations]);

  const filteredVariations = useMemo(() => {
    if (activeTab === 'Popular') {
      const populars = parsedVariations.filter((v) => v.category === 'popular');
      return populars.length > 0 ? populars : parsedVariations.slice(0, 10);
    }
    const cat = activeTab.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'broad';
    return parsedVariations.filter((v) => v.category === cat);
  }, [parsedVariations, activeTab]);

  const selectedVariation = parsedVariations.find((variation) => variation.variation_code === selectedVariationCode) ?? parsedVariations[0];
  const selectedPrice = Number(selectedVariation?.variation_amount ?? 0);
  const normalizedPhone = normalizeNigerianPhone(phone);
  const displayNetwork = providerValidation?.providerName ?? (selectedService ? providerLabelFromService(selectedService.serviceID, selectedService.name) : 'Network');
  const amountValid = selectedPrice > 0 && (!wallet || selectedPrice <= wallet.balance);
  const canReview = providerStatus === 'success' && Boolean(selectedService) && Boolean(selectedVariation) && amountValid;

  useEffect(() => {
    if (!selectedServiceID && services.length) setSelectedServiceID(services[0].serviceID);
  }, [selectedServiceID, services]);

  useEffect(() => {
    if (selectedService && !selectedVariationCode && variations.length) setSelectedVariationCode(variations[0].variation_code);
  }, [selectedService, selectedVariationCode, variations]);

  useEffect(() => {
    if (selectedService && parsedVariations.length && !parsedVariations.find((variation) => variation.variation_code === selectedVariationCode)) {
      setSelectedVariationCode(parsedVariations[0].variation_code);
    }
  }, [selectedService, selectedVariationCode, parsedVariations]);

  const handleResolveProvider = async () => {
    if (!isValidNigerianPhone(phone) || providerResolve.isPending) {
      setProviderValidation(null);
      setProviderStatus('error');
      setProviderError('Enter a valid Nigerian phone number.');
      return;
    }

    setProviderStatus('loading');
    setProviderError('');

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

  const resetPaymentAuthState = () => {
    setPin("");
    setPinStatus("idle");
    setPinError("");
    setPinModalOpen(false);
  };

  const executePayment = async () => {
    if (!selectedService || !selectedVariation) return;

    const response = await mutation.mutateAsync({
      phone: normalizedPhone,
      network: selectedService.serviceID,
      amount: selectedPrice,
      plan: selectedVariation.name,
      variationCode: selectedVariation.variation_code,
      serviceID: selectedService.serviceID,
    });

    setResultModal({
      visible: true,
      type: "success",
      title: "Data purchased",
      message: "Your data bundle purchase completed successfully.",
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
      const reason = error instanceof Error ? error.message : "Unable to complete data purchase.";
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
          promptMessage: "Confirm this data purchase",
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
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Data</Text>
        <Text style={[styles.title, { color: palette.text }]}>Resolve the network first, pick the bundle second, then review.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Live provider check</Text>
            <Text style={styles.heroValue}>{displayNetwork}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Globe color="#fff" size={20} />
          </View>
        </View>
        <Text style={styles.heroBody}>The number is checked first, then the live bundles load from VTpass with provider logos.</Text>
        <FlowProgressDots currentStep={step} totalSteps={3} onStepPress={(targetStep) => { if (targetStep < step) setStep(targetStep as typeof step); }} />
      </View>

      <Animated.View style={{ transform: [{ translateX }] }}>
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Smartphone size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Provider detection</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Enter the phone number and we will auto-detect the network.</Text>
              </View>
            </View>

            <Input
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="08012345678"
              leftElement={
                <Pressable onPress={() => setProviderPickerOpen(true)} style={styles.providerPill}>
                  {selectedService ? <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logoUrl={selectedService.logoUrl ?? selectedService.logo ?? selectedService.image ?? null} size={22} /> : null}
                  <Text style={[styles.providerText, { color: palette.text }]}>{displayNetwork}</Text>
                  <ChevronDown size={14} color={palette.textSecondary} />
                </Pressable>
              }
              helperText="If lookup fails, you can pick the provider manually."
              rightElement={
                <Pressable onPress={() => setDataContactsModalOpen(true)} style={styles.contactButton}>
                  <ContactRound size={18} color={palette.primary} />
                </Pressable>
              }
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
              <View style={[styles.statusCard, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
                <CheckCircle2 size={18} color={palette.success} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: palette.success }]}>{providerValidation.providerName}</Text>
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{providerValidation.phone}</Text>
                </View>
              </View>
            ) : providerStatus === 'error' ? (
              <View style={[styles.statusCard, { backgroundColor: 'rgba(255,69,58,0.08)', borderColor: palette.error }]}>
                <ShieldCheck size={18} color={palette.error} />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: palette.error }]}>Provider lookup failed</Text>
                  <Text style={[styles.statusMeta, { color: palette.textSecondary }]}>{providerError || 'Choose a provider manually.'}</Text>
                </View>
              </View>
            ) : (
              <StateCard title="Enter a phone number" description="The network will be detected before the bundle step appears." icon={<Search size={24} color={palette.textSecondary} />} />
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Globe size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Bundle selection</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Pick a live bundle. The price follows the selected variation.</Text>
              </View>
            </View>

            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Recipient</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>{normalizedPhone || 'No phone entered'}</Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{displayNetwork}</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 8 }]}>Plans</Text>
            {selectedService ? (
              variationsQuery.isLoading ? (
                <StateCard loading title="Loading plans" description="Fetching live data bundles." icon={<Globe size={24} color={palette.textSecondary} />} />
              ) : variations.length ? (
                <>
                  <View style={[styles.tabBarContainer, { borderBottomColor: lightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                      {TABS.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                          <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={styles.tabButton}
                          >
                            <Text style={[styles.tabText, { color: isActive ? palette.primary : palette.textSecondary }]}>
                              {tab}
                            </Text>
                            {isActive ? <View style={[styles.tabIndicator, { backgroundColor: palette.primary }]} /> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {filteredVariations.length ? (
                    <View style={styles.planGrid}>
                      {filteredVariations.map((variation) => {
                        const active = variation.variation_code === selectedVariationCode;
                        const cardBg = lightBg ? (active ? 'rgba(10,132,255,0.06)' : '#FFFFFF') : (active ? 'rgba(10,132,255,0.12)' : '#1E293B');
                        const cardText = lightBg ? '#0F172A' : '#FFFFFF';
                        const cardBorder = active ? palette.primary : (lightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)');

                        return (
                          <Pressable
                            key={variation.variation_code}
                            onPress={() => setSelectedVariationCode(variation.variation_code)}
                            style={[styles.planCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                          >
                            <View style={styles.planTop}>
                              <Text style={[styles.planSizeText, { color: cardText }]} numberOfLines={1}>
                                {variation.size}
                              </Text>
                              <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logoUrl={selectedService.logoUrl ?? selectedService.logo ?? selectedService.image ?? null} size={18} />
                            </View>
                            <Text style={[styles.planPriceText, { color: lightBg ? '#475569' : '#CBD5E1' }]}>
                              {formatNaira(Number(variation.variation_amount))}
                            </Text>
                            <Text style={[styles.planDurationText, { color: palette.primary }]}>
                              {variation.duration}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <StateCard title="No plans" description="No plans available in this category." icon={<Globe size={24} color={palette.textSecondary} />} />
                  )}
                </>
              ) : (
                <StateCard title="No bundles" description="VTpass did not return any data plans for this provider." icon={<Globe size={24} color={palette.textSecondary} />} />
              )
            ) : null}

            <Text style={[styles.amountHint, { color: palette.textSecondary }]}>Selected bundle: {selectedVariation?.name ?? 'None'}</Text>

            <Pressable
              disabled={!canReview}
              onPress={() => setStep(3)}
              style={[styles.primaryAction, { backgroundColor: canReview ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>Review data purchase</Text>
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
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Confirm the bundle and amount before you pay.</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Data plan</Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>{selectedVariation?.name ?? 'Select a plan'}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{displayNetwork}</Text>
              <Text style={[styles.reviewAmount, { color: palette.text }]}>{selectedPrice ? formatNaira(selectedPrice) : '₦0'}</Text>
            </View>

            <Pressable
              disabled={!canReview || mutation.isPending || biometricBusy}
              onPress={() => void openPaymentAuth()}
              style={[styles.primaryAction, { backgroundColor: canReview ? palette.primary : palette.border }]}
            >
              {mutation.isPending || biometricBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryActionText}>{selectedVariation ? `Buy for ${formatNaira(selectedPrice)}` : 'Select a bundle'}</Text>
              )}
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

      {/* Data Contacts Modal */}
      <Modal visible={dataContactsModalOpen} transparent animationType="slide" onRequestClose={() => setDataContactsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDataContactsModalOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Saved Contacts</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select a phone number to populate the field.</Text>
              </View>
              <Pressable onPress={() => setDataContactsModalOpen(false)} style={[styles.modalClose, { backgroundColor: palette.bg }]}>
                <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
              </Pressable>
            </View>
            <FlatList
              data={dataContacts}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                  No saved contacts yet. Save a number from the Airtime screen first.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={[styles.dataContactRow, { borderColor: palette.border }]}>
                  <Pressable
                    onPress={() => {
                      void haptics.tap();
                      setPhone(item.phone || '');
                      setDataContactsModalOpen(false);
                    }}
                    style={styles.dataContactRowLeft}
                  >
                    <View style={[styles.dataContactAvatar, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                      <Text style={[styles.dataContactAvatarText, { color: palette.text }]}>
                        {item.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.dataContactName, { color: palette.text }]}>{item.name}</Text>
                      <Text style={[styles.dataContactPhone, { color: palette.textSecondary }]}>
                        {item.phone} • {item.bankName || 'Network'}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void haptics.warning();
                      Alert.alert('Remove Contact', `Remove "${item.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removeBeneficiary(item.id) },
                      ]);
                    }}
                    style={styles.dataContactDelete}
                  >
                    <Text style={{ color: palette.error, fontSize: Typography.xs, fontFamily: Typography.family.bold }}>Remove</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <PaymentPinModal
        visible={pinModalOpen}
        title="Enter transfer PIN"
        subtitle={`You are about to buy ${formatNaira(selectedPrice)} of data.`}
        reviewLabel="Data plan"
        reviewTitle={selectedVariation?.name ?? "Select a plan"}
        reviewMeta={displayNetwork}
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
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select the network operator for this number.</Text>
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
              <StateCard title="No data providers" description="VTpass did not return any data providers." icon={<Globe size={24} color={palette.textSecondary} />} />
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
  providerPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  providerText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusCard: { borderWidth: 1, borderRadius: 18, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  statusMeta: { fontSize: Typography.xs, lineHeight: 16 },
  summaryMini: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  summaryMiniLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryMiniValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryMiniMeta: { fontSize: Typography.xs },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  planCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  planSizeText: {
    fontSize: 18,
    fontFamily: Typography.family.bold,
    flex: 1,
  },
  planPriceText: {
    fontSize: 14,
    fontFamily: Typography.family.semibold,
  },
  planDurationText: {
    fontSize: 12,
    fontFamily: Typography.family.bold,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tabScroll: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: 8,
  },
  tabButton: {
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Typography.family.bold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -9,
    height: 3,
    left: 0,
    right: 0,
    borderRadius: 999,
  },
  amountHint: { fontSize: Typography.xs, marginTop: 4 },
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
  providerName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  providerMeta: { fontSize: Typography.xs },
  biometricToast: { fontSize: Typography.xs, lineHeight: 16, textAlign: 'center' },
  contactButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,132,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: Typography.sm, textAlign: 'center', paddingVertical: 18, lineHeight: 22 },
  dataContactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  dataContactRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dataContactAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dataContactAvatarText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  dataContactName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  dataContactPhone: { fontSize: Typography.xs },
  dataContactDelete: { padding: 6 },
});
