import { useRouter } from 'expo-router';
import { ArrowLeft, Phone } from 'lucide-react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentPinModal } from '@/components/wallet/PaymentPinModal';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import {
  useBuyData,
  useProviderServices,
  useProviderVariations,
  useWallet,
} from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira, telecomNetworks, type ProviderVariation } from '@/lib/wallet';

export default function DriverDataScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const walletQuery = useWallet();

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

  const handleInitiate = () => {
    if (!phone || phone.length < 10) {
      modal.alert('Invalid Phone Number', 'Please enter a valid phone number', 'warning');
      return;
    }
    if (!selectedPlan) {
      modal.alert('Select Plan', 'Please select a data bundle plan', 'warning');
      return;
    }
    const amt = Number(selectedPlan.variation_amount);
    if (amt > (walletQuery.data?.balance ?? 0)) {
      modal.alert('Insufficient Balance', 'Your wallet balance is lower than this plan cost.', 'warning');
      return;
    }
    setPinModalVisible(true);
  };

  const handleConfirmPin = async (pin: string) => {
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

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Buy Data Bundle</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.balanceBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.balanceLabel, { color: palette.textSecondary }]}>Wallet Balance</Text>
          <Text style={[styles.balanceVal, { color: palette.primary }]}>
            {formatNaira(walletQuery.data?.balance ?? 0)}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: palette.text }]}>Network Provider</Text>
          <View style={styles.networkGrid}>
            {telecomNetworks.map((net) => (
              <Pressable
                key={net}
                style={[
                  styles.networkChip,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  selectedNetwork === net && { backgroundColor: palette.primary + '20', borderColor: palette.primary },
                ]}
                onPress={() => {
                  setSelectedNetwork(net);
                  setSelectedPlan(null);
                }}
              >
                <Text
                  style={[
                    styles.networkText,
                    { color: selectedNetwork === net ? palette.primary : palette.text },
                  ]}
                >
                  {net}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: palette.text }]}>Phone Number</Text>
          <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Phone size={18} color={palette.textSecondary} style={{ marginRight: Spacing.xs }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="08012345678"
              placeholderTextColor={palette.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Text style={[styles.label, { color: palette.text }]}>Select Data Plan</Text>
          {variationsQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={palette.primary} />
              <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading data plans…</Text>
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
                      { backgroundColor: palette.card, borderColor: palette.border },
                      isSelected && { backgroundColor: palette.primary + '15', borderColor: palette.primary },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setSelectedPlan(plan)}
                  >
                    <Text style={[styles.planName, { color: isSelected ? palette.primary : palette.text }]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planPrice, { color: palette.primary }]}>
                      {formatNaira(Number(plan.variation_amount))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleInitiate}
        >
          <Text style={styles.submitBtnText}>Purchase Data Bundle</Text>
        </Pressable>
      </ScrollView>

      <PaymentPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onConfirm={handleConfirmPin}
        loading={buyDataMutation.isPending}
      />
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  balanceLabel: {
    fontSize: Typography.xs,
  },
  balanceVal: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
  formGroup: {
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    marginTop: Spacing.xs,
  },
  networkGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  networkChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  networkText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: Typography.sm,
  },
  loadingWrap: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  loadingText: {
    fontSize: 11,
  },
  plansList: {
    gap: 8,
    marginTop: Spacing.xs,
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  planName: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    flex: 1,
  },
  planPrice: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  submitBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
});
