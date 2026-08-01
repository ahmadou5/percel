import { useRouter } from 'expo-router';
import { ArrowLeft, Smartphone } from 'lucide-react-native';
import React, { useState } from 'react';
import {
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
import { useBuyAirtime, useResolveAirtimeProvider, useWallet } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira, telecomNetworks } from '@/lib/wallet';

export default function DriverAirtimeScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const walletQuery = useWallet();

  const [phone, setPhone] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [amount, setAmount] = useState('');
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const resolveProviderMutation = useResolveAirtimeProvider();
  const buyAirtimeMutation = useBuyAirtime();
  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

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
        // Fallback silently to manual network selection
      }
    }
  };

  const handleInitiate = () => {
    if (!phone || phone.length < 10) {
      modal.alert('Invalid Phone Number', 'Please enter a valid phone number', 'warning');
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt < 50) {
      modal.alert('Invalid Amount', 'Minimum airtime purchase is ₦50', 'warning');
      return;
    }
    if (amt > (walletQuery.data?.balance ?? 0)) {
      modal.alert('Insufficient Balance', 'Your wallet balance is lower than this purchase amount.', 'warning');
      return;
    }
    setPinModalVisible(true);
  };

  const handleConfirmPin = async (pin: string) => {
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
          <Text style={[styles.headerTitle, { color: palette.text }]}>Buy Airtime</Text>
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
                onPress={() => setSelectedNetwork(net)}
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
            <Smartphone size={18} color={palette.textSecondary} style={{ marginRight: Spacing.xs }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="08012345678"
              placeholderTextColor={palette.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
            />
          </View>

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

          <Text style={[styles.quickLabel, { color: palette.textSecondary }]}>Quick select:</Text>
          <View style={styles.quickRow}>
            {quickAmounts.map((q) => (
              <Pressable
                key={q}
                style={[
                  styles.quickChip,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  amount === String(q) && { backgroundColor: palette.primary + '20', borderColor: palette.primary },
                ]}
                onPress={() => setAmount(String(q))}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    { color: amount === String(q) ? palette.primary : palette.text },
                  ]}
                >
                  {formatNaira(q)}
                </Text>
              </Pressable>
            ))}
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
          <Text style={styles.submitBtnText}>Purchase Airtime</Text>
        </Pressable>
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
  currencyPrefix: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: Typography.sm,
  },
  quickLabel: {
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickChipText: {
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
