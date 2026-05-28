import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useProfile, useUpdateAvatar } from '@/hooks/useProfile';
import { usePreferencesStore } from '@/store/preferences.store';

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function maskPhone(value?: string | null) {
  if (!value) return 'Not available';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return value;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const profileQuery = useProfile();
  const walletQuery = useWallet();
  const logout = useLogout();
  const updateAvatar = useUpdateAvatar();
  const notificationsEnabled = usePreferencesStore((state) => state.notificationsEnabled);
  const notificationsLoading = usePreferencesStore((state) => state.isLoading);
  const hydratePreferences = usePreferencesStore((state) => state.hydrate);
  const setNotificationsEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const walletPinSet = Boolean(walletQuery.data?.walletPinSet);
  const profile = profileQuery.data;

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

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

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out of Percel?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout.mutateAsync() },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Pressable style={styles.avatar} onPress={() => void changeAvatar()}>
          {profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(profile?.fullName ?? 'A').slice(0, 1)}</Text>}
        </Pressable>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>{profile?.fullName ?? 'Account'}</Text>
        <Text style={styles.subtitle}>{profile?.email ?? 'Your account, security, and delivery settings live here.'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Quick info</Text>
        <Row label="Phone" value={maskPhone(profile?.phone)} />
        <Row label="Birthday" value={formatDate(profile?.dateOfBirth)} />
        <Row label="Address" value={profile?.address ?? 'Add your default pickup address'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Account</Text>
        <Text style={styles.cardMeta}>Update your name, avatar, birth date, and address in one place.</Text>
        <Button title="Edit profile" onPress={() => router.push('./edit')} />
        <Button title="Change password" variant="secondary" onPress={() => router.push('./edit')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Wallet shortcut</Text>
        <Text style={styles.cardValue}>₦{Number(walletQuery.data?.balance ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</Text>
        <Text style={styles.cardMeta}>{walletPinSet ? 'Transfer PIN is active.' : 'Set a transfer PIN for wallet transfers.'}</Text>
        <Button title="Open Wallet" variant="secondary" onPress={() => router.push('/wallet')} />
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.cardLabel}>Notification settings</Text>
            <Text style={styles.cardMeta}>Control whether this device registers for push notifications.</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => void setNotificationsEnabled(value)}
            disabled={notificationsLoading}
          />
        </View>
      </View>

      <Pressable
        style={styles.linkCard}
        onPress={() => Linking.openURL('mailto:support@percel.app?subject=Percel%20Support')}
      >
        <Text style={styles.linkTitle}>Help & Support</Text>
        <Text style={styles.linkMeta}>Email support@percel.app for help with deliveries, wallet issues, or account access.</Text>
      </Pressable>

      <Button title={logout.isPending ? 'Signing out…' : 'Logout'} variant="danger" onPress={confirmLogout} loading={logout.isPending} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg, backgroundColor: Colors.light.bg, paddingBottom: Spacing.xl * 2 },
  hero: {
    borderRadius: 28,
    padding: Spacing.xl,
    backgroundColor: Colors.light.primaryDark,
    gap: Spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: Colors.light.text, fontSize: 28, fontWeight: Typography.bold },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontWeight: Typography.bold },
  title: { color: '#fff', fontSize: 32, lineHeight: 38, fontWeight: Typography.bold },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: Typography.md, lineHeight: 22 },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.md,
  },
  cardLabel: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  cardValue: { color: Colors.light.text, fontSize: 22, fontWeight: Typography.bold },
  cardMeta: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.xs },
  rowLabel: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  rowValue: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold, maxWidth: '62%', textAlign: 'right' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  switchCopy: { flex: 1, gap: Spacing.xs },
  linkCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.xs,
  },
  linkTitle: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  linkMeta: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
});
