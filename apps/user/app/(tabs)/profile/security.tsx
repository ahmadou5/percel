import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { useResetTransferPin, useSetTransferPin, useWallet } from '@/hooks/useWallet';
import { useAuthStore } from '@/store/auth.store';
import { useColorScheme } from '@/components/useColorScheme';
import { usePreferencesStore } from '@/store/preferences.store';
import { ChevronLeft } from 'lucide-react-native';

const pinPattern = /^\d{4,6}$/;

export default function ProfileSecurityScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const mutation = useSetTransferPin();
  const resetMutation = useResetTransferPin();
  const walletQuery = useWallet();
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
  const appLockEnabled = usePreferencesStore((state) => state.appLockEnabled);
  const setAppLockEnabled = usePreferencesStore((state) => state.setAppLockEnabled);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const currentPinError = useMemo(() => {
    if (!currentPin) return null;
    return pinPattern.test(currentPin) ? null : 'Use 4 to 6 digits.';
  }, [currentPin]);

  const newPinError = useMemo(() => {
    if (!newPin) return null;
    if (!pinPattern.test(newPin)) return 'Use 4 to 6 digits.';
    if (confirmPin && newPin !== confirmPin) return 'PINs do not match.';
    return null;
  }, [confirmPin, newPin]);

  const confirmError = useMemo(() => {
    if (!confirmPin) return null;
    if (!pinPattern.test(confirmPin)) return 'Use 4 to 6 digits.';
    if (newPin && newPin !== confirmPin) return 'PINs do not match.';
    return null;
  }, [confirmPin, newPin]);

  const canSave = pinPattern.test(newPin) && newPin === confirmPin && (!walletPinSet || pinPattern.test(currentPin));
  const biometricLabel = walletPinSet ? (appLockEnabled ? 'On' : 'Off') : 'Locked';

  const savePin = async () => {
    if (!canSave) return;
    try {
      await mutation.mutateAsync({ currentPin: walletPinSet ? currentPin : undefined, newPin });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Transfer PIN saved', walletPinSet ? 'Your transfer PIN has been updated.' : 'Your wallet transfers now require this PIN.');
    } catch (error) {
      Alert.alert('Could not save PIN', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const removePin = async () => {
    if (!walletPinSet || !pinPattern.test(currentPin)) return;
    try {
      await resetMutation.mutateAsync({ currentPin });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      await setAppLockEnabled(false);
      Alert.alert('Transfer PIN removed', 'Transfers will no longer require a PIN until you set one again.');
    } catch (error) {
      Alert.alert('Could not remove PIN', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onToggleAppLock = async (next: boolean) => {
    if (next && !walletPinSet) {
      Alert.alert('Set a PIN first', 'Create a transfer PIN above before turning on app lock.');
      return;
    }

    await setAppLockEnabled(next);
  };

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: palette.bg }]}>
        <View style={styles.content}>
       <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, {  borderColor: palette.border }]}>
         <ChevronLeft size={20} color={palette.text} fill={"none"}  />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Security</Text>
        <View style={styles.headerSpacer} />
      </View>
          <View style={[styles.heroCard, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.12)' }]}> 
            <Text style={styles.eyebrow}>Security</Text>
            <Text style={styles.title}>{user?.fullName ?? 'Account'} protection</Text>
            <Text style={styles.subtitle}>Set a transfer PIN, then decide whether the app should lock when you come back.</Text>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>Transfer PIN</Text>
                <Text style={styles.statValue}>{walletPinSet ? 'Active' : 'Not set'}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>App lock</Text>
                <Text style={styles.statValue}>{biometricLabel}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Wallet security</Text>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Transfer PIN</Text>
            <Text style={[styles.sectionCopy, { color: palette.textSecondary }]}>Use a 4 to 6 digit code before you can send money from your wallet.</Text>
            <Text style={[styles.status, { color: walletPinSet ? palette.success : palette.error }]}>
              {walletPinSet ? 'PIN is active' : 'PIN is not set'}
            </Text>
            {walletPinSet ? (
              <Input
                label='Current PIN'
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder='1234'
                keyboardType='number-pad'
                secureTextEntry
                secureToggle
                error={currentPinError ?? undefined}
                helperText='Enter your existing PIN to change or remove it.'
              />
            ) : null}
            <Input
              label={walletPinSet ? 'New PIN' : 'Set PIN'}
              value={newPin}
              onChangeText={setNewPin}
              placeholder='1234'
              keyboardType='number-pad'
              secureTextEntry
              secureToggle
              error={newPinError ?? undefined}
              helperText='Use 4 to 6 digits.'
            />
            <Input
              label='Confirm PIN'
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder='1234'
              keyboardType='number-pad'
              secureTextEntry
              secureToggle
              error={confirmError ?? undefined}
            />
            <View style={styles.actions}>
              <Button title={mutation.isPending ? 'Saving…' : walletPinSet ? 'Update transfer PIN' : 'Save transfer PIN'} onPress={savePin} loading={mutation.isPending} disabled={!canSave} />
              {walletPinSet ? (
                <Button title={resetMutation.isPending ? 'Removing…' : 'Remove transfer PIN'} variant='danger' onPress={removePin} loading={resetMutation.isPending} disabled={!pinPattern.test(currentPin)} />
              ) : null}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Biometric app lock</Text>
                <Text style={[styles.sectionCopy, { color: palette.textSecondary }]}>Use Face ID or fingerprint to reopen the app after it has been backgrounded.</Text>
                {!walletPinSet ? <Text style={[styles.helperHint, { color: palette.warning }]}>Set a transfer PIN first to enable this.</Text> : null}
              </View>
              <Switch value={appLockEnabled && walletPinSet} onValueChange={(value) => void onToggleAppLock(value)} disabled={!walletPinSet} trackColor={{ false: palette.border, true: palette.primary }} thumbColor='#fff' />
            </View>
          </View>
        </View>
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14, overflow: 'hidden' },
  eyebrow: { color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { color: '#fff', fontSize: 30, lineHeight: 36, fontFamily: Typography.family.bold, letterSpacing: -0.9 },
  subtitle: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  statsRow: { flexDirection: 'row', gap: 12 },
  statChip: { flex: 1, borderRadius: 20, padding: Spacing.md, backgroundColor: 'rgba(255,255,255,0.10)', gap: 4 },
  statLabel: { color: 'rgba(255,255,255,0.60)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  statValue: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.family.bold },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  sectionCopy: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  status: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  actions: { gap: Spacing.sm },
  toggleRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  toggleCopy: { flex: 1, gap: 6 },
  helperHint: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  logoutButton: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
   headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerSpacer: { width: 42 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
   backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.92 },
});
