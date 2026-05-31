import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LocalAuthentication } from '@/lib/localAuthentication';
import { router } from 'expo-router';
import { Fingerprint, MoveLeft } from 'lucide-react-native';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { useVerifyTransferPin, useWallet } from '@/hooks/useWallet';
import { useAuthStore } from '@/store/auth.store';
import { usePreferencesStore } from '@/store/preferences.store';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'back'] as const;

export default function AuthLockScreen() {
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const unlock = useAuthStore((state) => state.unlock);
  const logout = useLogout();
  const verifyPin = useVerifyTransferPin();
  const walletQuery = useWallet();
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
  const walletReady = !walletQuery.isLoading && !walletQuery.isFetching;
  const appLockEnabled = usePreferencesStore((state) => state.appLockEnabled);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const dotScales = useRef(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1))).current;
  const avatarInitials = useMemo(() => (user?.fullName ?? 'Percel').split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase(), [user?.fullName]);
  const firstName = useMemo(() => user?.fullName?.split(/\s+/).filter(Boolean)[0] ?? 'there', [user?.fullName]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!appLockEnabled || !walletPinSet) {
      unlock();
      router.replace('/');
      return;
    }

    if (isUnlocked) {
      router.replace('/');
    }
  }, [appLockEnabled, isUnlocked, unlock, walletPinSet]);

  useEffect(() => {
    if (!appLockEnabled || !walletPinSet || !walletReady) return;
    const timer = setTimeout(() => {
      void triggerBiometric();
    }, 300);
    return () => clearTimeout(timer);
  }, [appLockEnabled, walletPinSet, walletReady]);

  useEffect(() => {
    if (pin.length === 0) setError(null);
  }, [pin.length]);

  const animateDigit = (index: number) => {
    Animated.sequence([
      Animated.spring(dotScales[index], { toValue: 1.08, useNativeDriver: true, damping: 16, stiffness: 220, mass: 0.7 }),
      Animated.spring(dotScales[index], { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 220, mass: 0.7 }),
    ]).start();
  };

  const unlockAndContinue = () => {
    unlock();
    setSuccess(true);
    setTimeout(() => {
      router.replace('/');
    }, 240);
  };

  const handleWrongPin = () => {
    setError('Incorrect PIN');
    Animated.sequence([
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
    setPin('');
  };

  const submitPin = async (value: string) => {
    try {
      await verifyPin.mutateAsync({ pin: value });
      unlockAndContinue();
    } catch {
      handleWrongPin();
    }
  };

  const triggerBiometric = async () => {
    if (!appLockEnabled || biometricBusy || !isAuthenticated || isUnlocked || !walletPinSet) return;
    setBiometricBusy(true);
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;
      if (!hardware || !enrolled) {
        setError('Biometrics are not set up on this device.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Percel',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        unlockAndContinue();
        return;
      }

      setError('Biometric unlock was cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Biometric unlock failed.');
    } finally {
      setBiometricBusy(false);
    }
  };

  const appendDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH || verifyPin.isPending) return;
    const next = `${pin}${digit}`;
    setPin(next);
    animateDigit(next.length - 1);
    if (next.length === PIN_LENGTH) {
      void submitPin(next);
    }
  };

  const removeDigit = () => {
    if (!pin.length || verifyPin.isPending) return;
    setPin((current) => current.slice(0, -1));
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}> 
      <AuthBackdrop />
      <View style={[styles.overlay, { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)' }]} />

      <View style={styles.topBar}>
        <Pressable onPress={() => void logout.mutateAsync().then(() => router.replace('/(auth)/welcome'))} style={styles.topAction}>
          <Text style={[styles.logOutText, { color: palette.error }]}>Log out</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/settings/support')} style={[styles.helpPill, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.helpText, { color: palette.text }]}>Help</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: palette.primary }]}> 
          <Text style={[styles.avatarText, { color: palette.card }]}>{avatarInitials}</Text>
        </View>

        <Text style={[styles.heading, { color: palette.text }]}>Welcome back, {firstName}</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{appLockEnabled ? 'Enter your PIN or use biometrics.' : 'App lock is off right now.'}</Text>

        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, index) => {
              const filled = index < pin.length;
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      borderColor: success ? palette.success : filled ? palette.text : palette.border,
                      backgroundColor: success ? palette.success : filled ? palette.text : 'transparent',
                      transform: [{ scale: dotScales[index] }],
                    },
                  ]}
                />
              );
            })}
          </View>
        </Animated.View>
        {error ? <Text style={[styles.error, { color: palette.error }]}>{error}</Text> : <Text style={[styles.helper, { color: palette.textSecondary }]}>{appLockEnabled ? 'Biometric unlock is available when your device supports it.' : 'You can turn app lock back on in security settings.'}</Text>}

        <View style={styles.keypad}>
          {KEYS.map((key) => {
            if (key === 'bio') {
              return (
                <Pressable key={key} onPress={() => void triggerBiometric()} style={({ pressed }) => [styles.key, { backgroundColor: palette.card, borderColor: palette.border }, pressed ? styles.keyPressed : null]}>
                  <Fingerprint size={26} color={palette.primary} />
                </Pressable>
              );
            }

            if (key === 'back') {
              return (
                <Pressable key={key} onPress={() => removeDigit()} style={({ pressed }) => [styles.key, { backgroundColor: palette.card, borderColor: palette.border }, pressed ? styles.keyPressed : null]}>
                  <MoveLeft size={24} color={palette.text} />
                </Pressable>
              );
            }

            return (
              <Pressable key={key} onPress={() => appendDigit(key)} style={({ pressed }) => [styles.key, { backgroundColor: palette.card, borderColor: palette.border }, pressed ? styles.keyPressed : null]}>
                <Text style={[styles.keyText, { color: palette.text }]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => router.push('/settings/reset-pin')}>
          <Text style={[styles.forgot, { color: palette.primary }]}>Forgot PIN?</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  topBar: { position: 'absolute', top: Spacing.lg + 6, left: Spacing.lg, right: Spacing.lg, zIndex: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topAction: { minHeight: 40, justifyContent: 'center' },
  logOutText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  helpPill: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  helpText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingTop: 84, paddingBottom: Spacing.xl, gap: 14 },
  avatar: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 30, fontFamily: Typography.family.bold, letterSpacing: -0.6 },
  heading: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, textAlign: 'center', letterSpacing: -0.8 },
  subtitle: { fontSize: Typography.md, fontFamily: Typography.family.regular, textAlign: 'center', marginTop: -2 },
  dotsRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 8, marginBottom: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  error: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textAlign: 'center', marginBottom: 2 },
  helper: { fontSize: Typography.xs, fontFamily: Typography.family.regular, textAlign: 'center', marginBottom: 2 },
  keypad: { width: '100%', maxWidth: 380, flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  key: { width: '31%', minHeight: 72, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 24, lineHeight: 26, fontFamily: Typography.family.bold },
  keyPressed: { transform: [{ scale: 0.88 }], opacity: 0.92 },
  forgot: { marginTop: 4, fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
});
