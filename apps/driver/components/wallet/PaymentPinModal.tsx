import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Lock, ShieldCheck, X } from 'lucide-react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

type PaymentPinModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void> | void;
  title?: string;
  subtitle?: string;
  loading?: boolean;
};

export function PaymentPinModal({
  visible,
  onClose,
  onConfirm,
  title = 'Enter Transaction PIN',
  subtitle = 'Enter your 4-digit security PIN to authorize this payment',
  loading = false,
}: PaymentPinModalProps) {
  const palette = useAppPalette();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (num: string) => {
    if (loading) return;
    setError('');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handleSubmit(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (enteredPin: string) => {
    try {
      await onConfirm(enteredPin);
      setPin('');
    } catch (err: any) {
      setError(err?.message || 'Invalid PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X color={palette.textSecondary} size={20} />
          </Pressable>

          <View style={styles.content}>
            <View style={[styles.iconWrap, { backgroundColor: palette.primary + '18' }]}>
              <Lock color={palette.primary} size={24} />
            </View>

            <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>

            {/* PIN Dots */}
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3].map((i) => {
                const filled = pin.length > i;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        borderColor: error
                          ? palette.error
                          : filled
                          ? palette.primary
                          : palette.border,
                        backgroundColor: filled ? palette.primary : 'transparent',
                      },
                    ]}
                  />
                );
              })}
            </View>

            {error ? <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text> : null}

            {/* Keypad */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={palette.primary} size="large" />
                <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Processing transaction…</Text>
              </View>
            ) : (
              <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((k, idx) => {
                  if (!k) return <View key={idx} style={styles.keyCell} />;
                  return (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [
                        styles.keyCell,
                        styles.keyBtn,
                        { backgroundColor: palette.card },
                        pressed && { opacity: 0.5 },
                      ]}
                      onPress={() => (k === 'DEL' ? handleDelete() : handleKeyPress(k))}
                    >
                      <Text style={[styles.keyText, { color: palette.text }]}>
                        {k === 'DEL' ? '⌫' : k}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.securityBadge}>
              <ShieldCheck color={palette.primary} size={14} />
              <Text style={[styles.securityText, { color: palette.textSecondary }]}>256-bit Encrypted Security</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.xs,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    fontSize: Typography.xs,
    marginBottom: Spacing.sm,
    fontWeight: Typography.semibold,
  },
  loadingWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.xs,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  keyCell: {
    width: 76,
    height: 52,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  keyBtn: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  keyText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  securityText: {
    fontSize: 11,
  },
});
