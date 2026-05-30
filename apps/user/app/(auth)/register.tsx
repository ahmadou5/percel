import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useRegister } from '@/hooks/useAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+234\d{10}$/;
const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

type Step = 1 | 2;

export default function RegisterScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValue = phone.replace(/\D/g, '');

  const stepOneValid = useMemo(
    () => fullName.trim().length >= 2 && emailRegex.test(email) && phoneRegex.test(`+234${phoneValue}`) && acceptedTerms,
    [acceptedTerms, email, fullName, phoneValue],
  );

  const passwordValid = passRegex.test(password);

  const register = useRegister({
    onSuccess: () => router.replace('/'),
    onError: () => setError('Registration failed. Please try again.'),
  });

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <AuthBackdrop />
        <View style={[styles.overlay, { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)' }]} />
        <View style={styles.topRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${step === 1 ? 50 : 100}%`, backgroundColor: theme.primary }]} />
          </View>
          <Link href="/(auth)/login" asChild>
            <Pressable style={[styles.topLink, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.topLinkText, { color: theme.primary }]}>Log In</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.cardWrap}>
          <Animated.View entering={FadeInDown.duration(700)} style={[styles.card, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.86)', borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : theme.border }]}>
          <Text style={[styles.heading, { color: theme.text }]}>{step === 1 ? 'CREATE AN ACCOUNT' : 'SET YOUR PASSWORD'}</Text>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>{step === 1 ? 'Start with your profile details and terms approval. We’ll keep the rest simple.' : 'Choose a strong password to lock in your new account.'}</Text>

          {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

          {step === 1 ? (
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(560)}>
                <Input label="Full name" placeholder="Your full name" value={fullName} onChangeText={setFullName} error={fullName && fullName.trim().length < 2 ? 'Min 2 characters' : undefined} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(190).duration(560)}>
                <Input label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} error={email && !emailRegex.test(email) ? 'Enter a valid email' : undefined} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(260).duration(560)}>
                <Input
                  label="Phone number"
                  placeholder="801 234 5678"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(value) => setPhone(value.replace(/\D/g, ''))}
                  error={phone && !phoneRegex.test(`+234${phoneValue}`) ? 'Enter a valid Nigerian phone number' : undefined}
                  leftElement={(
                    <View style={[styles.countryPill, { backgroundColor: scheme === 'dark' ? '#202025' : '#f0f5ff', borderColor: theme.border }]}>
                      <Text style={[styles.countryFlag, { color: theme.text }]}>🇳🇬</Text>
                      <Text style={[styles.countryCode, { color: theme.text }]}>+234</Text>
                      <Feather name="chevron-down" size={14} color={theme.textSecondary} />
                    </View>
                  )}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(320).duration(520)} style={styles.termsRow}>
                <Pressable
                  onPress={() => setAcceptedTerms((value) => !value)}
                  style={[styles.checkbox, { borderColor: acceptedTerms ? theme.primary : theme.border, backgroundColor: acceptedTerms ? theme.primary : 'transparent' }]}
                >
                  {acceptedTerms ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </Pressable>
                <View style={styles.termsCopy}>
                  <Text style={[styles.termsText, { color: theme.textSecondary }]}>I agree to the </Text>
                  <Link href="https://percel.app/terms" asChild>
                    <Pressable>
                      <Text style={[styles.termsLink, { color: theme.primary }]}>Terms & Conditions</Text>
                    </Pressable>
                  </Link>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(380).duration(520)} style={styles.ctaWrap}>
                <Button title="Next" disabled={!stepOneValid} onPress={() => setStep(2)} size="lg" style={styles.cta} />
              </Animated.View>
            </>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(560)}>
                <Input label="Password" placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry secureToggle error={password && !passRegex.test(password) ? 'Min 8 chars, one uppercase, one number' : undefined} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).duration(520)} style={styles.summaryBox}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Account summary</Text>
                <Text style={[styles.summaryText, { color: theme.text }]}>{fullName}</Text>
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{email}</Text>
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{`+234${phoneValue}`}</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(250).duration(520)} style={styles.ctaWrap}>
                <Button
                  title={register.isPending ? 'Creating…' : 'Create account'}
                  disabled={!passwordValid}
                  loading={register.isPending}
                  onPress={() => register.mutate({ fullName, email, phone: `+234${phoneValue}`, password })}
                  size="lg"
                  style={styles.cta}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(310).duration(520)} style={styles.backRow}>
                <Pressable onPress={() => setStep(1)}>
                  <Text style={[styles.backText, { color: theme.primary }]}>Go back</Text>
                </Pressable>
              </Animated.View>
            </>
          )}
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
    gap: 12,
    zIndex: 2,
    position: 'absolute',
    top: 24,
    left: 20,
    right: 20,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  topLink: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  topLinkText: {
    fontSize: 13,
    fontFamily: Typography.family.semibold,
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
    fontSize: 34,
    lineHeight: 38,
    fontFamily: Typography.family.bold,
    letterSpacing: -1.1,
    marginBottom: 4,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsCopy: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  ctaWrap: {
    marginTop: 6,
    width: '100%',
  },
  cta: {
    width: '100%',
  },
  summaryBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    marginTop: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: Typography.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  backRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  backText: {
    fontSize: 14,
    fontFamily: Typography.family.semibold,
  },
});
