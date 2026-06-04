import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/palette';
import { useColorScheme } from '@/components/useColorScheme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { haptics } from '@/utils/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  style?: StyleProp<ViewStyle>;
};

const variantStyles = (theme: (typeof Colors)[keyof typeof Colors]): Record<Variant, object> => ({
  primary: { backgroundColor: theme.primary },
  secondary: { backgroundColor: theme.primaryDark },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.primary },
  danger: { backgroundColor: theme.error },
});

const sizeStyles: Record<Size, object> = {
  sm: { paddingHorizontal: Spacing.md, minHeight: 40 },
  md: { paddingHorizontal: Spacing.lg, minHeight: 48 },
  lg: { paddingHorizontal: Spacing.xl, minHeight: 52 },
};

export function Button({ title, onPress, disabled, loading, variant = 'primary', size = 'md', style }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    void haptics.press();
    if (reduceMotion) return;
    Animated.timing(scale, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      damping: 12,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        style={({ pressed }) => [styles.base, variantStyles(theme)[variant], sizeStyles[size], disabled ? styles.disabled : null, pressed ? styles.pressed : null, style]}
      >
        <View style={styles.row}>
          {loading ? <ActivityIndicator color={variant === 'ghost' ? theme.primary : '#fff'} /> : null}
          <Text style={[styles.text, { color: variant === 'ghost' ? theme.primary : '#fff' }]}>{title}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  text: { fontSize: Typography.md, fontFamily: Typography.family.semibold },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  disabled: { opacity: 0.5 },
});
