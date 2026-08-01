import { useRouter } from 'expo-router';
import { ArrowLeft, Tv } from 'lucide-react-native';
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
  useBuyTv,
  useProviderVariations,
  useValidateProviderAccount,
  useWallet,
} from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira, type ProviderVariation } from '@/lib/wallet';

export default function DriverTvScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const walletQuery = useWallet();

  const tvProviders = [
    { name: 'DStv', serviceID: 'dstv' },
    { name: 'GOtv', serviceID: 'gotv' },
    { name: 'StarTimes', serviceID: 'startimes' },
    { name: 'Showmax', serviceID: 'showmax' },
  ];

  const [selectedProvider, setSelectedProvider] = useState(tvProviders[0]);
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<ProviderVariation | null>(null);
  const [validatedName, setValidatedName] = useState<string | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const variationsQuery = useProviderVariations(selectedProvider.serviceID);
  const validateAccountMutation = useValidateProviderAccount();
  const buyTvMutation = useBuyTv();

  const handleValidateSmartcard = async () => {
    if (!smartcardNumber.trim()) return;
    try {
      const res = await validateAccountMutation.mutateAsync({
        serviceID: selectedProvider.serviceID,
        billersCode: smartcardNumber.trim(),
      });
      if (res?.Customer_Name) {
        setValidatedName(res.Customer_Name);
      }
    } catch (err: any) {
      modal.alert('Validation Error', err?.message || 'Smartcard verification failed.', 'error');
      setValidatedName(null);
    }
  };

  const handleInitiate = () => {
    if (!smartcardNumber.trim()) {
      modal.alert('Invalid Smartcard', 'Please enter your smartcard/IUC number', 'warning');
      return;
    }
    if (!selectedPlan) {
      modal.alert('Select Package', 'Please choose a TV subscription package', 'warning');
      return;
    }
    const amt = Number(selectedPlan.variation_amount);
    if (amt > (walletQuery.data?.balance ?? 0)) {
      modal.alert('Insufficient Balance', 'Your wallet balance is lower than this package price.', 'warning');
      return;
    }
    setPinModalVisible(true);
  };

  const handleConfirmPin = async (pin: string) => {
    await buyTvMutation.mutateAsync({
      smartcardNumber: smartcardNumber.trim(),
      provider: selectedProvider.serviceID,
      amount: Number(selectedPlan!.variation_amount),
      variationCode: selectedPlan!.variation_code,
    });
    setPinModalVisible(false);
    modal.show({
      title: 'Success 🎉',
      description: `${selectedProvider.name} ${selectedPlan!.name} renewed successfully!`,
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
          <Text style={[styles.headerTitle, { color: palette.text }]}>Cable TV Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.balanceBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.balanceLabel, { color: palette.textSecondary }]}>Wallet Balance</Text>
          <Text style={[styles.balanceVal, { color: palette.primary }]}>
            {formatNaira(walletQuery.data?.balance ?? 0)}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: palette.text }]}>TV Provider</Text>
          <View style={styles.providerGrid}>
            {tvProviders.map((prov) => (
              <Pressable
                key={prov.serviceID}
                style={[
                  styles.providerChip,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  selectedProvider.serviceID === prov.serviceID && {
                    backgroundColor: palette.primary + '20',
                    borderColor: palette.primary,
                  },
                ]}
                onPress={() => {
                  setSelectedProvider(prov);
                  setSelectedPlan(null);
                }}
              >
                <Text
                  style={[
                    styles.providerText,
                    { color: selectedProvider.serviceID === prov.serviceID ? palette.primary : palette.text },
                  ]}
                >
                  {prov.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: palette.text }]}>Smartcard / IUC Number</Text>
          <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Tv size={18} color={palette.textSecondary} style={{ marginRight: Spacing.xs }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Enter 10 or 11 digit IUC number"
              placeholderTextColor={palette.textSecondary}
              keyboardType="number-pad"
              value={smartcardNumber}
              onChangeText={(val) => {
                setSmartcardNumber(val);
                setValidatedName(null);
              }}
            />
            <Pressable
              style={[styles.verifyBtn, { backgroundColor: palette.primary }]}
              onPress={handleValidateSmartcard}
            >
              {validateAccountMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify</Text>
              )}
            </Pressable>
          </View>

          {validatedName ? (
            <View style={[styles.lookupSuccess, { backgroundColor: '#30D15815', borderColor: '#30D15840' }]}>
              <Text style={styles.lookupNameText}>Subscriber: {validatedName}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: palette.text }]}>Select Package</Text>
          {variationsQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={palette.primary} />
              <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Loading TV packages…</Text>
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
          <Text style={styles.submitBtnText}>Renew Subscription</Text>
        </Pressable>
      </ScrollView>

      <PaymentPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onConfirm={handleConfirmPin}
        loading={buyTvMutation.isPending}
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
  providerGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  providerChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  providerText: {
    fontSize: 11,
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
  verifyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 10,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lookupSuccess: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  lookupNameText: {
    color: '#30D158',
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
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
