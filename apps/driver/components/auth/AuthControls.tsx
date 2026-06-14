import { Colors, Spacing, Typography } from '@percel/shared/constants';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  type TextInputProps,
} from 'react-native';

export function useAuthPalette() {
  const scheme = useColorScheme() ?? 'light';
  return {
    scheme,
    palette: Colors[scheme],
    light: scheme === 'light',
  };
}

export function KeyboardView({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthInput({
  label,
  error,
  helperText,
  secureToggle,
  leftElement,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  secureToggle?: boolean;
  leftElement?: ReactNode;
}) {
  const { palette } = useAuthPalette();
  const [hidden, setHidden] = useState(Boolean(props.secureTextEntry));
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: palette.text }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: palette.card, borderColor: focused && !error ? palette.primary : palette.border },
          error ? { borderColor: palette.error } : null,
        ]}
      >
        {leftElement ? <View style={styles.leftElement}>{leftElement}</View> : null}
        <TextInput
          {...props}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          placeholderTextColor={palette.textSecondary}
          secureTextEntry={secureToggle ? hidden : props.secureTextEntry}
          style={[styles.input, { color: palette.text }, props.style]}
        />
        {secureToggle ? (
          <Pressable accessibilityRole="button" onPress={() => setHidden((value) => !value)} hitSlop={10} style={styles.toggleButton}>
            <Text style={[styles.toggle, { color: palette.primary }]}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.inputMeta, { color: palette.error }]}>{error}</Text> : null}
      {helperText && !error ? <Text style={[styles.inputMeta, { color: palette.textSecondary }]}>{helperText}</Text> : null}
    </View>
  );
}

export function AuthButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const { palette } = useAuthPalette();
  const ghost = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        ghost ? { backgroundColor: 'transparent', borderColor: palette.primary, borderWidth: 1 } : { backgroundColor: palette.primary },
        disabled || loading ? styles.disabled : null,
        pressed && !disabled && !loading ? styles.pressed : null,
      ]}
    >
      <View style={styles.buttonRow}>
        {loading ? <ActivityIndicator color={ghost ? palette.primary : '#fff'} /> : null}
        <Text style={[styles.buttonText, { color: ghost ? palette.primary : '#fff' }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const { palette, light } = useAuthPalette();
  return (
    <View style={[styles.errorWrap, { backgroundColor: light ? '#FFF1EF' : '#2B1717', borderColor: palette.error }]}>
      <Text style={[styles.errorTitle, { color: palette.error }]}>Error</Text>
      <Text style={[styles.errorText, { color: palette.text }]}>{message}</Text>
      {onDismiss ? (
        <Pressable accessibilityRole="button" onPress={onDismiss} hitSlop={10}>
          <Text style={[styles.errorAction, { color: palette.primary }]}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CountryPill() {
  const { palette, light } = useAuthPalette();
  return (
    <View style={[styles.countryPill, { backgroundColor: light ? '#F0F5FF' : '#202025', borderColor: palette.border }]}>
      <Text style={[styles.countryFlag, { color: palette.text }]}>NG</Text>
      <Text style={[styles.countryCode, { color: palette.text }]}>+234</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inputWrap: { marginBottom: Spacing.lg },
  inputLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  inputRow: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.2,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: Typography.regular,
    minHeight: 48,
  },
  leftElement: { marginRight: Spacing.sm },
  toggleButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingLeft: Spacing.sm,
  },
  toggle: { fontWeight: Typography.semibold },
  inputMeta: { fontSize: Typography.xs, marginTop: Spacing.xs },
  button: {
    minHeight: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  buttonRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  buttonText: { fontSize: Typography.md, fontWeight: Typography.semibold },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  disabled: { opacity: 0.5 },
  errorWrap: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 6,
    width: '100%',
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: Typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorText: { fontSize: 15, lineHeight: 20, fontWeight: Typography.regular },
  errorAction: { fontWeight: Typography.semibold, alignSelf: 'flex-start' },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  countryFlag: { fontSize: 12, fontWeight: Typography.bold },
  countryCode: { fontSize: 12, fontWeight: Typography.bold },
});
