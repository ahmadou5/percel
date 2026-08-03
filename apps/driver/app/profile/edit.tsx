import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { Camera, ChevronLeft, ShieldCheck, Truck, Palette as PaletteIcon, Check, Sparkles } from 'lucide-react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { PRESET_THEMES, ThemePresetId } from '@/constants/theme-presets';
import { usePreferencesStore } from '@/store/preferences.store';
import { useDriverStore } from '@/store/driver.store';
import {
  useChangePassword,
  useDriverProfile,
  useUpdateAvatar,
  useUpdateVehicle,
  useRequestEmailVerification,
  useConfirmEmailVerification,
  useRequestPhoneVerification,
  useConfirmPhoneVerification,
} from '@/hooks/useDriverProfile';
import { useAppPalette } from '@/lib/theme';

const vehicleTypes = ['BIKE', 'TRICYCLE', 'CAR'] as const;

export default function EditProfileScreen() {
  const modal = useAppModal();
  const palette = useAppPalette();
  const back = useSafeBack('/profile');
  const user = useDriverStore((state) => state.user);
  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;
  const updateVehicle = useUpdateVehicle();
  const updateAvatar = useUpdateAvatar();
  const changePassword = useChangePassword();
  const activePresetId = usePreferencesStore((state) => state.activePresetId);
  const setThemePreset = usePreferencesStore((state) => state.setThemePreset);
  const [vehicleType, setVehicleType] = useState<(typeof vehicleTypes)[number]>('BIKE');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      modal.alert('Error', err.message || 'Could not send verification code.', 'error');
    }
  };

  const handleStartPhoneVerify = async () => {
    setVerifyError(null);
    setVerifyOtp('');
    try {
      await reqPhoneVerify.mutateAsync();
      setVerifyType('PHONE');
    } catch (err: any) {
      modal.alert('Error', err.message || 'Could not send verification code.', 'error');
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
      setVerifyError(err.message || 'Verification failed. Please try again.');
    }
  };

  useEffect(() => {
    if (!profile) return;
    setVehicleType(profile.vehicleType);
    setVehiclePlate(profile.vehiclePlate);
    setVehicleModel(profile.vehicleModel);
  }, [profile]);

  const vehicleChanged = Boolean(
    profile &&
    (vehicleType !== profile.vehicleType ||
      vehiclePlate.trim() !== profile.vehiclePlate ||
      vehicleModel.trim() !== profile.vehicleModel),
  );
  const canSaveVehicle = vehicleChanged && vehiclePlate.trim().length >= 2 && vehicleModel.trim().length >= 2;
  const canChangePassword = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const saveVehicle = async () => {
    if (!canSaveVehicle) return;
    try {
      await updateVehicle.mutateAsync({
        vehicleType,
        vehiclePlate: vehiclePlate.trim(),
        vehicleModel: vehicleModel.trim(),
      });
      modal.show({
        title: 'Vehicle updated',
        description: 'Your dispatch profile has been updated.',
        type: 'success',
        primaryText: 'OK',
        onPrimaryPress: () => {
          modal.hide();
          back();
        },
      });
    } catch (error) {
      modal.alert('Could not update vehicle', error instanceof Error ? error.message : 'Please try again.', 'error');
    }
  };

  const changeAvatar = async () => {
    let ImagePickerModule;
    try {
      ImagePickerModule = require('expo-image-picker');
    } catch (e) {
      modal.alert(
        'Feature Unavailable',
        'The image picker native module is not installed in this development build. Please run a new EAS development build to update the app.',
        'warning'
      );
      return;
    }

    try {
      const permission = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        modal.alert('Permission required', 'Allow photo access to change your avatar.', 'warning');
        return;
      }

      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ImagePickerModule.MediaTypeOptions.Images,
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

      await updateAvatar.mutateAsync(formData);
      modal.alert('Avatar updated', 'Your profile photo has been saved.', 'success');
    } catch (error) {
      modal.alert('Could not update avatar', error instanceof Error ? error.message : 'Please try again.', 'error');
    }
  };

  const savePassword = async () => {
    if (!canChangePassword) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      modal.alert('Password changed', 'Use your new password the next time you sign in.', 'success');
    } catch (error) {
      modal.alert('Could not change password', error instanceof Error ? error.message : 'Please try again.', 'error');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => back()} style={[styles.backButton, { borderColor: palette.border }]}>
            <ChevronLeft size={20} color={palette.text} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Profile</Text>
          <Text style={[styles.title, { color: palette.text }]}>Keep your driver details ready for dispatch.</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Update vehicle information and account security before your next shift.</Text>
        </View>

        <Card>
          <View style={styles.avatarRow}>
            <Pressable onPress={() => void changeAvatar()} style={({ pressed }) => [styles.avatarWrap, pressed ? styles.pressed : null]}>
              <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: palette.card }]}>{(profile?.fullName ?? 'D').slice(0, 1)}</Text>
                )}
              </View>
              <View style={[styles.cameraBadge, { backgroundColor: palette.primary, borderColor: palette.card }]}>
                <Camera size={12} color={palette.card} />
              </View>
            </Pressable>
            <View style={styles.avatarCopy}>
              <Text style={[styles.cardLabel, { color: palette.textSecondary }]}>Profile photo</Text>
              <Text style={[styles.cardTitle, { color: palette.text }]}>{profile?.fullName ?? 'Driver account'}</Text>
              <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>A clear photo helps support and dispatch teams recognize your account.</Text>
              <ActionButton title={updateAvatar.isPending ? 'Uploading...' : 'Change avatar'} variant="secondary" onPress={changeAvatar} disabled={updateAvatar.isPending} />
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeaderRow}>
            <Truck size={18} color={palette.primary} />
            <SectionHeader title="Vehicle details" caption="Editable" />
          </View>

          <View style={styles.vehicleTypeRow}>
            {vehicleTypes.map((type) => (
              <Pressable
                key={type}
                onPress={() => setVehicleType(type)}
                style={[
                  styles.vehicleTypePill,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  vehicleType === type ? { backgroundColor: palette.primary, borderColor: palette.primary } : null,
                ]}
              >
                <Text style={[styles.vehicleTypeText, { color: palette.textSecondary }, vehicleType === type ? { color: palette.card } : null]}>{type}</Text>
              </Pressable>
            ))}
          </View>

          <InputField label="Vehicle plate" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="LAG-482XY" />
          <InputField label="Vehicle model" value={vehicleModel} onChangeText={setVehicleModel} placeholder="Bajaj Boxer" />
          <ActionButton title={updateVehicle.isPending ? 'Saving…' : 'Save vehicle'} onPress={saveVehicle} disabled={!canSaveVehicle || updateVehicle.isPending} />
        </Card>

        <Card>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color={palette.primary} />
            <SectionHeader title="Verification Status" caption="Identity" />
          </View>

          {/* Email Verification Row */}
          <View style={styles.verificationRow}>
            <View style={styles.verificationCopy}>
              <Text style={styles.verificationLabel}>Email Address</Text>
              <Text style={[styles.verificationValue, { color: palette.textSecondary }]}>{profile?.email ?? user?.email}</Text>
            </View>
            {user?.emailVerified || profile?.emailVerified || profile?.kyc?.status === 'APPROVED' ? (
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
              <Text style={styles.verificationLabel}>Phone Number</Text>
              <Text style={[styles.verificationValue, { color: palette.textSecondary }]}>{profile?.phone ?? user?.phone}</Text>
            </View>
            {user?.phoneVerified || profile?.phoneVerified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <Pressable onPress={handleStartPhoneVerify} style={styles.verifyButton}>
                <Text style={[styles.verifyButtonText, { color: palette.primary }]}>Verify</Text>
              </Pressable>
            )}
          </View>
        </Card>

        {/* Premium Theme & Dynamic App Icon Switcher Card */}
        <Card>
          <View style={styles.sectionHeaderRow}>
            <PaletteIcon size={18} color={palette.primary} />
            <SectionHeader title="App Icon & Theme Accent" caption="Premium Feature" />
          </View>

          <Text style={[styles.cardMeta, { color: palette.textSecondary }]}>
            Selecting a theme preset instantly changes your UI color palette and syncs your home screen launcher app icon to match.
          </Text>

          <View style={styles.presetGrid}>
            {(Object.keys(PRESET_THEMES) as ThemePresetId[]).map((presetId) => {
              const preset = PRESET_THEMES[presetId];
              const isSelected = activePresetId === presetId;

              return (
                <Pressable
                  key={presetId}
                  onPress={() => void setThemePreset(presetId)}
                  style={({ pressed }) => [
                    styles.presetCard,
                    { backgroundColor: preset.bg, borderColor: isSelected ? preset.primary : palette.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.presetHeader}>
                    {/* Simulated App Icon Badge */}
                    <View style={[styles.appIconBadge, { backgroundColor: preset.primary }]}>
                      <Sparkles size={14} color="#FFFFFF" />
                    </View>
                    {isSelected && (
                      <View style={[styles.selectedCheck, { backgroundColor: preset.primary }]}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>

                  <Text style={[styles.presetName, { color: preset.text }]}>{preset.name}</Text>
                  <View style={styles.swatchRow}>
                    <View style={[styles.swatch, { backgroundColor: preset.primary }]} />
                    <View style={[styles.swatch, { backgroundColor: preset.card }]} />
                    <View style={[styles.swatch, { backgroundColor: preset.border }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color={palette.primary} />
            <SectionHeader title="Change password" caption="Security" />
          </View>
          <InputField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry />
          <InputField label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry helperText="Use at least 8 characters." />
          <InputField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat the new password"
            secureTextEntry
            helperText={newPassword && confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match.' : undefined}
          />
          <ActionButton title={changePassword.isPending ? 'Updating…' : 'Update password'} variant="secondary" onPress={savePassword} disabled={!canChangePassword || changePassword.isPending} />
        </Card>
      </ScrollView>

      <Modal visible={verifyType !== null} transparent animationType="fade" onRequestClose={() => setVerifyType(null)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
            <Text style={styles.modalTitle}>
              Verify Your {verifyType === 'EMAIL' ? 'Email' : 'Phone'}
            </Text>
            <Text style={[styles.modalDescription, { color: palette.textSecondary }]}>
              We sent a 6-digit verification code to your {verifyType === 'EMAIL' ? 'email' : 'phone number'}. Enter it below to verify.
            </Text>
            <InputField
              label="Verification Code"
              placeholder="e.g. 123456"
              keyboardType="number-pad"

              value={verifyOtp}
              onChangeText={setVerifyOtp}
            />
            {verifyError ? <Text style={styles.modalError}>{verifyError}</Text> : null}
            <View style={styles.modalActions}>
              <ActionButton
                title="Cancel"
                variant="secondary"

                onPress={() => setVerifyType(null)}
              />
              <ActionButton
                title="Confirm"

                disabled={verifyOtp.length < 6 || confirmEmailVerify.isPending || confirmPhoneVerify.isPending}
                onPress={handleConfirmVerify}
              />
            </View>
          </View>
        </View>
      </Modal>
      <AppModal config={modal.config} onClose={modal.hide} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: 0 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  avatarRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  avatarWrap: { alignSelf: 'flex-start' },
  avatar: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 32, fontFamily: Typography.family.bold, letterSpacing: 0 },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarCopy: { flex: 1, gap: 8 },
  cardLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0, fontFamily: Typography.family.bold },
  cardTitle: { fontSize: 24, lineHeight: 28, fontFamily: Typography.family.bold },
  cardMeta: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleTypePill: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  vehicleTypeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold, letterSpacing: 0 },
  pressed: { opacity: 0.92 },
  verificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255, 255, 255, 0.1)', paddingBottom: 12, marginBottom: 4, marginTop: 8 },
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
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  presetCard: { width: '48%', borderRadius: 16, borderWidth: 2, padding: 14, gap: 10 },
  presetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appIconBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  selectedCheck: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  presetName: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  swatchRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  swatch: { width: 14, height: 14, borderRadius: 7 },
});
