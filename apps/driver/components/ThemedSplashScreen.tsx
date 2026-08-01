import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Package, Zap } from 'lucide-react-native';
import { AppPalette } from '@/lib/theme';

const { width } = Dimensions.get('window');

interface Props {
  palette: AppPalette;
  presetName?: string;
}

export function ThemedSplashScreen({ palette, presetName }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);
  const pulseRing = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    pulseRing.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 1600, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 1600, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
  }, [scale, opacity, pulseRing]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: pulseRing.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      {/* Dynamic Background Glowing Pulse Ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: palette.primary,
            shadowColor: palette.primary,
          },
          animatedGlowStyle,
        ]}
      />

      {/* Main Logo Content */}
      <View style={styles.centerContent}>
        <Animated.View style={[styles.iconContainer, { backgroundColor: palette.card, borderColor: palette.border }, animatedLogoStyle]}>
          <View style={[styles.iconBadge, { backgroundColor: palette.primary }]}>
            <Package size={38} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </Animated.View>

        <Text style={[styles.brandTitle, { color: palette.text }]}>PERCEL</Text>
        
        <View style={styles.badgeRow}>
          <Zap size={13} color={palette.primary} />
          <Text style={[styles.brandSubtitle, { color: palette.textSecondary }]}>
            EXPRESS LOGISTICS PLATFORM
          </Text>
        </View>

        {presetName && (
          <View style={[styles.themeChip, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.colorDot, { backgroundColor: palette.primary }]} />
            <Text style={[styles.themeChipText, { color: palette.textSecondary }]}>{presetName}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  centerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 24,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
