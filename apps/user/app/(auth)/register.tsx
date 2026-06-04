import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { useColorScheme } from '@/components/useColorScheme';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Colors } from '@/constants/palette';
import { Typography } from '@/constants/typography';
import { useRegister } from '@/hooks/useAuth';
import { useSetTransferPin } from '@/hooks/useWallet';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+234\d{10}$/;
const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

type Step = 1 | 2 | 3 | 4 | 5;

export default function RegisterScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValue = phone.replace(/\D/g, '');
  const setPinMutation = useSetTransferPin();

  const register = useRegister({
    onSuccess: async () => {
      try {
        await setPinMutation.mutateAsync({ newPin: pin });
      } catch (err) {
        console.warn('Failed to set PIN after registration', err);
      }
      router.replace('/');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    },
  });

  const stepValid = useMemo(() => {
    switch (step) {
      case 1:
        return fullName.trim().length >= 2 && acceptedTerms;
      case 2:
        return phoneRegex.test(`+234${phoneValue}`);
      case 3:
        return emailRegex.test(email);
      case 4:
        return passRegex.test(password);
      case 5:
        return pin.length === 4;
      default:
        return false;
    }
  }, [step, fullName, acceptedTerms, phoneValue, email, password, pin]);

  const handleNext = () => {
    if (stepValid && step < 5) {
      setStep((current) => (current + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as Step);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    if (!stepValid || register.isPending || setPinMutation.isPending) return;
    setError(null);
    register.mutate({
      fullName,
      email,
      phone: `+234${phoneValue}`,
      password,
    });
  };

  const isSubmitting = register.isPending || setPinMutation.isPending;

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <AuthBackdrop />
        <View style={[styles.overlay, { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)' }]} />
        
        <View style={styles.topRow}>
          <Pressable onPress={handleBack} style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Ionicons name="arrow-back" size={18} color={theme.text} />
          </Pressable>
          
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(step / 5) * 100}%`, backgroundColor: theme.primary }]} />
          </View>

          <Link href="/(auth)/login" asChild>
            <Pressable style={[styles.topLink, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.topLinkText, { color: theme.primary }]}>Log In</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.cardWrap}>
          <Animated.View entering={FadeInDown.duration(600)} style={[styles.card, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.86)', borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : theme.border }]}>
            
            {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

            {step === 1 && (
              <Animated.View key="step-1" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: theme.text }]}>WHAT'S YOUR NAME?</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>Let's start with your full name to personalize your deliveries.</Text>

                <Input 
                  label="Full name" 
                  placeholder="Your full name" 
                  value={fullName} 
                  onChangeText={setFullName} 
                  error={fullName && fullName.trim().length < 2 ? 'Min 2 characters' : undefined} 
                />

                <View style={styles.termsRow}>
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
                </View>

                <View style={styles.ctaWrap}>
                  <Button title="Continue" disabled={!stepValid} onPress={handleNext} size="lg" style={styles.cta} />
                </View>
              </Animated.View>
            )}

            {step === 2 && (
              <Animated.View key="step-2" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: theme.text }]}>YOUR PHONE NUMBER</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>Provide your phone number to receive delivery updates.</Text>

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
                    </View>
                  )}
                  autoFocus
                />

                <View style={styles.ctaWrap}>
                  <Button title="Continue" disabled={!stepValid} onPress={handleNext} size="lg" style={styles.cta} />
                </View>
              </Animated.View>
            )}

            {step === 3 && (
              <Animated.View key="step-3" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: theme.text }]}>WHAT'S YOUR EMAIL?</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>Enter your email address to secure your account updates.</Text>

                <Input 
                  label="Email" 
                  placeholder="you@example.com" 
                  autoCapitalize="none" 
                  keyboardType="email-address" 
                  value={email} 
                  onChangeText={setEmail} 
                  error={email && !emailRegex.test(email) ? 'Enter a valid email' : undefined}
                  autoFocus
                />

                <View style={styles.ctaWrap}>
                  <Button title="Continue" disabled={!stepValid} onPress={handleNext} size="lg" style={styles.cta} />
                </View>
              </Animated.View>
            )}

            {step === 4 && (
              <Animated.View key="step-4" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: theme.text }]}>CREATE PASSWORD</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>Use a password containing at least 8 characters, an uppercase letter, and a number.</Text>

                <Input 
                  label="Password" 
                  placeholder="Create a password" 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry 
                  secureToggle 
                  error={password && !passRegex.test(password) ? 'Min 8 chars, one uppercase, one number' : undefined}
                  autoFocus
                />

                <View style={styles.ctaWrap}>
                  <Button title="Continue" disabled={!stepValid} onPress={handleNext} size="lg" style={styles.cta} />
                </View>
              </Animated.View>
            )}

            {step === 5 && (
              <Animated.View key="step-5" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: theme.text }]}>SET A SECURE PIN</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>Create a 4-digit transfer PIN to secure your wallet transactions.</Text>

                <PinInput
                  value={pin}
                  onChangeText={setPin}
                  loading={isSubmitting}
                  error={error || undefined}
                />

                <View style={styles.ctaWrap}>
                  <Button 
                    title={isSubmitting ? 'Creating account…' : 'Create Account'} 
                    loading={isSubmitting} 
                    disabled={!stepValid || isSubmitting} 
                    onPress={handleSubmit} 
                    size="lg" 
                    style={styles.cta} 
                  />
                </View>
              </Animated.View>
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
    justifyContent: 'space-between',
    zIndex: 2,
    position: 'absolute',
    top: 24,
    left: 20,
    right: 20,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 24,
    lineHeight: 28,
    fontFamily: Typography.family.bold,
    letterSpacing: -0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  countryFlag: { fontSize: 14 },
  countryCode: { fontSize: 12, fontWeight: '700' },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 12,
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
});
