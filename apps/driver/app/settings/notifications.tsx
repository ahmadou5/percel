import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronLeft, Check } from 'lucide-react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { http } from '@/lib/api';
import { usePreferencesStore } from '@/store/preferences.store';

async function registerPushToken() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  if (pushToken) {
    await http.post('/api/v1/user/push-token', { token: pushToken });
  }
}

export default function DriverNotificationsSettingsScreen() {
  const back = useSafeBack('/(tabs)/settings');
  const palette = useAppPalette();
  const notificationsEnabled = usePreferencesStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const permissions = await Notifications.getPermissionsAsync();
      if (!cancelled) setPermissionStatus(permissions.status);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshPermissions = async () => {
    const permissions = await Notifications.getPermissionsAsync();
    setPermissionStatus(permissions.status);
    return permissions.status;
  };

  const enableNotifications = async () => {
    setBusy(true);
    try {
      const current = await Notifications.getPermissionsAsync();
      const next = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      setPermissionStatus(next.status);

      if (next.status !== 'granted') {
        Alert.alert('Notifications disabled', 'You can enable them later from your device settings.');
        return;
      }

      await setNotificationsEnabled(true);
      await registerPushToken();
      Alert.alert('Notifications enabled', 'You will receive delivery offers, chat updates, and payment alerts.');
    } catch (error) {
      Alert.alert('Could not enable notifications', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const disableNotifications = async () => {
    setBusy(true);
    try {
      await setNotificationsEnabled(false);
      await refreshPermissions();
      Alert.alert('Notifications disabled', 'You can turn them back on whenever you want.');
    } finally {
      setBusy(false);
    }
  };

  const testNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Percel Driver Test',
          body: 'Delivery requests and chat updates are active.',
        },
        trigger: null,
      });
    } catch (error) {
      Alert.alert('Could not send test notification', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const enabled = notificationsEnabled && permissionStatus === 'granted';

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.heroLabel, { color: palette.textSecondary }]}>Alerts</Text>
        <Text style={[styles.heroTitle, { color: palette.text }]}>Choose when the app should ping you about important delivery activity.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <View style={styles.rowTop}>
          <View style={[styles.iconWrap, { backgroundColor: enabled ? 'rgba(20,184,166,0.14)' : 'rgba(148,163,184,0.10)' }]}>
            <Bell size={22} color={enabled ? palette.primary : palette.textSecondary} />
          </View>
          <View style={[styles.badge, { backgroundColor: enabled ? 'rgba(48,209,88,0.14)' : 'rgba(148,163,184,0.16)' }]}>
            <View style={[styles.badgeDot, { backgroundColor: enabled ? palette.success : palette.textSecondary }]} />
            <Text style={[styles.badgeText, { color: enabled ? palette.success : palette.textSecondary }]}>{enabled ? 'Enabled' : 'Disabled'}</Text>
          </View>
        </View>

        <View style={styles.copyBlock}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Push Notifications</Text>
          <Text style={[styles.sectionCopy, { color: palette.textSecondary }]}>Get new delivery offers, route changes, support replies, and payout updates instantly.</Text>
        </View>

        <View style={styles.actions}>
          {enabled ? (
            <Pressable onPress={() => void testNotification()} disabled={busy} style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.primary, borderColor: palette.primary }, pressed ? styles.pressed : null]}>
              <Check size={16} color={palette.card} />
              <Text style={[styles.primaryText, { color: palette.card }]}>Test Notification</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => void enableNotifications()} disabled={busy} style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.primary, borderColor: palette.primary }, pressed ? styles.pressed : null]}>
              <Check size={16} color={palette.card} />
              <Text style={[styles.primaryText, { color: palette.card }]}>Enable Notifications</Text>
            </Pressable>
          )}

          {enabled ? (
            <Pressable onPress={() => void disableNotifications()} disabled={busy} style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}>
              <Text style={[styles.linkText, { color: palette.textSecondary }]}>Disable</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.noteCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.noteTitle, { color: palette.text }]}>Permission state</Text>
        <Text style={[styles.noteText, { color: palette.textSecondary }]}>
          {permissionStatus == null
            ? 'Checking permission state…'
            : permissionStatus === 'granted'
              ? 'Notifications are allowed on this device.'
              : 'Notifications are blocked or not yet granted on this device.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 8 },
  heroLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Typography.family.bold },
  heroTitle: { fontSize: Typography.lg, lineHeight: 26, fontFamily: Typography.family.bold },
  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  copyBlock: { gap: 8 },
  sectionTitle: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  sectionCopy: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  actions: { gap: 12 },
  primaryButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  linkButton: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 6 },
  linkText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  noteCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 8 },
  noteTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  noteText: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  pressed: { opacity: 0.92 },
});
