import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Smartphone,
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
import { useBuyAirtime, useResolveAirtimeProvider, useWallet } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira, telecomNetworks } from '@/lib/wallet';

const presetAmounts = [100, 200, 500, 1000, 2000, 5000] as const;

type Step = 1 | 2 | 3;

export default function DriverAirtimeScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const walletQuery = useWallet();

  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [amount, setAmount] = useState('');
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const resolveProviderMutation = useResolveAirtimeProvider();
  const buyAirtimeMutation = useBuyAirtime();

  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    if (val.length >= 10) {
      try {
        const res = await resolveProviderMutation.mutateAsync({ phone: val });
        if (res.data?.providerName) {
          const matched = telecomNetworks.find((n) =>
            n.toLowerCase().includes(res.data.providerName.toLowerCase()) ||
            res.data.providerName.toLowerCase().includes(n.toLowerCase()),
          );
          if (matched) setSelectedNetwork(matched);
        }
      } catch {
        // silent fallback
      }
    }
  };

  const handleContinue = () => {
    if (!phone || phone.length < 10) {
      modal.alert('Invalid Phone Number', 'Please enter a valid phone number', 'warning');
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt < 50) {
      modal.alert('Invalid Amount', 'Minimum airtime purchase is ₦50', 'warning');
      return;
    }
    if (step === 1) { setStep(2); return; }
    if (step === 2) { setStep(3); return; }
  };

  const handleInitiate = () => {
    const amt = Number(amount);
    if (amt > (walletQuery.data?.balance ?? 0)) {
      modal.alert('Insufficient Balance', 'Your wallet balance is lower than this purchase amount.', 'warning');
      return;
    }
    setPinModalVisible(true);
  };

  const handleConfirmPin = async (_pin: string) => {
    await buyAirtimeMutation.mutateAsync({
      phone: phone.trim(),
      amount: Number(amount),
      network: selectedNetwork,
    });
    setPinModalVisible(false);
    modal.show({
      title: 'Success 🎉',
      description: `₦${amount} ${selectedNetwork} airtime sent to ${phone}`,
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

        {/* back button row */}
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
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Airtime</Text>
        </View>

        {/* hero card */}
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

          {/* progress dots */}
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

        {/* Step 1 — Phone + network */}
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Smartphone size={16} color={palette.primary} />
              </View>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Enter the recipient phone number and select the network.
              </Text>
            </View>

            {/* network selector */}
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
                    onPress={() => setSelectedNetwork(net)}
                  >
                    <Text style={[styles.networkChipText, { color: active ? '#fff' : palette.text }]}>
                      {net}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* phone input */}
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Phone number</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Smartphone size={16} color={palette.textSecondary} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="08012345678"
                placeholderTextColor={palette.textSecondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
              />
              {resolveProviderMutation.isPending ? <ActivityIndicator size="small" color={palette.primary} /> : null}
            </View>

            <Pressable
              onPress={handleContinue}
              style={[styles.primaryAction, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.primaryActionText}>Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Step 2 — Amount */}
        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <Banknote size={16} color={palette.primary} />
              </View>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Choose a quick amount or enter a custom value.
              </Text>
            </View>

            {/* recipient mini summary */}
            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Recipient</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>{phone}</Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{selectedNetwork}</Text>
            </View>

            {/* preset amounts */}
            <View style={styles.amountGrid}>
              {presetAmounts.map((v) => {
                const active = amount === String(v);
                return (
                  <Pressable
                    key={v}
                    onPress={() => setAmount(String(v))}
                    style={({ pressed }) => [
                      styles.amountChip,
                      {
                        backgroundColor: active ? palette.text : palette.card,
                        borderColor: active ? palette.text : palette.border,
                        transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }],
                      },
                    ]}
                  >
                    <Text style={[styles.amountChipText, { color: active ? palette.card : palette.text }]}>
                      {formatNaira(v)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* custom amount */}
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Custom amount</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.currencyPrefix, { color: palette.primary }]}>₦</Text>
              <TextInput
                style={[styles.input, { color: palette.text, fontSize: Typography.lg, fontFamily: Typography.family.bold }]}
                placeholder="0"
                placeholderTextColor={palette.textSecondary}
                keyboardType="numeric"
                value={amount}
                onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ''))}
              />
            </View>

            <Text style={[styles.amountHint, { color: palette.textSecondary }]}>
              Wallet balance: {formatNaira(walletQuery.data?.balance ?? 0)}
            </Text>

            <Pressable
              disabled={!amount}
              onPress={handleContinue}
              style={[styles.primaryAction, { backgroundColor: amount ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>Review purchase</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Step 3 — Review */}
        {step === 3 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <CheckCircle2 size={16} color={palette.primary} />
              </View>
              <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                Confirm the details before you pay.
              </Text>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>Airtime</Text>
              <Text style={[styles.reviewTitle, { color: palette.text }]}>{selectedNetwork}</Text>
              <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{phone}</Text>
              <Text style={[styles.reviewAmount, { color: palette.text }]}>
                {formatNaira(Number(amount))}
              </Text>
            </View>

            <Pressable
              disabled={buyAirtimeMutation.isPending}
              onPress={handleInitiate}
              style={[styles.primaryAction, { backgroundColor: palette.primary }]}
            >
              {buyAirtimeMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryActionText}>Purchase Airtime</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <PaymentPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onConfirm={handleConfirmPin}
        loading={buyAirtimeMutation.isPending}
      />
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: 40, gap: Spacing.lg },

  // header
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

  // hero
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

  // card
  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepPill: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionSubtitle: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.regular },

  // network
  fieldLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  networkGrid: { flexDirection: 'row', gap: 8 },
  networkChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14, borderWidth: 1 },
  networkChipText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },

  // input
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.md, minHeight: 52,
  },
  input: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  currencyPrefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },

  // amount grid
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountChip: {
    width: '30%', paddingVertical: 12, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  amountChipText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  amountHint: { fontSize: Typography.xs, fontFamily: Typography.family.regular },

  // mini summary
  summaryMini: { borderRadius: 16, borderWidth: 1, padding: Spacing.md, gap: 2 },
  summaryMiniLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  summaryMiniValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryMiniMeta: { fontSize: Typography.sm },

  // review card
  reviewCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  reviewLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  reviewTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  reviewMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  reviewAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 4 },

  // actions
  primaryAction: {
    minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
});
