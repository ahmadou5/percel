import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LocalAuthentication } from '@/lib/localAuthentication';
import { router } from 'expo-router';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { useVerifyTransferPin, useWallet } from '@/hooks/useWallet';
import { useDriverStore } from '@/store/driver.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { CustomNumericKeypad } from '@/components/ui/CustomNumericKeypad';

const PIN_LENGTH = 4;

export default function DriverAuthLockScreen() {
  const palette = useAppPalette();
  const user = useDriverStore((state) => state.user);
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isUnlocked = useDriverStore((state) => state.isUnlocked);
  const unlock = useDriverStore((state) => state.unlock);
  const logout = useLogout();
  const verifyPin = useVerifyTransferPin();
  const walletQuery = useWallet();
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
  const walletReady = !walletQuery.isLoading && !walletQuery.isFetching;
  const appLockEnabled = usePreferencesStore((state) => state.appLockEnabled);
  const setBiometricPromptActive = useDriverStore((state) => state.setBiometricPromptActive);
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
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!appLockEnabled || !walletPinSet) {
      unlock();
      router.replace('/(tabs)/home');
      return;
    }

    if (isUnlocked) {
      router.replace('/(tabs)/home');
    }
  }, [appLockEnabled, isUnlocked, unlock, walletPinSet]);


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
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
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
    setBiometricPromptActive(true);
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;
      if (!hardware || !enrolled) {
        setError('Biometrics are not set up on this device.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Percel Driver',
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
      setBiometricPromptActive(false);
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
      <View style={[styles.overlay, { backgroundColor: palette.text === '#FFFFFF' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)' }]} />

      <View style={styles.topBar}>
        <Pressable onPress={() => void logout.mutateAsync().then(() => router.replace('/(auth)/login'))} style={styles.topAction}>
          <Text style={[styles.logOutText, { color: palette.error }]}>Log out</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/modal')} style={[styles.helpPill, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.helpText, { color: palette.text }]}>Help</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: palette.primary }]}> 
          <Text style={[styles.avatarText, { color: '#fff' }]}>{avatarInitials}</Text>
        </View>

        <Text style={[styles.heading, { color: palette.text }]}>Welcome back, {firstName}</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Unlock before accepting deliveries.</Text>

        {!walletPinSet && walletReady ? (
          <View style={[styles.alert, { backgroundColor: 'rgba(255, 149, 0, 0.12)', borderColor: 'rgba(255, 149, 0, 0.3)' }]} />
        ) : null}

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

        <View style={styles.keypadContainer}>
          <CustomNumericKeypad
            mode="pin"
            onPressDigit={appendDigit}
            onDelete={removeDigit}
            leftAction="bio"
            onBiometricPress={() => void triggerBiometric()}
            disabled={verifyPin.isPending || success}
          />
        </View>

        <Pressable onPress={() => router.push('/profile/security')}>
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
  keypadContainer: { width: '100%', maxWidth: 380, marginTop: 10 },
  forgot: { marginTop: 4, fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
});
