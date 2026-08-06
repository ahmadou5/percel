import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View as RNView } from 'react-native';

import { Text } from '@/components/Themed';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette, hexToRgba } from '@/lib/theme';

export function Screen({ children }: { children: ReactNode }) {
  const palette = useAppPalette();
  return (
    <RNView style={[styles.screen, { backgroundColor: palette.bg }]}>
      {children}
    </RNView>
  );
}

export function Card({ children, tone = 'surface' }: { children: ReactNode; tone?: 'surface' | 'tint' }) {
  const palette = useAppPalette();
  return (
    <RNView
      style={[
        styles.card,
        {
          backgroundColor: tone === 'tint' ? hexToRgba(palette.primary, 0.1) : palette.card,
          borderColor: palette.border,
        },
        tone === 'tint' ? styles.cardTint : null,
      ]}
    >
      {children}
    </RNView>
  );
}

export function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  const palette = useAppPalette();
  return (
    <RNView style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      {caption ? <Text style={[styles.sectionCaption, { color: palette.textSecondary }]}>{caption}</Text> : null}
    </RNView>
  );
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const palette = useAppPalette();
  const toneBg = {
    neutral: hexToRgba(palette.textSecondary, 0.14),
    success: hexToRgba(palette.success, 0.16),
    warning: hexToRgba(palette.warning, 0.22),
    danger: hexToRgba(palette.error, 0.14),
    info: hexToRgba(palette.primary, 0.12),
  }[tone];

  const toneText = {
    neutral: palette.textSecondary,
    success: palette.success,
    warning: palette.warning,
    danger: palette.error,
    info: palette.primary,
  }[tone];

  return (
    <RNView style={[styles.pill, { backgroundColor: toneBg }]}>
      <Text style={[styles.pillText, { color: toneText }]}>{label}</Text>
    </RNView>
  );
}

export function ActionButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ComponentProps<typeof FontAwesome>['name'];
  disabled?: boolean;
}) {
  const palette = useAppPalette();

  const variantStyle = {
    primary: { backgroundColor: palette.primary },
    secondary: { backgroundColor: palette.primaryDark ?? palette.primary },
    ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.primary },
    danger: { backgroundColor: palette.error },
  }[variant];

  const textColor = variant === 'ghost' ? palette.primary : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      {icon ? <FontAwesome name={icon} size={14} color={textColor} /> : null}
      <Text style={[styles.buttonText, { color: textColor }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
  helperText,
  maxLength,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  secureTextEntry?: boolean;
  multiline?: boolean;
  helperText?: string;
  maxLength?: number;
  editable?: boolean;
}) {
  const palette = useAppPalette();
  return (
    <RNView style={[styles.inputWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={palette.textSecondary}
        secureTextEntry={secureTextEntry}
        style={[styles.input, { color: palette.text }, multiline ? styles.inputMultiline : null]}
        value={value}
        onChangeText={onChangeText}
      />
      {helperText ? <Text style={[styles.inputHelper, { color: palette.textSecondary }]}>{helperText}</Text> : null}
    </RNView>
  );
}

export function StatChip({ label, value }: { label: string; value: string }) {
  const palette = useAppPalette();
  return (
    <RNView style={[styles.statChip, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.statChipLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.statChipValue, { color: palette.text }]}>{value}</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
  },
  cardTint: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,

  },
  sectionCaption: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.semibold,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  button: {
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonText: {
    fontSize: 14,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
    letterSpacing: 0,
  },
  inputWrap: {
    gap: 8,
    borderRadius: 18,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 15,
    fontWeight: Typography.semibold,
    fontFamily: Typography.family.semibold,
    minHeight: 22,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputHelper: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.family.regular,
  },
  statChip: {
    flex: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: 4,
  },
  statChipLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
  statChipValue: {
    fontSize: 18,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
});
