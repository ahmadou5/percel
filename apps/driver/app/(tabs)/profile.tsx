import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BadgeCheck, ChevronRight, LogOut, Pencil, Truck, Wallet, ShieldCheck, Zap, AlertCircle, MapPin, Bike, Car, Send } from 'lucide-react-native';
import { useMemo } from 'react';

import { Text, View } from '@/components/Themed';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { useDriverProfile } from '@/hooks/useDriverProfile';
import { useWallet } from '@/hooks/useWallet';
import { hexToRgba, useAppPalette, isLight } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';

function initialsFor(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const value = parts.length > 1 ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}` : name.slice(0, 2);
  return value.toUpperCase();
}

function VehicleIcon({ type, color }: { type?: string | null; color: string }) {
  if (type === 'BIKE') return <Bike size={24} color={color} />;
  if (type === 'CAR') return <Car size={24} color={color} />;
  if (type === 'TRICYCLE') return <Send size={24} color={color} />; // Send looks like a delta/tricycle roughly, or Truck
  return <Truck size={24} color={color} />;
}

export default function ProfileScreen() {
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const user = useDriverStore((state) => state.user);
  const logout = useLogout();
  const walletQuery = useWallet();
  const profileQuery = useDriverProfile();
  
  const profile = profileQuery.data;
  const wallet = walletQuery.data;
  const displayName = profile?.fullName ?? user?.fullName ?? 'Driver account';
  const email = profile?.email ?? user?.email ?? 'No email attached';
  const phone = profile?.phone ?? user?.phone ?? 'No phone attached';
  
  const initials = useMemo(() => initialsFor(displayName), [displayName]);
  const username = `@${phone.replace(/\D/g, "").slice(-8) || "driver"}`;
  
  const kycStatus = profile?.kyc.status ?? 'PENDING';
  const kycRejected = kycStatus === 'REJECTED';
  const verified = profile?.status === 'ACTIVE';

  const signOut = async () => {
    await logout.mutateAsync();
    Alert.alert('Signed out', 'You can log back in when the next shift starts.');
  };

  return (
    <ScrollView 
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.headerTitle, { color: palette.text }]}>Driver Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.profileCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Pressable style={({ pressed }) => [styles.avatarWrap, pressed ? { transform: [{ scale: 0.98 }] } : null]}>
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: palette.card }]}>{initials}</Text>
            )}
          </View>
        </Pressable>

        <View style={styles.identityBlock}>
          <Text style={[styles.name, { color: palette.text }]}>{displayName}</Text>
          <Text style={[styles.username, { color: palette.textSecondary }]}>{username}  ·  {email}</Text>
          
          <View style={[styles.badge, { backgroundColor: verified ? 'rgba(48, 209, 88, 0.16)' : (kycRejected ? 'rgba(255, 69, 58, 0.16)' : 'rgba(255, 214, 10, 0.16)') }]}>
            {verified ? <ShieldCheck size={12} color="#30D158" /> : (kycRejected ? <AlertCircle size={12} color="#FF453A" /> : <ShieldCheck size={12} color="#FFD60A" />)}
            <Text style={[styles.badgeText, { color: verified ? '#30D158' : (kycRejected ? '#FF453A' : '#FFD60A') }]}>
              {verified ? 'Driver Active' : (kycRejected ? 'KYC Rejected' : 'KYC Pending')}
            </Text>
          </View>
          
          {verified ? (
            <View style={[styles.kycVerifiedCard, { backgroundColor: 'rgba(48,209,88,0.06)', borderColor: hexToRgba('#30D158', 0.3) }]}>
              <View style={styles.kycVerifiedTextWrap}>
                <Text style={[styles.kycVerifiedTitle, { color: palette.text }]}>Identity Verified</Text>
                <Text style={[styles.kycVerifiedSubtitle, { color: palette.textSecondary }]}>Your background check is complete and wallet is active.</Text>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => router.push('/(kyc)')} style={[styles.kycCallout, { backgroundColor: lightBg ? 'rgba(255,214,10,0.10)' : 'rgba(255,214,10,0.12)', borderColor: palette.border }]}>
              <Text style={[styles.kycTitle, { color: palette.text }]}>
                {kycRejected ? 'Action Required: Resubmit KYC' : 'Complete KYC to start earning'}
              </Text>
              <Text style={[styles.kycSubtitle, { color: palette.textSecondary }]}>
                {kycRejected ? profile?.kyc.rejectionReason : 'Submit your driver license, BVN, and vehicle papers.'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Vehicle Identity ── */}
        <View style={[styles.vehicleCard, { backgroundColor: lightBg ? 'rgba(10, 132, 255, 0.08)' : 'rgba(10, 132, 255, 0.14)', borderColor: palette.border }]}>
          <View style={[styles.vehicleIcon, { backgroundColor: palette.primary }]}>
            <VehicleIcon type={profile?.vehicleType} color={palette.card} />
          </View>
          <View style={styles.vehicleCopy}>
            <Text style={[styles.vehicleTitle, { color: palette.text }]}>
              {profile?.vehicleType ? profile.vehicleType.charAt(0).toUpperCase() + profile.vehicleType.slice(1).toLowerCase() : 'Vehicle Setup'}
            </Text>
            <Text style={[styles.vehicleSubtitle, { color: palette.textSecondary }]}>
              {profile?.vehicleModel ?? 'No vehicle model specified'}
            </Text>
          </View>
          <View style={styles.vehiclePlateTag}>
            <Text style={styles.vehiclePlateText}>{profile?.vehiclePlate ?? 'NO PLATE'}</Text>
          </View>
        </View>

        <Pressable onPress={() => router.push('/profile/edit' as never)} style={({ pressed }) => [styles.settingsRow, { borderColor: palette.border }, pressed ? styles.pressed : null]}>
          <View style={[styles.settingsIcon, { backgroundColor: palette.text }]}>
            <Pencil size={16} color={palette.card} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={[styles.settingsTitle, { color: palette.text }]}>Edit Profile</Text>
            <Text style={[styles.settingsSubtitle, { color: palette.textSecondary }]}>Edit your driver information</Text>
          </View>
          <ChevronRight size={18} color={palette.textSecondary} />
        </Pressable>

        <View style={[styles.settingsRow, { borderColor: palette.border, borderTopWidth: 0 }]}>
          <View style={[styles.settingsIcon, { backgroundColor: palette.text }]}>
            <MapPin size={16} color={palette.card} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={[styles.settingsTitle, { color: palette.text }]}>Performance</Text>
            <Text style={[styles.settingsSubtitle, { color: palette.textSecondary }]}>
              {profile?.totalDeliveries} deliveries · {profile?.rating?.toFixed(1) ?? 'No'} ★ rating
            </Text>
          </View>
        </View>
      </View>

      {/* ── Logout ── */}
      <Pressable
        onPress={signOut}
        disabled={logout.isPending}
        style={({ pressed }) => [
          styles.logoutRow,
          { backgroundColor: hexToRgba(palette.error, 0.12), borderColor: hexToRgba(palette.error, 0.24) },
          pressed && !logout.isPending ? styles.pressed : null,
          logout.isPending ? styles.disabled : null,
        ]}
      >
        <LogOut size={18} color={palette.error} />
        <Text style={[styles.logoutText, { color: palette.error }]}>{logout.isPending ? 'Signing out…' : 'Logout'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold' },
  
  profileCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  avatarWrap: { alignSelf: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4 },
  
  identityBlock: { alignItems: 'center', gap: 8 },
  name: { fontSize: 28, lineHeight: 32, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', letterSpacing: -0.8 },
  username: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_700Bold' },
  
  kycCallout: { width: '100%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4, alignItems: 'center' },
  kycTitle: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  kycSubtitle: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },
  
  kycVerifiedCard: { width: '90%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 10, flexDirection: 'row', alignItems: 'center' },
  kycVerifiedTextWrap: { flex: 1, gap: 1 },
  kycVerifiedTitle: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  kycVerifiedSubtitle: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: Spacing.md, borderWidth: 1 },
  vehicleIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vehicleCopy: { flex: 1, gap: 2 },
  vehicleTitle: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  vehicleSubtitle: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular' },
  vehiclePlateTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB' },
  vehiclePlateText: { color: '#111827', fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },

  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, width: '100%' },
  settingsIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  settingsCopy: { flex: 1, gap: 2 },
  settingsTitle: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  settingsSubtitle: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular' },
  
  logoutRow: { minHeight: 54, borderRadius: 20, borderWidth: 1, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
