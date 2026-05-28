import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
};

const variantStyles: Record<Variant, object> = {
  primary: { backgroundColor: Colors.light.primary },
  secondary: { backgroundColor: Colors.light.primaryDark },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.light.primary },
  danger: { backgroundColor: Colors.light.error },
};

const sizeStyles: Record<Size, object> = {
  sm: { paddingHorizontal: Spacing.md, minHeight: 40 },
  md: { paddingHorizontal: Spacing.lg, minHeight: 48 },
  lg: { paddingHorizontal: Spacing.xl, minHeight: 52 },
};

export function Button({ title, onPress, disabled, loading, variant = 'primary', size = 'md' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, variantStyles[variant], sizeStyles[size], disabled ? styles.disabled : null]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={variant === 'ghost' ? Colors.light.primary : '#fff'} /> : null}
        <Text style={[styles.text, variant === 'ghost' ? styles.ghostText : null]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  text: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.semibold },
  ghostText: { color: Colors.light.primary },
  disabled: { opacity: 0.5 },
});
