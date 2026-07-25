import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';

/**
 * Wraps children in an animated pulse effect.
 */
export function SkeletonGroup({ children, style }: { children: React.ReactNode; style?: any }) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[{ opacity: pulseAnim }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * A standard list skeleton to replace StateCard spinners on list screens.
 */
export function ListSkeleton({ count = 5, style }: { count?: number; style?: any }) {
  const palette = useAppPalette();
  
  return (
    <SkeletonGroup style={[styles.listContainer, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.listRow, { borderBottomColor: palette.border }]}>
          <View style={[styles.avatar, { backgroundColor: palette.card }]} />
          <View style={styles.listBody}>
            <View style={[styles.line, { width: '80%', backgroundColor: palette.card }]} />
            <View style={[styles.line, { width: '50%', backgroundColor: palette.card, height: 12 }]} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/**
 * A standard form skeleton to replace StateCard spinners on forms.
 */
export function FormSkeleton({ count = 3, style }: { count?: number; style?: any }) {
  const palette = useAppPalette();
  
  return (
    <SkeletonGroup style={[styles.formContainer, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.formField}>
          <View style={[styles.labelLine, { backgroundColor: palette.card }]} />
          <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]} />
        </View>
      ))}
      <View style={[styles.submitButton, { backgroundColor: palette.card }]} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    gap: Spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  listBody: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 16,
    borderRadius: 8,
  },
  formContainer: {
    gap: Spacing.md,
  },
  formField: {
    gap: 8,
  },
  labelLine: {
    width: 100,
    height: 14,
    borderRadius: 7,
  },
  inputBox: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
  }
});
