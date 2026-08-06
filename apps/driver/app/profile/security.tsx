import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { ChevronLeft, Lock, ShieldCheck, Fingerprint, EyeOff, KeyRound } from 'lucide-react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { useChangePassword } from '@/hooks/useDriverProfile';
import { usePreferencesStore } from '@/store/preferences.store';
import { useAppPalette } from '@/lib/theme';

export default function DriverSecurityScreen() {
  const modal = useAppModal();
  const palette = useAppPalette();
  const back = useSafeBack('/(tabs)/profile');
  const changePassword = useChangePassword();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Biometrics & Security state
  const walletAccessBiometricEnabled = usePreferencesStore((state) => state.walletAccessBiometricEnabled);
  const confirmTransactionsBiometricEnabled = usePreferencesStore((state) => state.confirmTransactionsBiometricEnabled);
  const appLockEnabled = usePreferencesStore((state) => state.appLockEnabled);
  const allowScreenshots = usePreferencesStore((state) => state.allowScreenshots);

  const setWalletAccessBiometricEnabled = usePreferencesStore((state) => state.setWalletAccessBiometricEnabled);
  const setConfirmTransactionsBiometricEnabled = usePreferencesStore((state) => state.setConfirmTransactionsBiometricEnabled);
  const setAllowScreenshots = usePreferencesStore((state) => state.setAllowScreenshots);

  const canChangePassword = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const savePassword = async () => {
    if (!canChangePassword) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      modal.alert('Password updated', 'Use your new password the next time you sign in.', 'success');
    } catch (error) {
      modal.alert('Could not change password', error instanceof Error ? error.message : 'Please try again.', 'error');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ChevronLeft size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Security Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Protection</Text>

        </View>

        {/* Change Password Card */}
        <Card>
          <View style={styles.sectionHeaderRow}>

            <SectionHeader title="Change password" caption="Authentication" />
          </View>

          <InputField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry />
          <InputField label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry helperText="Use at least 8 characters." />
          <InputField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
            secureTextEntry
            helperText={newPassword && confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match.' : undefined}
          />
          <ActionButton title={changePassword.isPending ? 'Updating…' : 'Update password'} onPress={savePassword} disabled={!canChangePassword || changePassword.isPending} />
        </Card>

        {/* Biometrics & App Lock Card */}
        <Card>
          <View style={styles.sectionHeaderRow}>

            <SectionHeader title="Biometric Security" caption="Face ID & Touch ID" />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>Wallet Biometric Lock</Text>
              <Text style={[styles.toggleSubtitle, { color: palette.textSecondary }]}>Require biometric scan to access payout wallet details.</Text>
            </View>
            <Switch
              value={walletAccessBiometricEnabled}
              onValueChange={(val) => void setWalletAccessBiometricEnabled(val)}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 12 }]}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>Transaction Confirmation</Text>
              <Text style={[styles.toggleSubtitle, { color: palette.textSecondary }]}>Require biometrics before confirming payouts or transfers.</Text>
            </View>
            <Switch
              value={confirmTransactionsBiometricEnabled}
              onValueChange={(val) => void setConfirmTransactionsBiometricEnabled(val)}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Privacy Card */}
        <Card>
          <View style={styles.sectionHeaderRow}>

            <SectionHeader title="Privacy & Screen Capture" caption="Protection" />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>Allow Screenshots</Text>
              <Text style={[styles.toggleSubtitle, { color: palette.textSecondary }]}>Allow screen capture on earnings and wallet screens.</Text>
            </View>
            <Switch
              value={allowScreenshots}
              onValueChange={(val) => void setAllowScreenshots(val)}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>
      </ScrollView>
      <AppModal config={modal.config} onClose={modal.hide} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  toggleCopy: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  toggleSubtitle: { fontSize: Typography.xs, fontFamily: Typography.family.regular, lineHeight: 18 },
});
