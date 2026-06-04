import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useResetTransferPin, useSetTransferPin, useWallet } from '@/hooks/useWallet';
import { useAuthStore } from '@/store/auth.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { describeBiometricTypes, LocalAuthentication } from '@/lib/localAuthentication';
import { useAppPalette } from '@/lib/theme';

const pinPattern = /^\d{4,6}$/;

export default function ProfileSecurityScreen() {
  const back = useSafeBack('/profile');
  const palette = useAppPalette();
  const user = useAuthStore((state) => state.user);
  const mutation = useSetTransferPin();
  const resetMutation = useResetTransferPin();
  const walletQuery = useWallet();
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
  const walletAccessBiometricEnabled = usePreferencesStore((state) => state.walletAccessBiometricEnabled);
  const confirmTransactionsBiometricEnabled = usePreferencesStore((state) => state.confirmTransactionsBiometricEnabled);
  const setWalletAccessBiometricEnabled = usePreferencesStore((state) => state.setWalletAccessBiometricEnabled);
  const setConfirmTransactionsBiometricEnabled = usePreferencesStore((state) => state.setConfirmTransactionsBiometricEnabled);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometricTypeLabel, setBiometricTypeLabel] = useState('Biometrics');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (!cancelled) setBiometricTypeLabel(describeBiometricTypes(types));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      await setWalletAccessBiometricEnabled(false);
      Alert.alert('Transfer PIN removed', 'Transfers will no longer require a PIN until you set one again.');
    } catch (error) {
      Alert.alert('Could not remove PIN', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const ensureBiometricsAvailable = async () => {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;

    if (!hardware) {
      Alert.alert('Biometrics unavailable', 'This device does not have biometric hardware.');
      return false;
    }

    if (!enrolled) {
      Alert.alert('Biometrics not set up', 'Enable Face ID or fingerprint on this device first.');
      return false;
    }

    return true;
  };

  const confirmBiometricEnable = async (promptMessage: string) => {
    const available = await ensureBiometricsAvailable();
    if (!available) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      Alert.alert('Authentication cancelled', 'Biometric authentication is required to enable this setting.');
      return false;
    }

    return true;
  };

  const onToggleWalletAccess = async (next: boolean) => {
    if (next && !walletPinSet) {
      Alert.alert('Set a PIN first', 'Create a transfer PIN above before turning on wallet access protection.');
      return;
    }

    if (next) {
      const allowed = await confirmBiometricEnable('Confirm wallet access biometrics');
      if (!allowed) return;
    }

    await setWalletAccessBiometricEnabled(next);
  };

  const onToggleConfirmTransactions = async (next: boolean) => {
    if (next) {
      const allowed = await confirmBiometricEnable('Confirm transactions with biometrics');
      if (!allowed) return;
    }

    await setConfirmTransactionsBiometricEnabled(next);
  };

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: palette.bg }]}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => back()}>
              <ChevronLeft size={18} color={palette.text} />
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrowLabel, { color: palette.primary }]}>Security</Text>
            <Text style={[styles.pageTitle, { color: palette.text }]}>Manage your transfer PIN and biometric protection.</Text>
          </View>

          <View style={[styles.heroCard, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.12)' }]}>
            <Text style={styles.eyebrow}>{user?.fullName ?? 'Account'} protection</Text>
            <Text style={styles.subtitle}>Set a transfer PIN, then decide how strongly the app should lock and confirm transactions.</Text>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>Transfer PIN</Text>
                <Text style={styles.statValue}>{walletPinSet ? 'Active' : 'Not set'}</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>Biometric type</Text>
                <Text style={styles.statValue}>{biometricTypeLabel}</Text>
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
            <View style={styles.biometricHeader}>
              <View style={styles.biometricHeaderCopy}>
                <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Biometrics</Text>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Enable face or fingerprint auth</Text>
              </View>
              <View style={styles.typeBadge}>
                <View style={[styles.typeDot, { backgroundColor: palette.success }]} />
                <Text style={[styles.typeLabel, { color: palette.text }]}>{biometricTypeLabel}</Text>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Access Wallet</Text>
                <Text style={[styles.sectionCopy, { color: palette.textSecondary }]}>Use biometrics to unlock the wallet when the app opens or returns from background.</Text>
                {!walletPinSet ? <Text style={[styles.helperHint, { color: palette.warning }]}>Set a transfer PIN first to enable this.</Text> : null}
              </View>
              <Switch value={walletAccessBiometricEnabled && walletPinSet} onValueChange={(value) => void onToggleWalletAccess(value)} disabled={!walletPinSet} trackColor={{ false: palette.border, true: palette.primary }} thumbColor='#fff' />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Confirm Transactions</Text>
                <Text style={[styles.sectionCopy, { color: palette.textSecondary }]}>Require biometrics when confirming a transfer or bill payment.</Text>
              </View>
              <Switch value={confirmTransactionsBiometricEnabled} onValueChange={(value) => void onToggleConfirmTransactions(value)} trackColor={{ false: palette.border, true: palette.primary }} thumbColor='#fff' />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { gap: 8 },
  eyebrowLabel: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  pageTitle: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14, overflow: 'hidden' },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: Typography.md, fontFamily: Typography.family.bold },
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
  biometricHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  biometricHeaderCopy: { flex: 1, gap: 4 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(48,209,88,0.12)' },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  toggleRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  toggleCopy: { flex: 1, gap: 6 },
  helperHint: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
});
