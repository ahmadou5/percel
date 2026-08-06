import { ReactNode, useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SearchCheck } from 'lucide-react-native';

import { CustomNumericKeypad } from '@/components/ui/CustomNumericKeypad';
import { PinInput } from '@/components/ui/PinInput';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

type PaymentPinModalProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  reviewLabel?: string;
  reviewTitle?: string;
  reviewMeta?: string;
  reviewAmount?: string;
  pin?: string;
  onPinChange?: (value: string) => void;
  loading?: boolean;
  error?: string;
  confirmLabel?: string;
  onConfirm?: (pin: string) => void;
  onClose: () => void;
  canClose?: boolean;
  footerHint?: ReactNode;
  onBiometricPress?: () => void;
};

export function PaymentPinModal({
  visible,
  title = 'Security PIN',
  subtitle = 'Enter your 4-digit transaction PIN to continue',
  reviewLabel = 'Transaction',
  reviewTitle = 'Confirm Payment',
  reviewMeta,
  reviewAmount = '—',
  pin: controlledPin,
  onPinChange: controlledOnPinChange,
  loading = false,
  error,
  confirmLabel = 'Confirm Transaction',
  onConfirm,
  onClose,
  canClose = true,
  footerHint,
  onBiometricPress,
}: PaymentPinModalProps) {
  const palette = useAppPalette();
  const [internalPin, setInternalPin] = useState('');

  useEffect(() => {
    if (!visible) {
      setInternalPin('');
    }
  }, [visible]);

  const effectivePin = controlledPin !== undefined ? controlledPin : internalPin;

  const setPin = (val: string) => {
    if (controlledOnPinChange) {
      controlledOnPinChange(val);
    } else {
      setInternalPin(val);
    }
  };

  const currentPin = effectivePin ?? '';
  const canSubmit = currentPin.length >= 4 && !loading;

  const handleDigitPress = (digit: string) => {
    if (currentPin.length < 4 && !loading) {
      setPin(currentPin + digit);
    }
  };

  const handleDeletePress = () => {
    if (currentPin.length > 0 && !loading) {
      setPin(currentPin.slice(0, -1));
    }
  };

  const handleClearPress = () => {
    if (!loading) {
      setPin('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {
      if (!canClose || loading) return;
      onClose();
    }}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!canClose || loading) return;
            onClose();
          }}
        />
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
            </View>
            <Pressable
              onPress={() => {
                if (!canClose || loading) return;
                onClose();
              }}
              style={[styles.closeButton, { backgroundColor: palette.bg }]}
            >
              <Text style={[styles.closeText, { color: palette.text }]}>Close</Text>
            </Pressable>
          </View>

          <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>{reviewLabel}</Text>
            <Text style={[styles.reviewTitle, { color: palette.text }]}>{reviewTitle}</Text>
            {reviewMeta ? <Text style={[styles.reviewMeta, { color: palette.textSecondary }]}>{reviewMeta}</Text> : null}
            <View style={[styles.reviewAmountBox, { borderColor: palette.border }]}>
              <Text style={[styles.reviewAmountLabel, { color: palette.textSecondary }]}>Amount</Text>
              <Text style={[styles.reviewAmountValue, { color: palette.text }]}>{reviewAmount}</Text>
            </View>
          </View>

          <PinInput
            value={currentPin}
            onChangeText={(value) => {
              setPin(value.replace(/\s/g, ''));
            }}
            loading={loading}
            error={error}
            useCustomKeypad
            autoFocus={false}
          />

          <CustomNumericKeypad
            mode="pin"
            onPressDigit={handleDigitPress}
            onDelete={handleDeletePress}
            onClear={handleClearPress}
            disabled={loading}
            leftAction={onBiometricPress ? "bio" : "none"}
            onBiometricPress={onBiometricPress}
          />

          {footerHint ? footerHint : null}

          <Pressable
            onPress={() => {
              void haptics.tap();
              onConfirm?.(currentPin);
            }}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.confirmButton,
              { backgroundColor: palette.primary, opacity: canSubmit ? (pressed ? 0.92 : 1) : 0.45 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={palette.card} />
            ) : (
              <>
                <SearchCheck size={18} color={palette.card} />
                <Text style={[styles.confirmText, { color: palette.card }]}>{confirmLabel}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  subtitle: {
    marginTop: 2,
    fontSize: Typography.sm,
  },
  closeButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  reviewLabel: {
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  reviewTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  reviewMeta: {
    fontSize: Typography.xs,
  },
  reviewAmountBox: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  reviewAmountLabel: {
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  reviewAmountValue: {
    fontSize: 28,
    fontFamily: Typography.family.bold,
    marginTop: 2,
  },
  confirmButton: {
    flexDirection: 'row',
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
