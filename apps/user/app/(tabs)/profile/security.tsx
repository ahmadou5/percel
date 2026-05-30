import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { useResetTransferPin, useSetTransferPin, useWallet } from '@/hooks/useWallet';
import { useAuthStore } from '@/store/auth.store';

const pinPattern = /^\d{4,6}$/;

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const mutation = useSetTransferPin();
  const resetMutation = useResetTransferPin();
  const walletQuery = useWallet();
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
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
      Alert.alert('Transfer PIN removed', 'Transfers will no longer require a PIN until you set one again.');
    } catch (error) {
      Alert.alert('Could not remove PIN', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <KeyboardView>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Profile</Text>
          <Text style={styles.title}>{user?.fullName ?? 'Account'}</Text>
          <Text style={styles.subtitle}>{user?.email ?? 'Your account details and wallet security live here.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Contact</Text>
          <Text style={styles.cardValue}>{user?.phone ?? 'Not available'}</Text>
          <Text style={styles.cardMeta}>Keep this updated so transfers and delivery alerts reach the right number.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Wallet security</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Transfer PIN</Text>
          <Text style={styles.cardMeta}>Use a 4 to 6 digit code before you can send money from your wallet.</Text>
          <Text style={[styles.status, walletPinSet ? styles.statusOn : styles.statusOff]}>
            {walletPinSet ? 'PIN is active' : 'PIN is not set'}
          </Text>
          {walletPinSet ? (
            <Input
              label="Current PIN"
              value={currentPin}
              onChangeText={setCurrentPin}
              placeholder="1234"
              keyboardType="number-pad"
              secureTextEntry
              secureToggle
              error={currentPinError ?? undefined}
              helperText="Enter your existing PIN to change or remove it."
            />
          ) : null}
          <Input
            label={walletPinSet ? 'New PIN' : 'Set PIN'}
            value={newPin}
            onChangeText={setNewPin}
            placeholder="1234"
            keyboardType="number-pad"
            secureTextEntry
            secureToggle
            error={newPinError ?? undefined}
            helperText="Use 4 to 6 digits."
          />
          <Input
            label="Confirm PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="1234"
            keyboardType="number-pad"
            secureTextEntry
            secureToggle
            error={confirmError ?? undefined}
          />
          <View style={styles.actions}>
            <Button title={mutation.isPending ? 'Saving…' : walletPinSet ? 'Update transfer PIN' : 'Save transfer PIN'} onPress={savePin} loading={mutation.isPending} disabled={!canSave} />
            {walletPinSet ? (
              <Button title={resetMutation.isPending ? 'Removing…' : 'Remove transfer PIN'} variant="danger" onPress={removePin} loading={resetMutation.isPending} disabled={!pinPattern.test(currentPin)} />
            ) : null}
          </View>
        </View>

        <Button title="Logout" variant="danger" onPress={() => logout.mutate()} loading={logout.isPending} />
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, backgroundColor: Colors.light.bg },
  hero: { gap: Spacing.sm, paddingTop: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 30, lineHeight: 36, fontWeight: Typography.bold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.md, lineHeight: 22 },
  sectionHeader: { marginTop: Spacing.xs },
  sectionTitle: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 22,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.md,
  },
  cardLabel: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  cardValue: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  cardMeta: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
  status: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  statusOn: { color: Colors.light.success },
  statusOff: { color: Colors.light.error },
  actions: { gap: Spacing.sm },
});
