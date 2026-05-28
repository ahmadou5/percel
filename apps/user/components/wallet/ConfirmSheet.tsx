import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.sheet}>
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
          <Pressable onPress={onConfirm} style={styles.confirm}>
            <Text style={styles.confirmText}>{loading ? 'Processing…' : confirmLabel}</Text>
          </Pressable>
          <Pressable onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
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
});
