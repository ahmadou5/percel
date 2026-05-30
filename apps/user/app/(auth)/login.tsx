import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Colors } from '@/constants/palette';
import { Typography } from '@/constants/typography';
import { useLogin } from '@/hooks/useAuth';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useLogin({
    onSuccess: () => router.replace('/'),
    onError: () => setError('Invalid phone number or password.'),
  });

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <AuthBackdrop />
        <View style={[styles.overlay, { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)' }]} />
        <View style={styles.topRow}>
          <Text style={[styles.brand, { color: theme.text }]}>Percel</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable style={[styles.topLink, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.topLinkText, { color: theme.primary }]}>Sign Up</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.cardWrap}>
          <Animated.View entering={FadeInDown.duration(700)} style={[styles.card, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.86)', borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : theme.border }]}>
          <Text style={[styles.heading, { color: theme.text }]}>WELCOME BACK!</Text>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>Sign in with your phone number and password to keep your deliveries moving.</Text>

          {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

          <Animated.View entering={FadeInDown.delay(120).duration(560)}>
            <Input
              label="Phone number"
              placeholder="801 234 5678"
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, ''))}
              keyboardType="phone-pad"
              leftElement={(
                <Pressable style={[styles.countryPill, { backgroundColor: scheme === 'dark' ? '#202025' : '#f0f5ff', borderColor: theme.border }]}>
                  <Text style={[styles.countryFlag, { color: theme.text }]}>🇳🇬</Text>
                  <Text style={[styles.countryCode, { color: theme.text }]}>+234</Text>
                  <Feather name="chevron-down" size={14} color={theme.textSecondary} />
                </Pressable>
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(560)}>
            <Input label="Password" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry secureToggle />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(520)} style={styles.actionsRow}>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text style={[styles.forgot, { color: theme.primary }]}>Forgot password?</Text>
              </Pressable>
            </Link>
            <Pressable style={styles.bioButton}>
              <Ionicons name="finger-print-outline" size={18} color={theme.primary} />
              <Text style={[styles.bioText, { color: theme.textSecondary }]}>Use Face / Touch ID</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(340).duration(520)} style={styles.ctaWrap}>
            <Button title={login.isPending ? 'Logging in…' : 'Log In'} loading={login.isPending} onPress={() => login.mutate({ identifier: `+234${phone.replace(/\D/g, '')}`, password })} size="lg" style={styles.cta} />
          </Animated.View>
        </Animated.View>
        </View>
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
    position: 'absolute',
    top: 24,
    left: 20,
    right: 20,
  },
  brand: {
    fontSize: 20,
    fontFamily: Typography.family.bold,
    letterSpacing: -0.4,
  },
  topLink: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  topLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardWrap: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 4,
  },
  heading: {
    fontSize: 38,
    lineHeight: 40,
    fontFamily: Typography.family.bold,
    letterSpacing: -1.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  countryFlag: { fontSize: 16 },
  countryCode: { fontSize: 13, fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
    gap: 12,
  },
  forgot: {
    fontSize: 13,
    fontFamily: Typography.family.semibold,
  },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bioText: {
    fontSize: 13,
    fontFamily: Typography.family.semibold,
  },
  ctaWrap: {
    marginTop: 8,
    width: '100%',
  },
  cta: {
    width: '100%',
  },
});
