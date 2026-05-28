import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ActionButton, Card, InputField, Pill, Screen, SectionHeader, StatChip } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useLogout } from '@/hooks/useAuth';
import { useChangePassword, useDriverProfile, useUpdateVehicle } from '@/hooks/useDriverProfile';
import { useWallet } from '@/hooks/useWallet';
import { demoWallet } from '@/lib/demo-data';
import { useDriverStore } from '@/store/driver.store';

const vehicleTypes = ['BIKE', 'CAR', 'VAN', 'TRUCK'] as const;

export default function ProfileScreen() {
  const user = useDriverStore((state) => state.user);
  const logout = useLogout();
  const walletQuery = useWallet();
  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;
  const wallet = walletQuery.data ?? demoWallet;
  const updateVehicle = useUpdateVehicle();
  const changePassword = useChangePassword();
  const [vehicleType, setVehicleType] = useState<(typeof vehicleTypes)[number]>('BIKE');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!profile) return;
    setVehicleType(profile.vehicleType);
    setVehiclePlate(profile.vehiclePlate);
    setVehicleModel(profile.vehicleModel);
  }, [profile]);

  const canSaveVehicle = vehiclePlate.trim().length >= 2 && vehicleModel.trim().length >= 2;
  const canChangePassword = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;
  const kycRejected = profile?.kyc.status === 'REJECTED';

  const signOut = async () => {
    await logout.mutateAsync();
    Alert.alert('Signed out', 'You can log back in when the next shift starts.');
  };

  const saveVehicle = async () => {
    if (!canSaveVehicle) return;
    try {
      await updateVehicle.mutateAsync({
        vehicleType,
        vehiclePlate: vehiclePlate.trim(),
        vehicleModel: vehicleModel.trim(),
      });
      Alert.alert('Vehicle updated', 'Your dispatch profile has been updated.');
    } catch (error) {
      Alert.alert('Could not update vehicle', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const savePassword = async () => {
    if (!canChangePassword) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password changed', 'Use your new password the next time you sign in.');
    } catch (error) {
      Alert.alert('Could not change password', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Driver profile</Text>
          <Text style={styles.title}>{profile?.fullName ?? user?.fullName ?? 'Driver account'}</Text>
          <Text style={styles.subtitle}>{profile?.email ?? user?.email ?? 'Account details, vehicle info, and settings live here.'}</Text>
        </View>

        <Card>
          <SectionHeader title="Identity" caption="Profile" />
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(profile?.fullName ?? user?.fullName ?? 'D').slice(0, 1)}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.name}>{profile?.fullName ?? user?.fullName ?? 'Driver'}</Text>
              <Text style={styles.meta}>{profile?.phone ?? user?.phone ?? 'No phone attached'}</Text>
              <Text style={styles.meta}>{profile?.email ?? user?.email ?? 'No email attached'}</Text>
            </View>
          </View>
          <Pill label={profile?.status ?? 'PENDING_KYC'} tone={profile?.status === 'ACTIVE' ? 'success' : 'warning'} />
        </Card>

        <Card>
          <SectionHeader title="Vehicle" caption="Editable" />
          <Text style={styles.value}>{profile?.vehicleType ?? 'BIKE'} · {profile?.vehicleModel ?? 'Bajaj Boxer'}</Text>
          <Text style={styles.meta}>Plate number: {profile?.vehiclePlate ?? 'LAG-482XY'}</Text>
          <Text style={styles.meta}>License: {profile?.licenseNumber ?? 'LIC-004200'}</Text>

          <View style={styles.vehicleTypeRow}>
            {vehicleTypes.map((type) => (
              <Pressable
                key={type}
                onPress={() => setVehicleType(type)}
                style={[styles.vehicleTypePill, vehicleType === type ? styles.vehicleTypeActive : null]}
              >
                <Text style={[styles.vehicleTypeText, vehicleType === type ? styles.vehicleTypeTextActive : null]}>{type}</Text>
              </Pressable>
            ))}
          </View>

          <InputField label="Vehicle plate" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="LAG-482XY" />
          <InputField label="Vehicle model" value={vehicleModel} onChangeText={setVehicleModel} placeholder="Bajaj Boxer" />
          <ActionButton title={updateVehicle.isPending ? 'Saving…' : 'Save vehicle'} onPress={saveVehicle} disabled={!canSaveVehicle || updateVehicle.isPending} />
        </Card>

        <Card>
          <SectionHeader title="Security" caption="Password" />
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
          <ActionButton title={changePassword.isPending ? 'Updating…' : 'Change password'} variant="secondary" onPress={savePassword} disabled={!canChangePassword || changePassword.isPending} />
        </Card>

        <Card>
          <SectionHeader title="KYC status" caption="Verification" />
          <Pill label={profile?.kyc.status ?? 'PENDING'} tone={kycRejected ? 'danger' : profile?.kyc.status === 'APPROVED' ? 'success' : 'warning'} />
          <Text style={styles.meta}>Submitted: {profile?.kyc.submittedAt ?? 'Not submitted yet'}</Text>
          <Text style={styles.meta}>Reviewed: {profile?.kyc.reviewedAt ?? 'Waiting for review'}</Text>
          {kycRejected ? <Text style={styles.warning}>{profile?.kyc.rejectionReason ?? 'Your KYC was rejected. Please resubmit your documents.'}</Text> : null}
          <ActionButton title={kycRejected ? 'Resubmit KYC' : 'Open KYC flow'} variant="ghost" onPress={() => router.push('/(kyc)')} />
        </Card>

        <View style={styles.metricRow}>
          <StatChip label="Deliveries" value={String(profile?.totalDeliveries ?? 128)} />
          <StatChip label="Rating" value={`${profile?.rating?.toFixed(1) ?? '4.9'} ★`} />
        </View>

        <Card>
          <SectionHeader title="Wallet" caption="Summary" />
          <Text style={styles.value}>{wallet.balance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })}</Text>
          <Text style={styles.meta}>{wallet.transactions.length} transaction records linked to this driver account.</Text>
        </Card>

        <ActionButton title={logout.isPending ? 'Signing out…' : 'Logout'} variant="danger" onPress={signOut} disabled={logout.isPending} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 30 },
  hero: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  eyebrow: { color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE68A',
  },
  avatarText: { color: '#061423', fontSize: 24, fontWeight: '800' },
  identityCopy: { flex: 1, gap: 2 },
  name: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  meta: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
  value: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: 12 },
  vehicleTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  vehicleTypeActive: { backgroundColor: '#FDE68A', borderColor: '#FDE68A' },
  vehicleTypeText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  vehicleTypeTextActive: { color: '#061423' },
  warning: { color: '#FDE68A', fontSize: 12, lineHeight: 18 },
});
