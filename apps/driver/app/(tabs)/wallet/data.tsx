import { useRouter } from 'expo-router';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  Phone,
  Wifi,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PaymentPinModal } from '@/components/wallet/PaymentPinModal';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  useBuyData,
  useProviderVariations,
  useWallet,
} from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira, telecomNetworks, type ProviderVariation } from '@/lib/wallet';

type Step = 1 | 2 | 3;

export default function DriverDataScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const walletQuery = useWallet();

  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [selectedPlan, setSelectedPlan] = useState<ProviderVariation | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const getServiceID = (net: string) => {
    const n = net.toLowerCase();
    if (n.includes('mtn')) return 'mtn-data';
    if (n.includes('airtel')) return 'airtel-data';
    if (n.includes('glo')) return 'glo-data';
    if (n.includes('9mobile') || n.includes('etisalat')) return 'etisalat-data';
    return 'mtn-data';
  };

  const serviceID = getServiceID(selectedNetwork);
  const variationsQuery = useProviderVariations(serviceID);
  const buyDataMutation = useBuyData();

  const handleContinue = () => {
    if (step === 1) {
      if (!phone || phone.length < 10) {
        modal.alert('Invalid Phone Number', 'Please enter a valid phone number', 'warning');
        return;
      }
      if (!selectedPlan) {
        modal.alert('Select Plan', 'Please select a data bundle plan', 'warning');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  };

  const handleInitiate = () => {
    const amt = Number(selectedPlan?.variation_amount ?? 0);
    if (amt > (walletQuery.data?.balance ?? 0)) {
      modal.alert('Insufficient Balance', 'Your wallet balance is lower than this plan cost.', 'warning');
      return;
    }
    setPinModalVisible(true);
  };

  const handleConfirmPin = async (_pin: string) => {
    await buyDataMutation.mutateAsync({
      phone: phone.trim(),
      network: selectedNetwork,
      plan: selectedPlan!.name,
      amount: Number(selectedPlan!.variation_amount),
      variationCode: selectedPlan!.variation_code,
      serviceID,
    });
    setPinModalVisible(false);
    modal.show({
      title: 'Success 🎉',
      description: `${selectedPlan!.name} data sent to ${phone}`,
      type: 'success',
      primaryText: 'OK',
      onPrimaryPress: () => {
        modal.hide();
        router.back();
      },
    });
  };

  const stepDots = [1, 2, 3] as const;

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* back */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
            style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <ChevronLeft size={18} color={palette.text} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>

        {/* eyebrow */}
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Data Bundle</Text>
        </View>

        {/* hero */}
        <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Network</Text>
              <Text style={styles.heroValue}>{selectedNetwork}</Text>
            </View>
            <View style={styles.heroIcon}>
              <ArrowUpRight size={20} color="#fff" />
            </View>
          </View>
          <View style={styles.dots}>
            {stepDots.map((d) => (
              <View
                key={d}
                style={[
                  styles.dot,
                  d === step
                    ? { backgroundColor: '#fff', width: 20 }
                    : d < step
                    ? { backgroundColor: 'rgba(255,255,255,0.6)' }
                    : { backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Step 1 — Network + Phone + Plan */}
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Wifi size={16} color={palette.primary} />
              </View>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Select network, enter phone and pick a data plan.
              </Text>
            </View>

            {/* network */}
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Network</Text>
            <View style={styles.networkGrid}>
              {telecomNetworks.map((net) => {
                const active = selectedNetwork === net;
                return (
                  <Pressable
                    key={net}
                    style={[
                      styles.networkChip,
                      { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border },
                    ]}
                    onPress={() => { setSelectedNetwork(net); setSelectedPlan(null); }}
                  >
                    <Text style={[styles.networkChipText, { color: active ? '#fff' : palette.text }]}>{net}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* phone */}
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Phone number</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Phone size={16} color={palette.textSecondary} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="08012345678"
                placeholderTextColor={palette.textSecondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* plans */}
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Select plan</Text>
            {variationsQuery.isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={palette.primary} />
                <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading plans…</Text>
              </View>
            ) : (
              <View style={styles.plansList}>
                {(variationsQuery.data ?? []).map((plan) => {
                  const isSelected = selectedPlan?.variation_code === plan.variation_code;
                  return (
                    <Pressable
                      key={plan.variation_code}
                      style={({ pressed }) => [
                        styles.planCard,
                        {
                          backgroundColor: isSelected ? palette.primary : palette.bg,
                          borderColor: isSelected ? palette.primary : palette.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      onPress={() => setSelectedPlan(plan)}
                    >
                      <View style={styles.planCardLeft}>
                        <Text style={[styles.planName, { color: isSelected ? '#fff' : palette.text }]}>
                          {plan.name}
                        </Text>
                      </View>
                      <Text style={[styles.planPrice, { color: isSelected ? 'rgba(255,255,255,0.85)' : palette.primary }]}>
                        {formatNaira(Number(plan.variation_amount))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              onPress={handleContinue}
              style={[styles.primaryAction, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.primaryActionText}>Review selection</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Step 2 — Review */}
        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Activity size={16} color={palette.primary} />
              </View>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Confirm the details before you pay.
              </Text>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Data Bundle</Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>{selectedPlan?.name ?? '—'}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{selectedNetwork} · {phone}</Text>
              <Text style={[styles.reviewAmount, { color: palette.text }]}>
                {formatNaira(Number(selectedPlan?.variation_amount ?? 0))}
              </Text>
            </View>

            <Pressable
              disabled={buyDataMutation.isPending}
              onPress={handleInitiate}
              style={[styles.primaryAction, { backgroundColor: palette.primary }]}
            >
              {buyDataMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryActionText}>Purchase Data Bundle</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <PaymentPinModal
        onBiometricPress={handleInitiate}
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onConfirm={handleConfirmPin}
        loading={buyDataMutation.isPending}
      />
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: 40, gap: Spacing.lg },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 4 },
  eyebrow: {
    textTransform: 'uppercase', letterSpacing: 1.2,
    fontSize: Typography.xs, fontFamily: Typography.family.bold,
  },

  hero: { borderRadius: 28, padding: Spacing.lg, gap: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroValue: { color: '#fff', fontSize: Typography.xl, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, width: 6, borderRadius: 3 },

  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepPill: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionSubtitle: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.regular },

  fieldLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  networkGrid: { flexDirection: 'row', gap: 8 },
  networkChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14, borderWidth: 1 },
  networkChipText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, minHeight: 52,
  },
  input: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },

  loadingWrap: { paddingVertical: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
  loadingText: { fontSize: Typography.sm, fontFamily: Typography.family.regular },

  plansList: { gap: 8 },
  planCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: 16, borderWidth: 1,
  },
  planCardLeft: { flex: 1 },
  planName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  planPrice: { fontSize: Typography.sm, fontFamily: Typography.family.bold },

  reviewCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  reviewLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  reviewTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  reviewAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 4 },

  primaryAction: {
    minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
