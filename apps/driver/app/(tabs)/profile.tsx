import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { BadgeCheck, ChevronLeft, ChevronRight, LogOut, Pencil, Shield, ShieldCheck, AlertCircle, MapPin, Bike, Car, Send, Truck } from 'lucide-react-native';

import { Text, View } from '@/components/Themed';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { useLogout } from '@/hooks/useAuth';
import { useDriverProfile } from '@/hooks/useDriverProfile';
import { hexToRgba, useAppPalette, isLight } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';

function initialsFor(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const value = parts.length > 1 ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}` : name.slice(0, 2);
  return value.toUpperCase();
}

function VehicleIcon({ type, color }: { type?: string | null; color: string }) {
  if (type === 'BIKE') return <Bike size={20} color={color} />;
  if (type === 'CAR') return <Car size={20} color={color} />;
  if (type === 'TRICYCLE') return <Send size={20} color={color} />;
  return <Truck size={20} color={color} />;
}

export default function ProfileScreen() {
  const modal = useAppModal();
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const back = useSafeBack('/');
  const user = useDriverStore((state) => state.user);
  const logout = useLogout();
  const profileQuery = useDriverProfile();
  
  const profile = profileQuery.data;
  const displayName = profile?.fullName ?? user?.fullName ?? 'Driver account';
  const phone = profile?.phone ?? user?.phone ?? '00000000';
  
  const initials = useMemo(() => initialsFor(displayName), [displayName]);
  const username = `@${phone.replace(/\D/g, '').slice(-8) || 'driver'}`;
  
  const kycStatus = profile?.kyc?.status ?? 'PENDING';
  const kycRejected = kycStatus === 'REJECTED';
  const verified = profile?.status === 'ACTIVE';

  const signOut = async () => {
    await logout.mutateAsync();
    modal.alert('Signed out', 'You can log back in when your next shift starts.', 'info');
  };

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: palette.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Header Row ── */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => back()} style={[styles.backButton, { borderColor: palette.border }]}>
            <ChevronLeft size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Centered Main Card Container ── */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={[styles.profileCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            
            {/* Avatar Circle */}
            <Pressable
              onPress={() => router.push('/profile/edit')}
              style={({ pressed }) => [styles.avatarWrap, pressed ? { transform: [{ scale: 0.98 }] } : null]}
            >
              <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: palette.card }]}>{initials}</Text>
                )}
              </View>
            </Pressable>

            {/* Identity & KYC Badge Block */}
            <View style={styles.identityBlock}>
              <Text style={[styles.name, { color: palette.text }]}>{displayName}</Text>
              <Text style={[styles.username, { color: palette.textSecondary }]}>{username}</Text>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: verified
                      ? 'rgba(48, 209, 88, 0.16)'
                      : kycRejected
                      ? 'rgba(255, 69, 58, 0.16)'
                      : 'rgba(255, 214, 10, 0.16)',
                  },
                ]}
              >
                <ShieldCheck
                  size={12}
                  color={verified ? palette.success : kycRejected ? palette.error : palette.warning}
                />
                <Text
                  style={[
                    styles.badgeText,
                    { color: verified ? palette.success : kycRejected ? palette.error : palette.warning },
                  ]}
                >
                  {verified ? 'KYC complete' : kycRejected ? 'KYC rejected' : 'KYC required'}
                </Text>
              </View>

              {/* KYC Callout Card */}
              {verified ? (
                <View
                  style={[
                    styles.kycVerifiedCard,
                    { backgroundColor: 'rgba(48, 209, 88, 0.06)', borderColor: palette.success + '30' },
                  ]}
                >
                  <BadgeCheck size={20} color={palette.success} />
                  <View style={styles.kycVerifiedTextWrap}>
                    <Text style={[styles.kycVerifiedTitle, { color: palette.text }]}>Identity & Vehicle Verified</Text>
                    <Text style={[styles.kycVerifiedSubtitle, { color: palette.textSecondary }]}>
                      Your account is active and eligible for order dispatch.
                    </Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => router.push('/(kyc)')}
                  style={[
                    styles.kycCallout,
                    {
                      backgroundColor: lightBg ? 'rgba(255,214,10,0.10)' : 'rgba(255,214,10,0.12)',
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.kycTitle, { color: palette.text }]}>Complete KYC verification</Text>
                  <Text style={[styles.kycSubtitle, { color: palette.textSecondary }]}>
                    Upload your ID, driver license, and vehicle details to go live.
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Vehicle Profile Row */}
            <Pressable
              onPress={() => router.push('/vehicle-verification' as any)}
              style={({ pressed }) => [
                styles.vehicleCard,
                { backgroundColor: lightBg ? 'rgba(10, 132, 255, 0.08)' : 'rgba(10, 132, 255, 0.14)', borderColor: palette.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={[styles.vehicleIcon, { backgroundColor: palette.primary }]}>
                <VehicleIcon type={profile?.vehicleType} color={palette.card} />
              </View>
              <View style={styles.vehicleCopy}>
                <Text style={[styles.vehicleTitle, { color: palette.text }]}>
                  {profile?.vehicleModel || 'Vehicle Details & Verification'}
                </Text>
                <Text style={[styles.vehicleSubtitle, { color: palette.textSecondary }]}>
                  {profile?.vehicleType ? `${profile.vehicleType} • ${profile.vehiclePlate || 'Set plate number'}` : 'Manage & verify vehicle (Bike, Tricycle, Car)'}
                </Text>
              </View>
              <ChevronRight size={18} color={palette.textSecondary} />
            </Pressable>

            {/* Menu Links */}
            <Pressable
              onPress={() => router.push('/profile/edit')}
              style={({ pressed }) => [styles.settingsRow, { borderColor: palette.border }, pressed ? styles.pressed : null]}
            >
              <View style={[styles.settingsIcon, { backgroundColor: palette.text }]}>
                <Pencil size={16} color={palette.card} />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={[styles.settingsTitle, { color: palette.text }]}>Edit Profile</Text>
                <Text style={[styles.settingsSubtitle, { color: palette.textSecondary }]}>Edit driver info & app theme</Text>
              </View>
              <ChevronRight size={18} color={palette.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/profile/security')}
              style={({ pressed }) => [styles.settingsRow, { borderColor: palette.border }, pressed ? styles.pressed : null]}
            >
              <View style={[styles.settingsIcon, { backgroundColor: palette.text }]}>
                <Shield size={16} color={palette.card} />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={[styles.settingsTitle, { color: palette.text }]}>Security</Text>
                <Text style={[styles.settingsSubtitle, { color: palette.textSecondary }]}>Password, PIN & biometrics</Text>
              </View>
              <ChevronRight size={18} color={palette.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/support' as any)}
              style={({ pressed }) => [styles.settingsRow, { borderColor: palette.border }, pressed ? styles.pressed : null]}
            >
              <View style={[styles.settingsIcon, { backgroundColor: palette.primary }]}>
                <ShieldCheck size={16} color="#FFF" />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={[styles.settingsTitle, { color: palette.text }]}>Driver Help & Disputes</Text>
                <Text style={[styles.settingsSubtitle, { color: palette.textSecondary }]}>Earnings issues, trip disputes, or complaints</Text>
              </View>
              <ChevronRight size={18} color={palette.textSecondary} />
            </Pressable>

            <View style={[styles.settingsRow, { borderColor: palette.border }]}>
              <View style={[styles.settingsIcon, { backgroundColor: palette.text }]}>
                <MapPin size={16} color={palette.card} />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={[styles.settingsTitle, { color: palette.text }]}>Performance</Text>
                <Text style={[styles.settingsSubtitle, { color: palette.textSecondary }]}>
                  {profile?.totalDeliveries ?? 0} deliveries • {profile?.rating?.toFixed(1) ?? 'No'} ★ rating
                </Text>
              </View>
            </View>

          </View>
        </View>

        {/* ── Logout Button at bottom ── */}
        <Pressable
          onPress={() => void signOut()}
          disabled={logout.isPending}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && !logout.isPending ? styles.pressed : null,
          ]}
        >
          <LogOut size={18} color={palette.error} />
          <Text style={[styles.logoutText, { color: palette.error }]}>
            {logout.isPending ? 'Logging out…' : 'Log out'}
          </Text>
        </Pressable>

      </ScrollView>
      <AppModal config={modal.config} onClose={modal.hide} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  
  profileCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  avatarWrap: { alignSelf: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontFamily: Typography.family.bold, letterSpacing: -0.4 },
  
  identityBlock: { alignItems: 'center', gap: 8 },
  name: { fontSize: 28, lineHeight: 32, fontFamily: Typography.family.bold, textAlign: 'center', letterSpacing: -0.8 },
  username: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  
  kycCallout: { width: '100%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4, alignItems: 'center' },
  kycTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textAlign: 'center' },
  kycSubtitle: { fontSize: Typography.xs, fontFamily: Typography.family.regular, textAlign: 'center' },
  
  kycVerifiedCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 10, flexDirection: 'row', alignItems: 'center' },
  kycVerifiedTextWrap: { flex: 1, gap: 1 },
  kycVerifiedTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  kycVerifiedSubtitle: { fontSize: Typography.xs, fontFamily: Typography.family.regular },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: Spacing.md, borderWidth: 1 },
  vehicleIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vehicleCopy: { flex: 1, gap: 2 },
  vehicleTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  vehicleSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular },

  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, width: '100%' },
  settingsIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  settingsCopy: { flex: 1, gap: 2 },
  settingsTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  settingsSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, borderWidth: 1, minHeight: 54 },
  logoutText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  pressed: { opacity: 0.92 },
});
