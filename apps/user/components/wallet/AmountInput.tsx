import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';
import { CustomNumericKeypad } from '@/components/ui/CustomNumericKeypad';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
};

export function AmountInput({ label, value, onChangeText, placeholder, helperText }: Props) {
  const theme = useAppPalette();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.card,
            borderColor: focused ? '#8B5CF6' : 'rgba(139, 92, 246, 0.15)',
          },
        ]}
      >
        <Text style={styles.prefix}>₦</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          showSoftInputOnFocus={false}
          placeholder={placeholder ?? '0'}
          placeholderTextColor={theme.textSecondary}
          onFocus={() => setFocused(true)}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      {helperText ? <Text style={[styles.helper, { color: theme.textSecondary }]}>{helperText}</Text> : null}

      {focused && (
        <Modal
          visible={focused}
          transparent
          animationType="slide"
          onRequestClose={() => setFocused(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setFocused(false)} />
            <View style={[styles.keypadSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>
                  {label}: ₦{value || '0'}
                </Text>
                <Pressable onPress={() => setFocused(false)} style={[styles.doneBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
              <CustomNumericKeypad
                mode="currency"
                onPressDigit={(d) => onChangeText(value + d)}
                onDelete={() => onChangeText(value.slice(0, -1))}
                onClear={() => onChangeText('')}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs, marginBottom: Spacing.md },
  label: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  prefix: { color: '#8B5CF6', fontSize: Typography.xl, fontFamily: Typography.family.bold, marginRight: 8 },
  input: { flex: 1, fontSize: Typography.xl, fontFamily: Typography.family.bold },
  helper: { fontSize: Typography.xs },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  keypadSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 32,
    gap: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sheetTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  doneBtnText: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
});
