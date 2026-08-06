import { useRouter } from 'expo-router';
import { ArrowLeft, Zap } from 'lucide-react-native';
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
  useBuyElectricity,
  useValidateProviderAccount,
  useWallet,
} from '@/hooks/useWallet';
import { hexToRgba, useAppPalette } from '@/lib/theme';
import { discos, formatNaira } from '@/lib/wallet';

export default function DriverElectricityScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const walletQuery = useWallet();

  const [selectedDisco, setSelectedDisco] = useState<string>('Ikeja');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [validatedName, setValidatedName] = useState<string | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const validateAccountMutation = useValidateProviderAccount();
  const buyElectricityMutation = useBuyElectricity();

  const getServiceID = (discoName: string) => {
    const d = discoName.toLowerCase();
    if (d.includes('eko')) return 'eko-electric';
    if (d.includes('ikeja')) return 'ikeja-electric';
    if (d.includes('abuja')) return 'abuja-electric';
    if (d.includes('kano')) return 'kano-electric';
    if (d.includes('port')) return 'portharcourt-electric';
    return 'ikeja-electric';
  };

  const handleValidateMeter = async () => {
    if (!meterNumber.trim()) return;
    try {
      const res = await validateAccountMutation.mutateAsync({
        serviceID: getServiceID(selectedDisco),
        billersCode: meterNumber.trim(),
        type: meterType,
      });
      if (res?.Customer_Name) {
        setValidatedName(res.Customer_Name);
      }
    } catch (err: any) {
      modal.alert('Validation Error', err?.message || 'Meter verification failed. Check meter number.', 'error');
      setValidatedName(null);
    }
  };

  const handleInitiate = () => {
    if (!meterNumber.trim()) {
      modal.alert('Invalid Meter', 'Please enter your meter number', 'warning');
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt < 500) {
      modal.alert('Invalid Amount', 'Minimum electricity payment is ₦500', 'warning');
      return;
    }
    if (amt > (walletQuery.data?.balance ?? 0)) {
      modal.alert('Insufficient Balance', 'Your wallet balance is lower than this payment amount.', 'warning');
      return;
    }
    setPinModalVisible(true);
  };

  const handleConfirmPin = async (pin: string) => {
    await buyElectricityMutation.mutateAsync({
      meterNumber: meterNumber.trim(),
      amount: Number(amount),
      disco: selectedDisco,
      type: meterType,
    });
    setPinModalVisible(false);
    modal.show({
      title: 'Success 🎉',
      description: `₦${amount} electricity payment successful for meter ${meterNumber}`,
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
          <Text style={[styles.headerTitle, { color: palette.text }]}>Pay Electricity Bill</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.balanceBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.balanceLabel, { color: palette.textSecondary }]}>Wallet Balance</Text>
          <Text style={[styles.balanceVal, { color: palette.primary }]}>
            {formatNaira(walletQuery.data?.balance ?? 0)}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: palette.text }]}>Distribution Company (DISCO)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoRow}>
            {discos.map((d) => (
              <Pressable
                key={d}
                style={[
                  styles.discoChip,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  selectedDisco === d && { backgroundColor: hexToRgba(palette.primary, 0.14), borderColor: palette.primary },
                ]}
                onPress={() => setSelectedDisco(d)}
              >
                <Text style={[styles.discoText, { color: selectedDisco === d ? palette.primary : palette.text }]}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: palette.text }]}>Meter Type</Text>
          <View style={styles.typeRow}>
            {(['prepaid', 'postpaid'] as const).map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.typeChip,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  meterType === t && { backgroundColor: palette.primary },
                ]}
                onPress={() => setMeterType(t)}
              >
                <Text style={[styles.typeText, { color: meterType === t ? '#FFF' : palette.text }]}>
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: palette.text }]}>Meter Number</Text>
          <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Zap size={18} color={palette.textSecondary} style={{ marginRight: Spacing.xs }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Enter 11 to 13 digit meter number"
              placeholderTextColor={palette.textSecondary}
              keyboardType="number-pad"
              value={meterNumber}
              onChangeText={(val) => {
                setMeterNumber(val);
                setValidatedName(null);
              }}
            />
            <Pressable
              style={[styles.verifyBtn, { backgroundColor: palette.primary }]}
              onPress={handleValidateMeter}
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
              <Text style={styles.lookupNameText}>Meter Name: {validatedName}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: palette.text }]}>Amount (₦)</Text>
          <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.currencyPrefix, { color: palette.primary }]}>₦</Text>
            <TextInput
              style={[styles.input, { color: palette.text, fontSize: 18, fontWeight: 'bold' }]}
              placeholder="0.00"
              placeholderTextColor={palette.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleInitiate}
        >
          <Text style={styles.submitBtnText}>Pay Electricity</Text>
        </Pressable>
      </ScrollView>

      <PaymentPinModal
        onBiometricPress={handleInitiate}
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onConfirm={handleConfirmPin}
        loading={buyElectricityMutation.isPending}
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
  discoRow: {
    gap: 8,
    marginBottom: Spacing.xs,
  },
  discoChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  discoText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.xs,
  },
  typeChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  typeText: {
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
  currencyPrefix: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: Spacing.xs,
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
