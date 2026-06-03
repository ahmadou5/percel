import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

interface TransactionResultModalProps {
  visible: boolean;
  type: 'success' | 'failed' | 'pending';
  title: string;
  message: string;
  amount?: string;
  reference?: string;
  onClose: () => void;
  onViewReceipt?: () => void;
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
  onViewReceipt,
}: TransactionResultModalProps) {
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
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

  const tone = type === 'success'
    ? { backgroundColor: 'rgba(48,209,88,0.12)', iconColor: palette.success, accent: palette.success }
    : type === 'failed'
      ? { backgroundColor: 'rgba(255,69,58,0.12)', iconColor: palette.error, accent: palette.error }
      : { backgroundColor: 'rgba(255,159,10,0.12)', iconColor: palette.warning, accent: palette.warning };

  const Icon = type === 'success' ? CheckCircle2 : type === 'failed' ? XCircle : Clock3;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, opacity, transform: [{ scale }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: tone.backgroundColor }]}>
            <Icon size={26} color={tone.iconColor} />
          </View>

          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.message, { color: palette.textSecondary }]}>{message}</Text>

          <View style={styles.rows}>
            {amount ? (
              <View style={[styles.row, { borderColor: palette.border }] }>
                <Text style={[styles.label, { color: palette.textSecondary }]}>Amount</Text>
                <Text style={[styles.value, { color: palette.text }]}>{amount}</Text>
              </View>
            ) : null}
            {reference ? (
              <View style={[styles.row, { borderColor: palette.border }] }>
                <Text style={[styles.label, { color: palette.textSecondary }]}>Reference</Text>
                <Text style={[styles.value, { color: palette.text }]}>{reference}</Text>
              </View>
            ) : null}
            <View style={[styles.row, { borderColor: palette.border }] }>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Timestamp</Text>
              <Text style={[styles.value, { color: palette.text }]}>{formatTimestamp(openedAt)}</Text>
            </View>
          </View>

          <Pressable onPress={onClose} style={[styles.primaryButton, { backgroundColor: tone.accent }] }>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>

          {onViewReceipt ? (
            <Pressable onPress={onViewReceipt} style={[styles.secondaryButton, { backgroundColor: palette.bg, borderColor: palette.border }] }>
              <Text style={[styles.secondaryText, { color: palette.text }]}>View Receipt</Text>
            </Pressable>
          ) : null}
        </Animated.View>
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: Typography.xl,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  rows: {
    gap: 10,
  },
  row: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  value: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
    flexShrink: 1,
    textAlign: 'right',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
