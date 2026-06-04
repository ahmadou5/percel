import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type Props = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  secureToggle?: boolean;
  rightLabel?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function Input({ label, error, helperText, secureTextEntry, secureToggle, rightLabel, leftElement, rightElement, containerStyle, inputStyle, onFocus, onBlur, ...props }: Props) {
  const theme = useAppPalette();
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: focused && !error ? theme.primary : theme.border, shadowColor: theme.primary }, error ? { borderColor: theme.error } : null, focused ? styles.focused : null]}>
        {leftElement ? <View style={styles.trailing}>{leftElement}</View> : null}
        <TextInput
          {...props}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, { color: theme.text }, inputStyle]}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          placeholderTextColor={theme.textSecondary}
        />
        {rightElement ? <View style={styles.trailing}>{rightElement}</View> : null}
        {secureToggle ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10}>
            <Text style={[styles.toggle, { color: theme.primary }]}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
        {rightLabel ? <Text style={[styles.toggle, { color: theme.primary }]}>{rightLabel}</Text> : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
      {helperText && !error ? <Text style={[styles.helper, { color: theme.textSecondary }]}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.sm, fontFamily: Typography.family.semibold, marginBottom: Spacing.xs, letterSpacing: 0.2 },
  inputRow: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.2,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  focused: { transform: [{ scale: 1.001 }] },
  input: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  trailing: { marginLeft: Spacing.sm },
  toggle: { fontFamily: Typography.family.semibold },
  error: { fontSize: Typography.xs, marginTop: Spacing.xs },
  helper: { fontSize: Typography.xs, marginTop: Spacing.xs },
});
