import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BadgeCheck, ChevronRight, LogOut, Pencil, Truck, Wallet } from 'lucide-react-native';

import { ActionButton, Card, Pill, Screen, SectionHeader, StatChip } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { useDriverProfile } from '@/hooks/useDriverProfile';
import { useWallet } from '@/hooks/useWallet';
import { hexToRgba, useAppPalette } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';

function initialsFor(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const value = parts.length > 1 ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}` : name.slice(0, 2);
  return value.toUpperCase();
}

export default function ProfileScreen() {
  const palette = useAppPalette();
  const user = useDriverStore((state) => state.user);
  const logout = useLogout();
  const walletQuery = useWallet();
  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;
  const wallet = walletQuery.data;
  const displayName = profile?.fullName ?? user?.fullName ?? 'Driver account';
  const email = profile?.email ?? user?.email ?? 'No email attached';
  const phone = profile?.phone ?? user?.phone ?? 'No phone attached';
  const kycStatus = profile?.kyc.status ?? 'PENDING';
  const kycRejected = kycStatus === 'REJECTED';

  const signOut = async () => {
    await logout.mutateAsync();
    Alert.alert('Signed out', 'You can log back in when the next shift starts.');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: palette.card }]}>{initialsFor(displayName)}</Text>
              )}
            </View>
          </View>

          <View style={styles.identityBlock}>
            <Text style={[styles.name, { color: palette.text }]}>{displayName}</Text>
            <Text style={[styles.username, { color: palette.textSecondary }]}>@{phone.replace(/\D/g, "").slice(-8) || "driver"}</Text>
            <Text style={[styles.meta, { color: palette.textSecondary }]}>{email}</Text>
          </View>

          <View style={styles.badgeRow}>
            <Pill label={profile?.status ?? 'PENDING_KYC'} tone={profile?.status === 'ACTIVE' ? 'success' : 'warning'} />
            <Pill label={kycStatus} tone={kycRejected ? 'danger' : kycStatus === 'APPROVED' ? 'success' : 'warning'} />
          </View>

          <Pressable
            onPress={() => router.push('/profile/edit' as never)}
            style={({ pressed }) => [
              styles.editRow,
              { backgroundColor: hexToRgba(palette.primary, 0.1), borderColor: palette.border },
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={[styles.editIcon, { backgroundColor: palette.primary }]}>
              <Pencil size={16} color={palette.card} />
            </View>
            <View style={styles.editCopy}>
              <Text style={[styles.editTitle, { color: palette.text }]}>Edit profile</Text>
              <Text style={[styles.editSubtitle, { color: palette.textSecondary }]}>Edit your profile information</Text>
            </View>
            <ChevronRight size={18} color={palette.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.metricRow}>
          <StatChip label="Deliveries" value={profile ? String(profile.totalDeliveries) : '---'} />
          <StatChip label="Rating" value={profile?.rating != null ? `${profile.rating.toFixed(1)} ★` : '---'} />
        </View>

        <Card>
          <SectionHeader title="Vehicle" caption="Dispatch" />
          <View style={styles.infoRow}>
            <Truck size={18} color={palette.primary} />
            <View style={styles.infoCopy}>
              <Text style={[styles.value, { color: palette.text }]}>{profile?.vehicleType ?? 'Vehicle'} · {profile?.vehicleModel ?? 'Not set'}</Text>
              <Text style={[styles.meta, { color: palette.textSecondary }]}>Plate number: {profile?.vehiclePlate ?? 'Not set'}</Text>
              <Text style={[styles.meta, { color: palette.textSecondary }]}>License: {profile?.licenseNumber ?? 'Not set'}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title="Verification" caption="KYC" />
          <View style={styles.infoRow}>
            <BadgeCheck size={18} color={kycRejected ? palette.error : palette.primary} />
            <View style={styles.infoCopy}>
              <Text style={[styles.value, { color: palette.text }]}>{kycStatus}</Text>
              <Text style={[styles.meta, { color: palette.textSecondary }]}>Submitted: {profile?.kyc.submittedAt ?? 'Not submitted yet'}</Text>
              <Text style={[styles.meta, { color: palette.textSecondary }]}>Reviewed: {profile?.kyc.reviewedAt ?? 'Waiting for review'}</Text>
            </View>
          </View>
          {kycRejected ? <Text style={[styles.warning, { color: palette.error }]}>{profile?.kyc.rejectionReason ?? 'Your KYC was rejected. Please resubmit your documents.'}</Text> : null}
          <ActionButton title={kycRejected ? 'Resubmit KYC' : 'Open KYC flow'} variant="ghost" onPress={() => router.push('/(kyc)')} />
        </Card>

        <Card>
          <SectionHeader title="Wallet" caption="Summary" />
          <View style={styles.infoRow}>
            <Wallet size={18} color={palette.primary} />
            <View style={styles.infoCopy}>
              <Text style={[styles.value, { color: palette.text }]}>{wallet ? wallet.balance.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }) : '---'}</Text>
              <Text style={[styles.meta, { color: palette.textSecondary }]}>{wallet ? `${wallet.transactions.length} transaction records linked to this driver account.` : 'Wallet data is not available yet.'}</Text>
            </View>
          </View>
        </Card>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  profileCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  avatarWrap: { alignSelf: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontFamily: Typography.family.bold, letterSpacing: 0 },
  identityBlock: { alignItems: 'center', gap: 8 },
  username: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  name: { fontSize: 28, lineHeight: 32, fontFamily: Typography.family.bold, letterSpacing: 0, textAlign: 'center' },
  meta: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: 1, padding: Spacing.md },
  editIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  editCopy: { flex: 1, gap: 2 },
  editTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  editSubtitle: { fontSize: Typography.sm, lineHeight: 19, fontFamily: Typography.family.regular },
  metricRow: { flexDirection: 'row', gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoCopy: { flex: 1, gap: 3 },
  value: { fontSize: Typography.lg, lineHeight: 24, fontFamily: Typography.family.bold },
  warning: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  logoutRow: { minHeight: 52, borderRadius: 18, borderWidth: 1, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
