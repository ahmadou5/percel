import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
};

export function AmountInput({ label, value, onChangeText, placeholder, helperText }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Text style={styles.prefix}>₦</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder={placeholder ?? '0'}
          placeholderTextColor={Colors.light.textSecondary}
          style={styles.input}
        />
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  prefix: { color: Colors.light.textSecondary, fontSize: Typography.xl, fontWeight: Typography.bold, marginRight: 8 },
  input: { flex: 1, color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  helper: { color: Colors.light.textSecondary, fontSize: Typography.xs },
});
