import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { haptics } from '@/utils/haptics';

type ConfirmRow = {
  label: string;
  value: string;
};

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  rows: ConfirmRow[];
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmSheet({
  visible,
  title,
  description,
  rows,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.96)).current;
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!visible) return;
    void haptics.tap();
    if (reduceMotion) return;

    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, reduceMotion, scale, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View style={[styles.sheet, { opacity, transform: [{ scale }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={styles.rows}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.value}>{row.value}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPressIn={() => void haptics.press()}
            onPress={onConfirm}
            style={({ pressed }) => [styles.confirm, pressed ? styles.pressed : null]}
          >
            <Text style={styles.confirmText}>{loading ? 'Processing…' : confirmLabel}</Text>
          </Pressable>
          <Pressable
            onPressIn={() => void haptics.tap()}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.light.border,
  },
  title: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  description: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  rows: { gap: Spacing.sm, marginTop: Spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  label: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  value: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold, maxWidth: '60%' },
  confirm: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  confirmText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
  cancel: {
    backgroundColor: Colors.light.bg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelText: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.semibold },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
