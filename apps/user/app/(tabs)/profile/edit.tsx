import { useEffect, useMemo, useState } from 'react';
import * as Device from 'expo-device';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Camera, CheckCircle2, ChevronLeft, CircleAlert, Mail, Phone, ShieldCheck, Sparkles, UserPen } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { StateCard } from '@/components/ui/StateCard';
import { FormSkeleton } from '@/components/ui/Skeleton';
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
import { DobDatePickerModal } from '@/components/ui/DobDatePickerModal';
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
  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);

  const [verifyType, setVerifyType] = useState<'EMAIL' | 'PHONE' | null>(null);
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);

  const reqEmailVerify = useRequestEmailVerification();
  const confirmEmailVerify = useConfirmEmailVerification();
  const reqPhoneVerify = useRequestPhoneVerification();
  const confirmPhoneVerify = useConfirmPhoneVerification();

  useEffect(() => {
    if (verifyType === null) return;
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [verifyType]);

  const handleStartEmailVerify = async () => {
    setVerifyError(null);
    setVerifyOtp('');
    try {
      await reqEmailVerify.mutateAsync();
      setVerifyType('EMAIL');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not send verification code.';
      modal.alert('Error', msg, 'error');
    }
  };

  const handleStartPhoneVerify = async () => {
    setVerifyError(null);
    setVerifyOtp('');
    try {
      await reqPhoneVerify.mutateAsync();
      setVerifyType('PHONE');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not send verification code.';
      modal.alert('Error', msg, 'error');
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
      modal.alert('Success', `${verifyType === 'EMAIL' ? 'Email' : 'Phone number'} verified successfully!`, 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Verification failed. Please try again.';
      setVerifyError(msg);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setVerifyError(null);
    setVerifyOtp('');
    try {
      if (verifyType === 'EMAIL') {
        await reqEmailVerify.mutateAsync();
      } else if (verifyType === 'PHONE') {
        await reqPhoneVerify.mutateAsync();
      }
      setResendTimer(30);
      modal.alert('Code Sent', `A new verification code was sent to your ${verifyType === 'EMAIL' ? 'email' : 'phone number'}.`, 'success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not resend verification code.';
      setVerifyError(msg);
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
      mediaTypes: ['images'],
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
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Edit Profile</Text>

        </View>

        {profileQuery.isLoading ? (
          <FormSkeleton count={4} />
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

                </View>
              </View>
            </View>

            <View style={[styles.formCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <UserPen size={18} color={palette.primary} />
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile details</Text>
              </View>
              <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
              <DobDatePickerModal visible={dobModalVisible} onClose={() => setDobModalVisible(false)} onSelect={(date) => { setDateOfBirth(date); setDobModalVisible(false); }} />
              <Pressable onPress={() => setDobModalVisible(true)}>
                <View pointerEvents="none">
                  <Input label="Date of birth" value={dateOfBirth} placeholder="YYYY-MM-DD" helperText="Enter your birth date in ISO format." />
                </View>
              </Pressable>
              <Input label="Address" value={address} onChangeText={setAddress} placeholder="Home or pickup address" multiline numberOfLines={3} />
              <Button title={updateProfile.isPending ? 'Saving…' : 'Save changes'} onPress={saveProfile} loading={updateProfile.isPending} disabled={!profileChanged || updateProfile.isPending} />
            </View>

            {/* Verification Status Card */}
            <View style={[styles.formCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={18} color={palette.primary} />
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Verification Status</Text>
              </View>

              {/* Email Verification Row */}
              <View style={styles.verificationRow}>
                <View style={styles.verificationCopy}>
                  <Text style={[styles.verificationLabel, { color: palette.text }]}>Email Address</Text>
                  <Text style={[styles.verificationValue, { color: palette.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{profile?.email}</Text>
                </View>
                {profile?.emailVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleStartEmailVerify}
                    disabled={reqEmailVerify.isPending}
                    style={({ pressed }) => [
                      styles.verifyButton,
                      (pressed || reqEmailVerify.isPending) ? styles.pressed : null,
                    ]}
                  >
                    <Text style={[styles.verifyButtonText, { color: palette.primary }]}>
                      {reqEmailVerify.isPending ? 'Sending…' : 'Verify'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Phone Verification Row */}
              <View style={[styles.verificationRow, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
                <View style={styles.verificationCopy}>
                  <Text style={[styles.verificationLabel, { color: palette.text }]}>Phone Number</Text>
                  <Text style={[styles.verificationValue, { color: palette.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{profile?.phone}</Text>
                </View>
                {profile?.phoneVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleStartPhoneVerify}
                    disabled={reqPhoneVerify.isPending}
                    style={({ pressed }) => [
                      styles.verifyButton,
                      (pressed || reqPhoneVerify.isPending) ? styles.pressed : null,
                    ]}
                  >
                    <Text style={[styles.verifyButtonText, { color: palette.primary }]}>
                      {reqPhoneVerify.isPending ? 'Sending…' : 'Verify'}
                    </Text>
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
              Verify Your {verifyType === 'EMAIL' ? 'Email Address' : 'Phone Number'}
            </Text>
            <Text style={[styles.modalDescription, { color: palette.textSecondary }]}>
              Enter the 6-digit code sent to{' '}
              <Text style={{ fontFamily: Typography.family.bold, color: palette.text }}>
                {verifyType === 'EMAIL' ? profile?.email : profile?.phone}
              </Text>
            </Text>

            <PinInput
              length={6}
              secureTextEntry={false}
              value={verifyOtp}
              onChangeText={(val) => {
                setVerifyOtp(val);
                if (verifyError) setVerifyError(null);
              }}
              error={verifyError ?? undefined}
            />

            <Pressable
              onPress={() => void handleResendCode()}
              disabled={resendTimer > 0 || reqEmailVerify.isPending || reqPhoneVerify.isPending}
              style={{ alignSelf: 'center', paddingVertical: 6 }}
            >
              <Text
                style={{
                  color: resendTimer > 0 ? palette.textSecondary : palette.primary,
                  fontSize: Typography.sm,
                  fontFamily: Typography.family.bold,
                }}
              >
                {reqEmailVerify.isPending || reqPhoneVerify.isPending
                  ? 'Sending new code…'
                  : resendTimer > 0
                  ? `Resend code in ${resendTimer}s`
                  : "Didn't get code? Resend"}
              </Text>
            </Pressable>

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
  verificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255, 255, 255, 0.1)', paddingBottom: 12, marginBottom: 4 },
  verificationCopy: { flex: 1, gap: 2, overflow: 'hidden' },
  verificationLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  verificationValue: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  verifiedBadge: { backgroundColor: 'rgba(48, 209, 88, 0.16)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexShrink: 0 },
  verifiedText: { color: '#30d158', fontSize: 12, fontFamily: Typography.family.bold },
  verifyButton: { backgroundColor: 'rgba(10, 132, 255, 0.12)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexShrink: 0, minWidth: 68, alignItems: 'center' },
  verifyButtonText: { fontSize: 12, fontFamily: Typography.family.bold },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  modalContent: { width: '88%', maxWidth: 336, borderRadius: 24, padding: Spacing.lg, gap: 16, alignSelf: 'center' },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  modalDescription: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  modalBtn: { flex: 1 },
  modalError: { color: '#ff453a', fontSize: Typography.sm, textAlign: 'center' },
});
