import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

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
          keyboardType="number-pad"
          placeholder={placeholder ?? '0'}
          placeholderTextColor={theme.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      {helperText ? <Text style={[styles.helper, { color: theme.textSecondary }]}>{helperText}</Text> : null}
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
});
