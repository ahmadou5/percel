import { Link } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/constants/typography';
import { useAppPalette, isLight } from '@/lib/theme';

export default function WelcomeScreen() {
  const theme = useAppPalette();
  const lightBg = isLight(theme.bg);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <AuthBackdrop />
      <View style={[styles.overlay, { backgroundColor: lightBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]} />
      <View style={styles.shell}>
        <Animated.View entering={FadeInDown.duration(700)} style={styles.heroWrap}>
          <View style={[styles.heroMark, { backgroundColor: lightBg ? 'rgba(10,132,255,0.12)' : 'rgba(10,132,255,0.16)', borderColor: lightBg ? 'rgba(10,132,255,0.16)' : 'rgba(10,132,255,0.22)' }]}>
            <View style={[styles.heroMarkInner, { backgroundColor: theme.primary }]} />
          </View>
          <Text style={[styles.logo, { color: theme.text }]}>Percel</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(620)} style={styles.copyWrap}>
          <Text style={[styles.tagline, { color: theme.text }]}>Deliver anything, anywhere.</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>Fast dispatch, live tracking, and a clean payment flow built for people who move quickly.</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(620)} style={styles.ctaWrap}>
          <Link href="/(auth)/register" asChild>
            <Button title="Get Started" size="lg" style={styles.primaryButton} />
          </Link>
          <Link href="/(auth)/login" asChild>
            <Button title="I already have an account" variant="ghost" size="lg" style={styles.secondaryButton} />
          </Link>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    width: '100%',
    maxWidth: 460,
  },
  heroMark: {
    width: 128,
    height: 128,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    transform: [{ rotate: '-8deg' }],
  },
  heroMarkInner: {
    width: 72,
    height: 72,
    borderRadius: 24,
    opacity: 0.92,
    transform: [{ rotate: '18deg' }],
  },
  logo: {
    fontSize: 46,
    lineHeight: 50,
    fontFamily: Typography.family.bold,
    letterSpacing: -1.5,
  },
  copyWrap: {
    gap: 14,
    maxWidth: 460,
    width: '100%',
    marginTop: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Typography.family.bold,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
  },
  ctaWrap: {
    gap: 12,
    marginTop: 28,
    width: '100%',
    maxWidth: 460,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
});
