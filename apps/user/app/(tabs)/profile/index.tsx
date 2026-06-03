import { useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, ChevronRight, Gift, ShieldCheck, Settings2, ChevronLeft } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useProfile, useUpdateAvatar } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/auth.store';

export default function ProfileScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const back = useSafeBack("/");
  const profileQuery = useProfile();
  const updateAvatar = useUpdateAvatar();
  const authUser = useAuthStore((state) => state.user);
  const profile = profileQuery.data ?? authUser;

  const displayName = profile?.fullName ?? 'Account';
  const initials = useMemo(() => {
    const segments = displayName.split(/\s+/).filter(Boolean);
    const next = segments.length > 1 ? `${segments[0][0] ?? ''}${segments[1][0] ?? ''}` : displayName.slice(0, 2);
    return next.toUpperCase();
  }, [displayName]);
  const username = `@${(profile?.phone ?? authUser?.phone ?? '00000000').replace(/\D/g, '').slice(-8)}`;
  const verified = Boolean(profile?.kycComplete);

  const changeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to update your avatar.');
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

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
       <View style={styles.headerRow}>
              <Pressable onPress={() => back()} style={[styles.backButton, {  borderColor: palette.border }]}>
               <ChevronLeft size={20} color={palette.text} fill={"none"}  />
              </Pressable>
              <Text style={[styles.headerTitle, { color: palette.text }]}>Profile</Text>
              <View style={styles.headerSpacer} />
            </View>

      <View style={[styles.profileCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Pressable onPress={() => void changeAvatar()} style={({ pressed }) => [styles.avatarWrap, pressed ? { transform: [{ scale: 0.98 }] } : null]}>
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: palette.card }]}>{initials}</Text>
            )}
          </View>
          <View style={[styles.cameraBadge, { backgroundColor: palette.primary, borderColor: palette.card }]}>
            <Camera size={12} color={palette.card} />
          </View>
        </Pressable>

        <View style={styles.identityBlock}>
          <Text style={[styles.name, { color: palette.text }]}>{displayName}</Text>
          <Text style={[styles.username, { color: palette.textSecondary }]}>{username}</Text>
          <View style={[styles.badge, { backgroundColor: verified ? 'rgba(48, 209, 88, 0.16)' : 'rgba(255, 214, 10, 0.16)' }]}>
            <ShieldCheck size={12} color={verified ? palette.success : palette.warning} />
            <Text style={[styles.badgeText, { color: verified ? palette.success : palette.warning }]}>{verified ? 'KYC complete' : 'KYC required'}</Text>
          </View>
          {!verified ? (
            <Pressable onPress={() => router.push('/settings/kyc')} style={[styles.kycCallout, { backgroundColor: scheme === 'dark' ? 'rgba(255,214,10,0.12)' : 'rgba(255,214,10,0.10)', borderColor: palette.border }]}>
              <Text style={[styles.kycTitle, { color: palette.text }]}>Complete KYC to unlock your NUBAN</Text>
              <Text style={[styles.kycSubtitle, { color: palette.textSecondary }]}>Choose BVN or NIN and finish KYC in Settings.</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable onPress={() => router.push('/referrals')} style={({ pressed }) => [styles.referralCard, { backgroundColor: scheme === 'dark' ? 'rgba(10, 132, 255, 0.14)' : 'rgba(10, 132, 255, 0.08)', borderColor: palette.border }, pressed ? styles.pressed : null]}>
          <View style={[styles.referralIcon, { backgroundColor: palette.primary }]}> 
            <Gift size={20} color={palette.card} />
          </View>
          <View style={styles.referralCopy}>
            <Text style={[styles.referralTitle, { color: palette.text }]}>Refer & Earn</Text>
            <Text style={[styles.referralSubtitle, { color: palette.textSecondary }]}>Invite friends and earn rewards</Text>
          </View>
          <ChevronRight size={18} color={palette.textSecondary} />
        </Pressable>

        <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsRow, { borderColor: palette.border }, pressed ? styles.pressed : null]}>
          <View style={[styles.settingsIcon, { backgroundColor: palette.text }]}>
            <Settings2 size={16} color={palette.card} />
          </View>
          <View style={styles.settingsCopy}>
            <Text style={[styles.settingsTitle, { color: palette.text }]}>Account Settings</Text>
            <Text style={[styles.settingsSubtitle, { color: palette.textSecondary }]}>Manage identity, security, and support</Text>
          </View>
          <ChevronRight size={18} color={palette.textSecondary} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
 backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  avatarWrap: { alignSelf: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontFamily: Typography.family.bold, letterSpacing: -0.4 },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  identityBlock: { alignItems: 'center', gap: 8 },
  name: { fontSize: 28, lineHeight: 32, fontFamily: Typography.family.bold, textAlign: 'center', letterSpacing: -0.8 },
  username: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  kycCallout: { width: '100%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4, alignItems: 'center' },
  kycTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textAlign: 'center' },
  kycSubtitle: { fontSize: Typography.xs, fontFamily: Typography.family.regular, textAlign: 'center' },
  referralCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: Spacing.md, borderWidth: 1 },
  referralIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  referralCopy: { flex: 1, gap: 2 },
  referralTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  referralSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, width: '100%' },
  settingsIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  settingsCopy: { flex: 1, gap: 2 },
  settingsTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  settingsSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  pressed: { opacity: 0.92 },
});
