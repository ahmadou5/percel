import { Link, router } from 'expo-router';
import { useState, useMemo } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Typography } from '@/constants/typography';
import { useLogin } from '@/hooks/useAuth';
import { useAppPalette, isLight } from '@/lib/theme';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+234\d{10}$/;

export default function LoginScreen() {
  const theme = useAppPalette();
  const lightBg = isLight(theme.bg);
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useLogin({
    onSuccess: () => router.replace('/'),
    onError: () => setError('Invalid phone number/email or password.'),
  });

  const isEmail = useMemo(() => identifier.includes('@') || /[a-zA-Z]/.test(identifier), [identifier]);
  const cleanPhone = useMemo(() => identifier.replace(/\D/g, ''), [identifier]);
  
  const stepOneValid = useMemo(() => {
    if (isEmail) {
      return emailRegex.test(identifier);
    }
    return phoneRegex.test(`+234${cleanPhone}`);
  }, [isEmail, identifier, cleanPhone]);

  const handleNext = () => {
    if (stepOneValid) setStep(2);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(1);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    if (!password) return;
    const formattedIdentifier = isEmail ? identifier.trim() : `+234${cleanPhone}`;
    login.mutate({ identifier: formattedIdentifier, password });
  };

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <AuthBackdrop />
        <View style={[styles.overlay, { backgroundColor: lightBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]} />
        
        <View style={styles.topRow}>
          <Pressable onPress={handleBack} style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Ionicons name="arrow-back" size={18} color={theme.text} />
          </Pressable>
          
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${step === 1 ? 50 : 100}%`, backgroundColor: theme.primary }]} />
          </View>

          <Link href="/(auth)/register" asChild>
            <Pressable style={[styles.topLink, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.topLinkText, { color: theme.primary }]}>Sign Up</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.cardWrap}>
          <Animated.View entering={FadeInDown.duration(600)} style={[styles.card, { backgroundColor: lightBg ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.06)', borderColor: lightBg ? theme.border : 'rgba(255,255,255,0.08)' }]}>
            
            {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

            {step === 1 ? (
              <Animated.View key="step-1" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: theme.text }]}>WELCOME BACK</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>Enter your phone number or email address to start.</Text>

                <Input
                  label="Phone or Email"
                  placeholder="801 234 5678 or name@email.com"
                  value={identifier}
                  onChangeText={(val) => {
                    const isPhone = val.replace(/[\s-+]/g, '').length > 0 && /^\d+$/.test(val.replace(/[\s-+]/g, ''));
                    if (isPhone) {
                      const cleaned = val.replace(/[\s-]/g, '');
                      if (cleaned.startsWith('+234')) {
                        setIdentifier(cleaned.slice(4));
                      } else if (cleaned.startsWith('234') && cleaned.length >= 13) {
                        setIdentifier(cleaned.slice(3));
                      } else if (cleaned.startsWith('0')) {
                        setIdentifier(cleaned.slice(1));
                      } else {
                        setIdentifier(cleaned);
                      }
                    } else {
                      setIdentifier(val);
                    }
                  }}
                  autoCapitalize="none"
                  keyboardType={isEmail ? "email-address" : "phone-pad"}
                  leftElement={
                    !isEmail ? (
                      <View style={[styles.countryPill, { backgroundColor: lightBg ? '#f0f5ff' : '#202025', borderColor: theme.border }]}>
                        <Text style={[styles.countryFlag, { color: theme.text }]}>🇳🇬</Text>
                        <Text style={[styles.countryCode, { color: theme.text }]}>+234</Text>
                      </View>
                    ) : undefined
                  }
                />

                <View style={styles.ctaWrap}>
                  <Button title="Continue" disabled={!stepOneValid} onPress={handleNext} size="lg" style={styles.cta} />
                </View>
              </Animated.View>
            ) : (
              <Animated.View key="step-2" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: theme.text }]}>PASSWORD</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>Enter the password associated with {identifier}.</Text>

                <Input 
                  label="Password" 
                  placeholder="Your password" 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry 
                  secureToggle 
                  autoFocus
                />

                <View style={styles.actionsRow}>
                  <Link href="/(auth)/forgot-password" asChild>
                    <Pressable>
                      <Text style={[styles.forgot, { color: theme.primary }]}>Forgot password?</Text>
                    </Pressable>
                  </Link>
                  <Pressable style={styles.bioButton}>
                    <Ionicons name="finger-print-outline" size={18} color={theme.primary} />
                    <Text style={[styles.bioText, { color: theme.textSecondary }]}>Use Face / Touch ID</Text>
                  </Pressable>
                </View>

                <View style={styles.ctaWrap}>
                  <Button 
                    title={login.isPending ? 'Logging in…' : 'Log In'} 
                    loading={login.isPending} 
                    disabled={!password || login.isPending} 
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
    fontSize: 26,
    lineHeight: 30,
    fontFamily: Typography.family.bold,
    letterSpacing: -0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
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
