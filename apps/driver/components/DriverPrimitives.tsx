import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors, Spacing, Typography } from '@percel/shared/constants';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View as RNView } from 'react-native';

import { Text, View } from '@/components/Themed';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen} lightColor={Colors.light.bg} darkColor={Colors.dark.bg}>{children}</View>;
}

export function Card({ children, tone = 'surface' }: { children: ReactNode; tone?: 'surface' | 'tint' }) {
  return (
    <View
      style={[styles.card, tone === 'tint' ? styles.cardTint : null]}
      lightColor={tone === 'tint' ? '#0F172A' : Colors.light.card}
      darkColor={tone === 'tint' ? '#0F172A' : Colors.dark.card}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <RNView style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
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
  return (
    <View style={[styles.pill, pillTone[tone]]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonVariant[variant],
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      {icon ? <FontAwesome name={icon} size={14} color={variant === 'primary' ? '#061423' : '#F8FAFC'} /> : null}
      <Text style={[styles.buttonText, variant === 'primary' ? styles.buttonTextPrimary : styles.buttonTextLight]}>
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  secureTextEntry?: boolean;
  multiline?: boolean;
  helperText?: string;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        value={value}
        onChangeText={onChangeText}
      />
      {helperText ? <Text style={styles.inputHelper}>{helperText}</Text> : null}
    </View>
  );
}

export function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipLabel}>{label}</Text>
      <Text style={styles.statChipValue}>{value}</Text>
    </View>
  );
}

const buttonVariant = {
  primary: { backgroundColor: '#FDE68A' },
  secondary: { backgroundColor: '#1E293B' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  danger: { backgroundColor: '#3F1D1D' },
} as const;

const pillTone = {
  neutral: { backgroundColor: '#1E293B' },
  success: { backgroundColor: '#14432C' },
  warning: { backgroundColor: '#4C3D08' },
  danger: { backgroundColor: '#4B1C1C' },
  info: { backgroundColor: '#12324A' },
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    borderRadius: 28,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTint: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  sectionCaption: {
    color: '#94A3B8',
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  pillText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: Typography.bold,
    letterSpacing: 0.6,
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
    letterSpacing: 0.2,
  },
  buttonTextPrimary: { color: '#061423' },
  buttonTextLight: { color: '#F8FAFC' },
  inputWrap: {
    gap: 8,
    borderRadius: 20,
    padding: Spacing.lg,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: Typography.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: Typography.semibold,
    minHeight: 22,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputHelper: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  statChip: {
    flex: 1,
    borderRadius: 18,
    padding: Spacing.lg,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 4,
  },
  statChipLabel: {
    color: '#94A3B8',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: Typography.bold,
  },
  statChipValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: Typography.bold,
  },
});
