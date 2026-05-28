import { useEffect, useMemo, useState } from 'react';
import * as Device from 'expo-device';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/wallet/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useChangePassword, useDeleteAccount, useProfile, useUpdateAvatar, useUpdateProfile } from '@/hooks/useProfile';

function toFormDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export default function EditProfileScreen() {
  const router = useRouter();
  const profileQuery = useProfile();
  const profile = profileQuery.data;
  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();

  useEffect(() => {
    if (!Device.isDevice) {
      Alert.alert('Security warning', 'Use a physical device for profile changes when possible.');
    }

    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);

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
      Alert.alert('Profile updated', 'Your changes were saved.');
      router.back();
    } catch (error) {
      Alert.alert('Could not update profile', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const changeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to change your avatar.');
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
      Alert.alert('Avatar updated', 'Your profile photo has been saved.');
    } catch (error) {
      Alert.alert('Could not update avatar', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const updatePassword = async () => {
    if (!passwordValid) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password changed', 'Use the new password the next time you sign in.');
    } catch (error) {
      Alert.alert('Could not change password', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteAccount.mutateAsync();
    } catch (error) {
      Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <KeyboardView>
      <View style={styles.content}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Edit profile</Text>
          <Text style={styles.title}>Personal details</Text>
          <Text style={styles.subtitle}>Keep your name, avatar, birth date, and address current for smoother deliveries.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} /> : <Text style={styles.avatarText}>{(profile?.fullName ?? 'A').slice(0, 1)}</Text>}
            </View>
            <View style={styles.avatarCopy}>
              <Text style={styles.cardLabel}>Profile photo</Text>
              <Text style={styles.cardMeta}>A clear photo helps support and delivery teams recognize your account.</Text>
              <Button title={updateAvatar.isPending ? 'Uploading…' : 'Change avatar'} variant="secondary" onPress={changeAvatar} loading={updateAvatar.isPending} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Profile details</Text>
          <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
          <Input label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" helperText="Enter your birth date in ISO format." />
          <Input label="Address" value={address} onChangeText={setAddress} placeholder="Home or pickup address" multiline numberOfLines={3} />
          <Button title={updateProfile.isPending ? 'Saving…' : 'Save changes'} onPress={saveProfile} loading={updateProfile.isPending} disabled={!profileChanged || updateProfile.isPending} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Change password</Text>
          <Input label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry secureToggle />
          <Input label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry secureToggle helperText="Use at least 8 characters." />
          <Input label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat the new password" secureTextEntry secureToggle error={newPassword && confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match.' : undefined} />
          <Button title={changePassword.isPending ? 'Updating…' : 'Update password'} variant="secondary" onPress={updatePassword} loading={changePassword.isPending} disabled={!passwordValid || changePassword.isPending} />
        </View>

        <Button title={deleteAccount.isPending ? 'Deleting…' : 'Delete account'} variant="danger" onPress={() => setDeleteVisible(true)} loading={deleteAccount.isPending} />
      </View>

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
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Spacing.lg, gap: Spacing.lg, backgroundColor: Colors.light.bg, paddingBottom: Spacing.xl * 2 },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  backText: { color: Colors.light.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 30, lineHeight: 36, fontWeight: Typography.bold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.md, lineHeight: 22 },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.md,
  },
  cardLabel: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  cardMeta: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
  avatarRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.light.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: Typography.bold },
  avatarCopy: { flex: 1, gap: Spacing.xs },
});
