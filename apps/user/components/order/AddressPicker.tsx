import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  onPress?: () => void;
  helperText?: string;
};

export function AddressPicker({ label, value, placeholder, onChangeText, onPress, helperText }: Props) {
  const theme = useAppPalette();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={[
          styles.field,
          {
            backgroundColor: theme.card,
            borderColor: focused ? '#8B5CF6' : theme.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: theme.text }]}
        />
        <Text style={[styles.action, { color: theme.primary }]}>Search</Text>
      </Pressable>
      {helperText ? <Text style={[styles.helper, { color: theme.textSecondary }]}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  field: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  action: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  helper: { fontSize: Typography.xs },
});
