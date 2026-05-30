import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/palette';
import { useColorScheme } from '@/components/useColorScheme';

export function AuthBackdrop() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, {
        duration: 7000,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 5200,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [float, pulse]);

  const orbA = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(float.value, [0, 1], [0, 22]) },
      { translateY: interpolate(float.value, [0, 1], [0, 18]) },
      { scale: interpolate(pulse.value, [0, 1], [0.96, 1.04]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.42, 0.62]),
  }));

  const orbB = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(float.value, [0, 1], [0, -16]) },
      { translateY: interpolate(float.value, [0, 1], [0, 22]) },
      { scale: interpolate(pulse.value, [0, 1], [1.04, 0.95]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.22, 0.38]),
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.base, { backgroundColor: theme.bg }]} />
      <Animated.View style={[styles.orbA, { backgroundColor: theme.primary }, orbA]} />
      <Animated.View style={[styles.orbB, { backgroundColor: theme.primaryDark }, orbB]} />
      <View style={[styles.line, { backgroundColor: theme.primary, opacity: scheme === 'dark' ? 0.08 : 0.12 }]} />
      <View style={[styles.lineAlt, { backgroundColor: theme.primaryDark, opacity: scheme === 'dark' ? 0.06 : 0.08 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
  },
  orbA: {
    position: 'absolute',
    top: -120,
    right: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  orbB: {
    position: 'absolute',
    left: -130,
    bottom: 80,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  line: {
    position: 'absolute',
    top: 120,
    left: -60,
    width: 260,
    height: 14,
    borderRadius: 999,
    transform: [{ rotate: '-22deg' }],
  },
  lineAlt: {
    position: 'absolute',
    bottom: 180,
    right: -50,
    width: 220,
    height: 12,
    borderRadius: 999,
    transform: [{ rotate: '18deg' }],
  },
});
