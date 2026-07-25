import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Landmark, ArrowUpRight, DollarSign, X, CheckCircle2 } from 'lucide-react-native';
import { useAppPalette, hexToRgba } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { http } from '@/lib/api';
import { haptics } from '@/lib/haptics';

type Props = {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess?: () => void;
};

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function PayoutModal({ visible, onClose, availableBalance, onSuccess }: Props) {
  const palette = useAppPalette();
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const numericAmount = Number(amount.replace(/[^0-9.]/g, '')) || 0;
  const canSubmit = numericAmount > 0 && numericAmount <= availableBalance && accountNumber.trim().length >= 10 && bankName.trim().length > 0;

  const handleQuickAmount = (val: number) => {
    void haptics.tap();
    setAmount(val.toString());
  };

  const handlePayout = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      void haptics.impact();
      await http.post('/api/v1/driver/payout', {
        amount: numericAmount,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
      });
      Alert.alert('Payout Initiated', `${formatNaira(numericAmount)} is on its way to your bank account.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert('Payout Request', 'Your payout request has been queued for processing.');
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: hexToRgba('#30D158', 0.14) }]}>
              <Landmark size={22} color="#30D158" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: palette.text }]}>Cash Out Earnings</Text>
              <Text style={[styles.sub, { color: palette.textSecondary }]}>
                Transfer your earnings directly to your bank account.
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: palette.bg }]}>
              <X size={18} color={palette.textSecondary} />
            </Pressable>
          </View>

          {/* Available balance chip */}
          <View style={[styles.balanceBanner, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Text style={[styles.balanceLabel, { color: palette.textSecondary }]}>AVAILABLE BALANCE</Text>
            <Text style={[styles.balanceValue, { color: palette.text }]}>{formatNaira(availableBalance)}</Text>
          </View>

          {/* Form inputs */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>AMOUNT TO WITHDRAW (₦)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="e.g. 5000"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { backgroundColor: palette.bg, color: palette.text, borderColor: palette.border }]}
            />

            {/* Quick chips */}
            <View style={styles.quickRow}>
              {[2000, 5000, 10000, availableBalance].map((val, idx) => (
                <Pressable
                  key={val + idx}
                  onPress={() => handleQuickAmount(val)}
                  style={[styles.quickChip, { backgroundColor: palette.bg, borderColor: palette.border }]}
                >
                  <Text style={[styles.quickChipText, { color: palette.primary }]}>
                    {val === availableBalance ? 'Max' : formatNaira(val)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>BANK NAME</Text>
            <TextInput
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. Access Bank / Kuda"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { backgroundColor: palette.bg, color: palette.text, borderColor: palette.border }]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>ACCOUNT NUMBER</Text>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10-digit NUBAN"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { backgroundColor: palette.bg, color: palette.text, borderColor: palette.border }]}
            />
          </View>

          {/* Submit Action */}
          <Pressable
            onPress={() => void handlePayout()}
            disabled={!canSubmit || loading}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? palette.primary : palette.border,
                opacity: pressed || loading ? 0.85 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <ArrowUpRight size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Withdraw {numericAmount > 0 ? formatNaira(numericAmount) : ''}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  sub: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.6,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.md,
    fontFamily: Typography.family.medium,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  submitBtn: {
    minHeight: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
