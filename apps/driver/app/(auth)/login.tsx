import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { AuthButton, AuthInput, CountryPill, ErrorBanner, KeyboardView, useAuthPalette } from '@/components/auth/AuthControls';
import { useLogin } from '@/hooks/useAuth';
import { useDriverStore } from '@/store/driver.store';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+234\d{10}$/;

type Step = 1 | 2;

function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+234')) return cleaned.slice(4).replace(/\D/g, '');
  if (cleaned.startsWith('234') && cleaned.length >= 13) return cleaned.slice(3).replace(/\D/g, '');
  if (cleaned.startsWith('0')) return cleaned.slice(1).replace(/\D/g, '');
  return cleaned.replace(/\D/g, '');
}

function routeForStatus(status: string | undefined) {
  return status === 'ACTIVE' || status === 'ONLINE' || status === 'OFFLINE' ? '/(tabs)' : '/(kyc)';
}

export default function LoginScreen() {
  const { palette, light } = useAuthPalette();
  const [step, setStep] = useState<Step>(1);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const driver = useDriverStore((s) => s.driver);
  const login = useLogin({
    onSuccess: () => {
      // Driver profile is stored in the store by persistDriverSession
      // Read status from store after login
      const storedDriver = useDriverStore.getState().driver;
      router.replace(routeForStatus(storedDriver?.status));
    },
    onRequiresVerification: (phone) => {
      router.replace({
        pathname: '/(auth)/register',
        params: { phone, step: '6' }
      });
    }
  });

  const isEmail = useMemo(() => identifier.includes('@') || /[a-zA-Z]/.test(identifier), [identifier]);
  const phoneValue = useMemo(() => normalizePhone(identifier), [identifier]);
  const stepOneValid = useMemo(() => {
    if (isEmail) return emailRegex.test(identifier.trim());
    return phoneRegex.test(`+234${phoneValue}`);
  }, [identifier, isEmail, phoneValue]);

  const submit = async () => {
    if (!password || login.isPending) return;
    setError(null);
    try {
      const formattedIdentifier = isEmail ? identifier.trim().toLowerCase() : `+234${phoneValue}`;
      await login.mutateAsync({ identifier: formattedIdentifier, password });
      // Navigation is handled inside the onSuccess callback above
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
      setError(serverMessage || err.message || 'Invalid driver credentials.');
    }
  };

  void driver; // suppress unused-var warning

  const back = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    router.back();
  };

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: palette.bg }]}> 
        <AuthBackdrop />
        <View style={[styles.overlay, { backgroundColor: light ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]} />

        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={back} style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.card }]}>
            <Ionicons name="arrow-back" size={18} color={palette.text} />
          </Pressable>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${step === 1 ? 50 : 100}%`, backgroundColor: palette.primary }]} />
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/register')} style={[styles.topLink, { borderColor: palette.border, backgroundColor: palette.card }]}>
            <Text style={[styles.topLinkText, { color: palette.primary }]}>Sign Up</Text>
          </Pressable>
        </View>

        <View style={styles.cardWrap}>
          <Animated.View entering={FadeInDown.duration(600)} style={[styles.card, { backgroundColor: light ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.06)', borderColor: light ? palette.border : 'rgba(255,255,255,0.08)' }]}> 
            {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

            {step === 1 ? (
              <Animated.View key="step-1" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>WELCOME BACK</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>Enter your driver phone number or email address to start.</Text>

                <AuthInput
                  label="Phone or Email"
                  placeholder="801 234 5678 or driver@email.com"
                  value={identifier}
                  onChangeText={(value) => setIdentifier(isEmail ? value : normalizePhone(value))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={isEmail ? 'email-address' : 'phone-pad'}
                  leftElement={!isEmail ? <CountryPill /> : undefined}
                  error={identifier && !stepOneValid ? 'Enter a valid email or Nigerian phone number' : undefined}
                />

                <AuthButton title="Continue" disabled={!stepOneValid} onPress={() => setStep(2)} />
              </Animated.View>
            ) : (
              <Animated.View key="step-2" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>PASSWORD</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>Enter the password for this driver account.</Text>

                <AuthInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  secureToggle
                  autoFocus
                />

                <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} style={{ alignSelf: 'flex-start', marginVertical: 8 }}>
                  <Text style={{ fontSize: 13, color: palette.primary, fontWeight: '600' }}>Forgot password?</Text>
                </Pressable>

                <AuthButton title={login.isPending ? 'Opening dashboard...' : 'Log In'} loading={login.isPending} disabled={!password || login.isPending} onPress={submit} />
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingVertical: 28 },
  overlay: { ...StyleSheet.absoluteFillObject },
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
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)' },
  progressFill: { height: '100%', borderRadius: 999 },
  topLink: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  topLinkText: { fontSize: 13, fontWeight: '700' },
  cardWrap: { flex: 1, justifyContent: 'center', width: '100%' },
  card: { alignSelf: 'center', width: '100%', maxWidth: 460, borderRadius: 28, borderWidth: 1, padding: 20, gap: 4 },
  heading: { fontSize: 26, lineHeight: 30, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subheading: { fontSize: 14, lineHeight: 20, marginBottom: 16, fontWeight: '400', textAlign: 'center' },
});
