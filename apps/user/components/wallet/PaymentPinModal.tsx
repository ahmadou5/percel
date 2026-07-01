import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { PinInput } from '@/components/ui/PinInput';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

type PaymentPinModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  reviewLabel: string;
  reviewTitle: string;
  reviewMeta?: string;
  reviewAmount: string;
  pin: string;
  onPinChange: (value: string) => void;
  loading?: boolean;
  error?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  canClose?: boolean;
  footerHint?: ReactNode;
};

export function PaymentPinModal({
  visible,
  title,
  subtitle,
  reviewLabel,
  reviewTitle,
  reviewMeta,
  reviewAmount,
  pin,
  onPinChange,
  loading = false,
  error,
  confirmLabel,
  onConfirm,
  onClose,
  canClose = true,
  footerHint,
}: PaymentPinModalProps) {
  const palette = useAppPalette();
  const canSubmit = pin.length >= 4 && !loading;

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
            value={pin}
            onChangeText={(value) => {
              onPinChange(value.replace(/\s/g, ''));
            }}
            loading={loading}
            error={error}
          />

          {footerHint ? footerHint : null}

          <Pressable
            onPress={() => {
              void haptics.tap();
              onConfirm();
            }}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.confirmButton,
              { backgroundColor: canSubmit ? palette.primary : palette.border, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={palette.card} />
            ) : (
              <Text style={[styles.confirmText, { color: palette.card }]}>{confirmLabel}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: Typography.xl,
    fontFamily: Typography.family.bold,
  },
  subtitle: {
    marginTop: 4,
    fontSize: Typography.sm,
    lineHeight: 20,
    fontFamily: Typography.family.regular,
    maxWidth: '88%',
  },
  closeButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.md,
    gap: 6,
  },
  reviewLabel: {
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Typography.family.bold,
  },
  reviewTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  reviewMeta: {
    fontSize: Typography.sm,
    lineHeight: 20,
    fontFamily: Typography.family.regular,
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
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  confirmButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
