import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type Props = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  secureToggle?: boolean;
  rightLabel?: string;
};

export function Input({ label, error, helperText, secureTextEntry, secureToggle, rightLabel, ...props }: Props) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          {...props}
          style={styles.input}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          placeholderTextColor={Colors.light.textSecondary}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10}>
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
        {rightLabel ? <Text style={styles.toggle}>{rightLabel}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {helperText && !error ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.sm, fontWeight: Typography.medium, marginBottom: Spacing.xs },
  inputRow: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, fontSize: Typography.md, color: Colors.light.text },
  inputError: { borderColor: Colors.light.error },
  toggle: { color: Colors.light.primary, fontWeight: Typography.medium },
  error: { color: Colors.light.error, fontSize: Typography.xs, marginTop: Spacing.xs },
  helper: { color: Colors.light.textSecondary, fontSize: Typography.xs, marginTop: Spacing.xs },
});
