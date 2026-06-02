import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Globe, Search, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { normalizeNigerianPhone, providerLabelFromService, ProviderBadge } from '@/components/wallet/WalletFlow';
import { FlowProgressDots, useSlideStepTransition } from '@/components/wallet/WalletFlowProgress';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useBuyData, useProviderServices, useProviderVariations, useResolveAirtimeProvider, useWallet } from '@/hooks/useWallet';
import { formatNaira } from '@/lib/wallet';

type ProviderSelection = {
  phone: string;
  serviceID: string;
  providerName: string;
  confidence: 'high' | 'low';
};

export default function DataScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
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
  const { opacity, translateX } = useSlideStepTransition(step);

  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const variationsQuery = useProviderVariations(selectedService?.serviceID);
  const variations = variationsQuery.data ?? [];
  const selectedVariation = variations.find((variation) => variation.variation_code === selectedVariationCode) ?? variations[0];
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
    if (step !== 1) return;
    const digits = normalizedPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setProviderValidation(null);
      setProviderStatus('idle');
      setProviderError('');
      return;
    }

    const timer = setTimeout(() => {
      setProviderStatus('loading');
      void providerResolve.mutateAsync({ phone: normalizedPhone }).then((response) => {
        const result = response.data;
        setProviderValidation(result);
        setProviderStatus('success');
        setProviderError('');
        const match =
          result.serviceID.toLowerCase().includes('mtn')
            ? services.find((service) => service.serviceID.toLowerCase().includes('mtn'))
            : result.serviceID.toLowerCase().includes('airtel')
              ? services.find((service) => service.serviceID.toLowerCase().includes('airtel'))
              : result.serviceID.toLowerCase().includes('glo')
                ? services.find((service) => service.serviceID.toLowerCase().includes('glo'))
                : services.find((service) => service.serviceID.toLowerCase().includes('9mobile') || service.serviceID.toLowerCase().includes('etisalat') || service.name.toLowerCase().includes('9mobile'));
        if (match) setSelectedServiceID(match.serviceID);
      }).catch((error) => {
        setProviderValidation(null);
        setProviderStatus('error');
        setProviderError(error instanceof Error ? error.message : 'Unable to detect the provider.');
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [normalizedPhone, providerResolve, services, step]);

  useEffect(() => {
    if (providerStatus === 'success' && step === 1) setStep(2);
  }, [providerStatus, step]);

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
    router.back();
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
        <FlowProgressDots currentStep={step} totalSteps={3} />
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
            />

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

            <Text style={[styles.sectionTitle, { color: palette.text }]}>Plans</Text>
            {selectedService ? (
              variationsQuery.isLoading ? (
                <StateCard loading title="Loading plans" description="Fetching live data bundles from VTpass." icon={<Globe size={24} color={palette.textSecondary} />} />
              ) : variations.length ? (
                <View style={styles.planGrid}>
                  {variations.map((variation) => {
                    const active = variation.variation_code === selectedVariationCode;
                    return (
                      <Pressable
                        key={variation.variation_code}
                        onPress={() => setSelectedVariationCode(variation.variation_code)}
                        style={[styles.planCard, { backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg, borderColor: active ? palette.primary : palette.border }]}
                      >
                        <View style={styles.planTop}>
                          <Text style={[styles.planName, { color: palette.text }]}>{variation.name}</Text>
                          <ProviderBadge serviceID={selectedService.serviceID} name={selectedService.name} logoUrl={selectedService.logoUrl ?? selectedService.logo ?? selectedService.image ?? null} size={30} />
                        </View>
                        <Text style={[styles.planAmount, { color: palette.text }]}>{formatNaira(Number(variation.variation_amount))}</Text>
                        <Text style={[styles.planMeta, { color: palette.textSecondary }]}>{variation.fixedPrice === 'Yes' ? 'Fixed price' : 'Variable price'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
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
              disabled={!amountValid || mutation.isPending}
              onPress={async () => {
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
                  Alert.alert('Data purchased', `You bought ${selectedVariation.name} for ${formatNaira(selectedPrice)}.`);
                  router.back();
                } catch (error) {
                  Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy data.');
                }
              }}
              style={[styles.primaryAction, { backgroundColor: amountValid ? palette.primary : palette.border }]}
            >
              {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={styles.primaryActionText}>{selectedVariation ? `Buy for ${formatNaira(selectedPrice)}` : 'Select a bundle'}</Text>}
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
  planGrid: { gap: 10 },
  planCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  planName: { fontSize: Typography.md, fontFamily: Typography.family.bold, flex: 1 },
  planAmount: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  planMeta: { fontSize: Typography.xs },
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
  providerName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  providerMeta: { fontSize: Typography.xs },
});
