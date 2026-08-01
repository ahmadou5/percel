import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Fingerprint, LogOut } from 'lucide-react-native';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { LocalAuthentication } from '@/lib/localAuthentication';
import { useAppPalette } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';
import { usePreferencesStore } from '@/store/preferences.store';

export default function DriverAuthLockScreen() {
  const palette = useAppPalette();
  const user = useDriverStore((state) => state.user);
  const isAuthenticated = useDriverStore((state) => state.isAuthenticated);
  const isUnlocked = useDriverStore((state) => state.isUnlocked);
  const unlock = useDriverStore((state) => state.unlock);
  const setBiometricPromptActive = useDriverStore((state) => state.setBiometricPromptActive);
  const appLockEnabled = usePreferencesStore((state) => state.appLockEnabled);
  const logout = useLogout();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    return (user?.fullName ?? 'Driver')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.fullName]);

  const firstName = useMemo(() => user?.fullName?.split(/\s+/).filter(Boolean)[0] ?? 'there', [user?.fullName]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!appLockEnabled) {
      unlock();
      router.replace('/(tabs)/home');
      return;
    }

    if (isUnlocked) {
      router.replace('/(tabs)/home');
    }
  }, [appLockEnabled, isUnlocked, unlock]);

  useEffect(() => {
    if (!appLockEnabled || !isAuthenticated || isUnlocked) return;
    const timer = setTimeout(() => {
      void triggerUnlock();
    }, 300);
    return () => clearTimeout(timer);
  }, [appLockEnabled, isAuthenticated, isUnlocked]);

  const unlockAndContinue = () => {
    unlock();
    router.replace('/(tabs)/home');
  };

  const triggerUnlock = async () => {
    if (busy || !isAuthenticated || isUnlocked) return;
    setBusy(true);
    setBiometricPromptActive(true);
    setError(null);
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;
      if (!hardware || !enrolled) {
        setError('Set up device biometrics or screen lock to use driver app lock.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Percel Driver',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        unlockAndContinue();
        return;
      }

      setError('Unlock was cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed.');
    } finally {
      setBusy(false);
      setBiometricPromptActive(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}> 
      <AuthBackdrop />
      <View style={[styles.overlay, { backgroundColor: palette.text === '#FFFFFF' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)' }]} />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => void logout.mutateAsync().then(() => router.replace('/(auth)/login'))}
          style={styles.logoutButton}
        >
          <LogOut size={16} color={palette.error} />
          <Text style={[styles.logoutText, { color: palette.error }]}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
          <Text style={[styles.avatarText, { color: '#fff' }]}>{initials}</Text>
        </View>
        <Text style={[styles.heading, { color: palette.text }]}>Welcome back, {firstName}</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Unlock before accepting deliveries.</Text>

        <Pressable
          onPress={() => void triggerUnlock()}
          disabled={busy}
          style={({ pressed }) => [styles.unlockButton, { backgroundColor: palette.primary }, pressed && !busy ? styles.pressed : null, busy ? styles.disabled : null]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Fingerprint size={20} color="#fff" />}
          <Text style={styles.unlockText}>{busy ? 'Checking...' : 'Unlock'}</Text>
        </Pressable>

        {error ? <Text style={[styles.error, { color: palette.error }]}>{error}</Text> : <Text style={[styles.helper, { color: palette.textSecondary }]}>Uses your device biometric or passcode.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  topBar: { position: 'absolute', top: Spacing.xl, left: Spacing.lg, right: Spacing.lg, zIndex: 5, alignItems: 'flex-start' },
  logoutButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: 14 },
  avatar: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 30, fontFamily: Typography.family.bold, letterSpacing: 0 },
  heading: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, textAlign: 'center', letterSpacing: 0 },
  subtitle: { fontSize: Typography.md, fontFamily: Typography.family.regular, textAlign: 'center' },
  unlockButton: { minHeight: 54, minWidth: 180, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8 },
  unlockText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.7 },
  error: { maxWidth: 300, fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.semibold, textAlign: 'center' },
  helper: { fontSize: Typography.xs, fontFamily: Typography.family.regular, textAlign: 'center' },
});
