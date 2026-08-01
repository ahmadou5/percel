import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

interface TransactionResultModalProps {
  visible: boolean;
  type: 'success' | 'failed' | 'pending';
  title: string;
  message: string;
  amount?: string;
  reference?: string;
  onClose: () => void;
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export function TransactionResultModal({
  visible,
  type,
  title,
  message,
  amount,
  reference,
  onClose,
}: TransactionResultModalProps) {
  const palette = useAppPalette();
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [openedAt, setOpenedAt] = useState<Date>(new Date());

  useEffect(() => {
    if (!visible) return;
    setOpenedAt(new Date());

    scale.setValue(0.92);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 80,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, visible]);

  const tone =
    type === 'success'
      ? { backgroundColor: 'rgba(48,209,88,0.12)', iconColor: '#30D158' }
      : type === 'failed'
        ? { backgroundColor: 'rgba(255,69,58,0.12)', iconColor: '#FF453A' }
        : { backgroundColor: 'rgba(255,159,10,0.12)', iconColor: '#FF9F0A' };

  const Icon = type === 'success' ? CheckCircle2 : type === 'failed' ? XCircle : Clock3;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, opacity, transform: [{ scale }] }]}>
          <Text style={[styles.brandText, { color: palette.primary }]}>Percel</Text>

          <View style={[styles.iconWrap, { backgroundColor: tone.backgroundColor }]}>
            <Icon size={26} color={tone.iconColor} />
          </View>

          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.message, { color: palette.textSecondary }]}>{message}</Text>

          {amount ? <Text style={[styles.amountText, { color: palette.text }]}>{amount}</Text> : null}

          <View style={[styles.metaBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Date</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>{formatTimestamp(openedAt)}</Text>
            </View>

            {reference ? (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>Reference</Text>
                <Text style={[styles.metaValue, { color: palette.text }]} numberOfLines={1}>{reference}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.doneButton, { backgroundColor: palette.primary }, pressed && { opacity: 0.8 }]}
            onPress={onClose}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 12,
  },
  brandText: {
    fontSize: 18,
    fontFamily: Typography.family.bold,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  amountText: {
    fontSize: 28,
    fontFamily: Typography.family.bold,
  },
  metaBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
  },
  metaValue: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  doneButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  doneText: {
    color: '#fff',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
