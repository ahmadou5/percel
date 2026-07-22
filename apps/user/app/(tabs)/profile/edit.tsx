import { useEffect, useMemo, useState } from 'react';
import * as Device from 'expo-device';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Camera, ChevronLeft, CircleAlert, ShieldCheck, Sparkles, UserPen } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { KeyboardView } from '@/components/ui/KeyboardView';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  useChangePassword,
  useDeleteAccount,
  useProfile,
  useUpdateAvatar,
  useUpdateProfile,
  useRequestEmailVerification,
  useConfirmEmailVerification,
  useRequestPhoneVerification,
  useConfirmPhoneVerification,
} from '@/hooks/useProfile';
import { useAppPalette } from '@/lib/theme';
import { AppModal, useAppModal } from '@/components/ui/AppModal';

import { usePreferencesStore } from '@/store/preferences.store';

function toFormDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export default function EditProfileScreen() {
  const back = useSafeBack("/profile");
  const palette = useAppPalette();
  const modal = useAppModal()
  const profileQuery = useProfile();
  const profile = profileQuery.data;
  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);

  const [verifyType, setVerifyType] = useState<'EMAIL' | 'PHONE' | null>(null);
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const reqEmailVerify = useRequestEmailVerification();
  const confirmEmailVerify = useConfirmEmailVerification();
  const reqPhoneVerify = useRequestPhoneVerification();
  const confirmPhoneVerify = useConfirmPhoneVerification();

  const handleStartEmailVerify = async () => {
    setVerifyError(null);
    setVerifyOtp('');
    try {
      await reqEmailVerify.mutateAsync();
      setVerifyType('EMAIL');
    } catch (err: any) {
      modal.alert(`Error`, `${err.message || 'Could not send verification code.'}`, 'error')
    }
  };

  const handleStartPhoneVerify = async () => {
    setVerifyError(null);
    setVerifyOtp('');
    try {
      await reqPhoneVerify.mutateAsync();
      setVerifyType('PHONE');
    } catch (err: any) {
      modal.alert(`Error`, `${err.message || 'Could not send verification code.'}`, `error`)
    }
  };

  const handleConfirmVerify = async () => {
    if (verifyOtp.length < 6) return;
    setVerifyError(null);
    try {
      if (verifyType === 'EMAIL') {
        await confirmEmailVerify.mutateAsync(verifyOtp);
      } else {
        await confirmPhoneVerify.mutateAsync(verifyOtp);
      }
      setVerifyType(null);
      modal.alert(`Success`, `${verifyType === 'EMAIL' ? 'Email' : 'Phone number'} verified successfully!`, `success`)

    } catch (err: any) {
      modal.alert(`Error`, `${err.message || 'Verification failed. Please try again.'}`, `error`)
      setVerifyError(err.message || 'Verification failed. Please try again.');
    }
  };

  const allowScreenshots = usePreferencesStore((s) => s.allowScreenshots);

  useEffect(() => {
    if (!Device.isDevice) {
      modal.alert(`Security warning`, `Use a physical device for profile changes when possible.`, `warning`)
    }

    if (!allowScreenshots) {
      void ScreenCapture.preventScreenCaptureAsync();
    } else {
      void ScreenCapture.allowScreenCaptureAsync();
    }
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, [allowScreenshots]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setDateOfBirth(toFormDate(profile.dateOfBirth));
    setAddress(profile.address ?? '');
  }, [profile]);

  const profileChanged = useMemo(() => {
    if (!profile) return false;
    return (
      fullName.trim() !== profile.fullName ||
      dateOfBirth !== toFormDate(profile.dateOfBirth) ||
      address.trim() !== (profile.address ?? '')
    );
  }, [address, dateOfBirth, fullName, profile]);

  const passwordValid = newPassword.length >= 8 && newPassword === confirmPassword && currentPassword.length > 0;

  const saveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth ? dateOfBirth : null,
        address: address.trim() ? address.trim() : null,
      });
      modal.alert(`Profile updated`, `Your changes were saved`, `success`)
      back();
    } catch (error) {
      modal.alert(`Could not update profile`, `${error instanceof Error ? error.message : 'Please try again.'}`, `error`)
    }
  };

  const changeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      modal.alert(`Permission required`, `Allow photo access to change your avatar.`, `info`)
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as never);

    try {
      await updateAvatar.mutateAsync(formData);
      modal.alert(`Avatar updated`, `Your profile photo has been saved.`, `success`);
    } catch (error) {
      modal.alert(`Could not update avatar`, `${error instanceof Error ? error.message : 'Please try again.'}`, `error`);
    }
  };

  const updatePassword = async () => {
    if (!passwordValid) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      modal.alert(`Password changed`, `Use the new password the next time you sign in.`, `success`);
    } catch (error) {
      modal.alert(`Could not change password`, `${error instanceof Error ? error.message : 'Please try again.'}`, `error`);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteAccount.mutateAsync();
    } catch (error) {
      modal.alert(`Could not delete account`, `${error instanceof Error ? error.message : 'Please try again.'}`, `error`);
    }
  };

  return (
    <KeyboardView>
      <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => back()} style={[styles.backButton, { borderColor: palette.border }]}>
            <ChevronLeft size={20} color={palette.text} fill={"none"} />
          </Pressable>

          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Profile</Text>
          <Text style={[styles.title, { color: palette.text }]}>Keep your account details current and secure.</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Your profile drives deliveries, support, and wallet verification. Update it here when anything changes.</Text>
        </View>

        {profileQuery.isLoading ? (
          <StateCard loading title="Loading profile" description="We’re fetching your account details." icon={<Sparkles size={24} color={palette.textSecondary} />} />
        ) : profileQuery.isError ? (
          <StateCard
            title="Could not load profile"
            description="Try again to continue editing your details."
            icon={<CircleAlert size={24} color={palette.textSecondary} />}
            actionLabel="Retry"
            onActionPress={() => void profileQuery.refetch()}
          />
        ) : (
          <>
            <View style={[styles.avatarCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.avatarRow}>
                <Pressable onPress={() => void changeAvatar()} style={({ pressed }) => [styles.avatarWrap, pressed ? styles.pressed : null]}>
                  <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
                    {profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} /> : <Text style={[styles.avatarText, { color: palette.card }]}>{(profile?.fullName ?? 'A').slice(0, 1)}</Text>}
                  </View>
                  <View style={[styles.cameraBadge, { backgroundColor: palette.primary, borderColor: palette.card }]}>
                    <Camera size={12} color={palette.card} />
                  </View>
                </Pressable>
                <View style={styles.avatarCopy}>
                  <Text style={[styles.cardLabel, { color: palette.textSecondary }]}>Profile photo</Text>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{profile?.fullName ?? 'Percel User'}</Text>
                  <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>A clear photo helps support and delivery teams recognize your account.</Text>
                  <Button title={updateAvatar.isPending ? 'Uploading…' : 'Change avatar'} variant="secondary" onPress={changeAvatar} loading={updateAvatar.isPending} />
                </View>
              </View>
            </View>

            <View style={[styles.formCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <UserPen size={18} color={palette.primary} />
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile details</Text>
              </View>
              <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
              <Input label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" helperText="Enter your birth date in ISO format." />
              <Input label="Address" value={address} onChangeText={setAddress} placeholder="Home or pickup address" multiline numberOfLines={3} />
              <Button title={updateProfile.isPending ? 'Saving…' : 'Save changes'} onPress={saveProfile} loading={updateProfile.isPending} disabled={!profileChanged || updateProfile.isPending} />
            </View>

            <View style={[styles.formCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={18} color={palette.primary} />
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Verification Status</Text>
              </View>

              {/* Email Verification Row */}
              <View style={styles.verificationRow}>
                <View style={styles.verificationCopy}>
                  <Text style={[styles.verificationLabel, { color: palette.text }]}>Email Address</Text>
                  <Text style={[styles.verificationValue, { color: palette.textSecondary }]}>{profile?.email}</Text>
                </View>
                {profile?.emailVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <Pressable onPress={handleStartEmailVerify} style={styles.verifyButton}>
                    <Text style={[styles.verifyButtonText, { color: palette.primary }]}>Verify</Text>
                  </Pressable>
                )}
              </View>

              {/* Phone Verification Row */}
              <View style={styles.verificationRow}>
                <View style={styles.verificationCopy}>
                  <Text style={[styles.verificationLabel, { color: palette.text }]}>Phone Number</Text>
                  <Text style={[styles.verificationValue, { color: palette.textSecondary }]}>{profile?.phone}</Text>
                </View>
                {profile?.phoneVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <Pressable onPress={handleStartPhoneVerify} style={styles.verifyButton}>
                    <Text style={[styles.verifyButtonText, { color: palette.primary }]}>Verify</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={[styles.formCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={18} color={palette.primary} />
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Change password</Text>
              </View>
              <Input label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry secureToggle />
              <Input label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry secureToggle helperText="Use at least 8 characters." />
              <Input label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat the new password" secureTextEntry secureToggle error={newPassword && confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match.' : undefined} />
              <Button title={changePassword.isPending ? 'Updating…' : 'Update password'} variant="secondary" onPress={updatePassword} loading={changePassword.isPending} disabled={!passwordValid || changePassword.isPending} />
            </View>

            <Button title={deleteAccount.isPending ? 'Deleting…' : 'Delete account'} variant="danger" onPress={() => setDeleteVisible(true)} loading={deleteAccount.isPending} />
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={deleteVisible}
        title="Delete account"
        description="This will suspend your account and remove your profile details from the app."
        rows={[
          { label: 'Name', value: profile?.fullName ?? 'Unknown' },
          { label: 'Email', value: profile?.email ?? 'Unknown' },
        ]}
        confirmLabel="Delete account"
        loading={deleteAccount.isPending}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={confirmDelete}
      />

      <Modal visible={verifyType !== null} transparent animationType="fade" onRequestClose={() => setVerifyType(null)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Verify Your {verifyType === 'EMAIL' ? 'Email' : 'Phone'}
            </Text>
            <Text style={[styles.modalDescription, { color: palette.textSecondary }]}>
              We sent a 6-digit verification code to your {verifyType === 'EMAIL' ? 'email' : 'phone number'}. Enter it below to verify.
            </Text>
            <Input
              label="Verification Code"
              placeholder="e.g. 123456"
              keyboardType="number-pad"
              maxLength={6}
              value={verifyOtp}
              onChangeText={setVerifyOtp}
            />
            {verifyError ? <Text style={styles.modalError}>{verifyError}</Text> : null}
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                style={styles.modalBtn}
                onPress={() => setVerifyType(null)}
              />
              <Button
                title="Confirm"
                style={styles.modalBtn}
                disabled={verifyOtp.length < 6 || confirmEmailVerify.isPending || confirmPhoneVerify.isPending}
                loading={confirmEmailVerify.isPending || confirmPhoneVerify.isPending}
                onPress={handleConfirmVerify}
              />
            </View>
          </View>
        </View>
      </Modal>
      <AppModal config={modal.config} onClose={modal.hide} />
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  avatarCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg },
  avatarRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  avatarWrap: { alignSelf: 'flex-start' },
  avatar: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 32, fontFamily: Typography.family.bold, letterSpacing: -0.4 },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarCopy: { flex: 1, gap: 8 },
  cardLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  cardTitle: { fontSize: 24, lineHeight: 28, fontFamily: Typography.family.bold },
  cardMeta: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  formCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.92 },
  verificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255, 255, 255, 0.1)', paddingBottom: 12, marginBottom: 4 },
  verificationCopy: { flex: 1, gap: 2 },
  verificationLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  verificationValue: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  verifiedBadge: { backgroundColor: 'rgba(48, 209, 88, 0.16)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  verifiedText: { color: '#30d158', fontSize: 12, fontFamily: Typography.family.bold },
  verifyButton: { backgroundColor: 'rgba(10, 132, 255, 0.12)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  verifyButtonText: { fontSize: 12, fontFamily: Typography.family.bold },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 24, gap: 16 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  modalDescription: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
  modalError: { color: '#ff453a', fontSize: Typography.sm, textAlign: 'center' },
});
