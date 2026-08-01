import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BadgeCheck, ChevronRight, LogOut, Pencil, Truck, Wallet, ShieldCheck, Zap, AlertCircle, MapPin, Bike, Car, Send } from 'lucide-react-native';
import { useMemo } from 'react';

import { Text, View } from '@/components/Themed';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
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
  const modal = useAppModal();
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
    modal.alert('Signed out', 'You can log back in when the next shift starts.', 'info');
  };

  return (
    <>
      <ScrollView 
        style={[styles.screen, { backgroundColor: palette.bg }]}
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push('/profile/edit')} style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
              )}
            </View>
          </Pressable>

          <Text style={[styles.headerTitle, { color: palette.text }]}>Driver Account</Text>

          <Pressable onPress={() => router.push('/profile/edit')} style={[styles.badge, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
            <Pencil size={14} color={palette.text} />
          </Pressable>
        </View>

        <View style={[styles.profileCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.identityBlock}>
            <Text style={[styles.name, { color: palette.text }]}>{displayName}</Text>
            <Text style={[styles.username, { color: palette.textSecondary }]}>{username}</Text>
            
            <View style={[styles.badge, { backgroundColor: verified ? '#30D15822' : (kycRejected ? '#FF453A22' : '#FFD60A22') }]}>
              {verified ? <ShieldCheck size={12} color="#30D158" /> : (kycRejected ? <AlertCircle size={12} color="#FF453A" /> : <ShieldCheck size={12} color="#FFD60A" />)}
              <Text style={[styles.badgeText, { color: verified ? '#30D158' : (kycRejected ? '#FF453A' : '#FFD60A') }]}>
                {verified ? 'ACTIVE DRIVER' : (kycRejected ? 'KYC REJECTED' : 'KYC PENDING')}
              </Text>
            </View>
          </View>

          {/* KYC Banner */}
          {!verified ? (
            <Pressable
              onPress={() => router.push('/(kyc)')}
              style={[
                styles.kycCallout,
                {
                  backgroundColor: kycRejected ? '#FF453A12' : '#FFD60A12',
                  borderColor: kycRejected ? '#FF453A33' : '#FFD60A33',
                },
              ]}
            >
              <Text style={[styles.kycTitle, { color: kycRejected ? '#FF453A' : '#FFD60A' }]}>
                {kycRejected ? 'KYC Verification Failed' : 'Complete Verification'}
              </Text>
              <Text style={[styles.kycSubtitle, { color: palette.textSecondary }]}>
                {kycRejected
                  ? 'Tap to update your documents and try again.'
                  : 'Verify your ID and vehicle to start accepting orders.'}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.kycVerifiedCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <BadgeCheck size={20} color="#30D158" />
              <View style={styles.kycVerifiedTextWrap}>
                <Text style={[styles.kycVerifiedTitle, { color: palette.text }]}>Identity & Vehicle Verified</Text>
                <Text style={[styles.kycVerifiedSubtitle, { color: palette.textSecondary }]}>
                  Your account is active and eligible for order dispatch.
                </Text>
              </View>
            </View>
          )}

          {/* Vehicle info */}
          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={[styles.vehicleCard, { backgroundColor: palette.bg, borderColor: palette.border }]}
          >
            <View style={[styles.vehicleIcon, { backgroundColor: palette.card }]}>
              <VehicleIcon type={profile?.vehicleType} color={palette.primary} />
            </View>
            <View style={styles.vehicleCopy}>
              <Text style={[styles.vehicleTitle, { color: palette.text }]}>
                {profile?.vehicleModel || 'No vehicle model set'}
              </Text>
              <Text style={[styles.vehicleSubtitle, { color: palette.textSecondary }]}>
                {profile?.vehicleType ? `${profile.vehicleType} · Vehicle profile` : 'Tap to add vehicle details'}
              </Text>
            </View>
            {profile?.vehiclePlate ? (
              <View style={styles.vehiclePlateTag}>
                <Text style={styles.vehiclePlateText}>{profile.vehiclePlate}</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Quick links */}
          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={[styles.settingsRow, { borderColor: palette.border }]}
          >
            <View style={[styles.settingsIcon, { backgroundColor: palette.bg }]}>
              <Pencil size={16} color={palette.text} />
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
      <AppModal config={modal.config} onClose={modal.hide} />
    </>
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
