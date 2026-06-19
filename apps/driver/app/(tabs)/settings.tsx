import { useState, type ComponentType } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BadgeCheck, Bell, ChevronRight, CircleHelp, History, LogOut, Shield, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppPalette } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';

const groups = [
  {
    label: 'Account',
    items: [
      { title: 'Profile / KYC', subtitle: 'Driver profile, vehicle info, and verification', href: '/(tabs)/profile', Icon: BadgeCheck },
      { title: 'Transactions', subtitle: 'Delivery history and wallet activity', href: '/(tabs)/history', Icon: History },
    ],
  },
  {
    label: 'Activity',
    items: [
      { title: 'Notification Preferences', subtitle: 'Manage delivery and account alerts', href: '/(tabs)/notifications', Icon: Bell },
    ],
  },
  {
    label: 'Security',
    items: [
      { title: 'Security', subtitle: 'Password, PIN, and biometrics', href: '/(tabs)/profile', Icon: Shield },
      { title: 'Support', subtitle: 'Get help from dispatch support', href: '/modal', Icon: CircleHelp },
    ],
  },
] as const;

export default function DriverSettingsScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const logout = useDriverStore((state) => state.logout);
  const user = useDriverStore((state) => state.user);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const confirmLogout = async () => {
    setLogoutVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
          <User size={22} color="#fff" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Settings</Text>
          <Text style={[styles.title, { color: palette.text }]}>{user?.fullName ?? 'Driver account'}</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Manage profile, alerts, security, and support.</Text>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {groups.map((group, groupIndex) => (
          <View key={group.label} style={[styles.group, groupIndex > 0 ? styles.groupSpacing : null]}>
            <Text style={[styles.groupLabel, { color: palette.textSecondary }]}>{group.label}</Text>
            {group.items.map((item) => (
              <MenuRow key={item.title} item={item} />
            ))}
          </View>
        ))}
      </View>

      <Pressable onPress={() => setLogoutVisible(true)} style={[styles.logoutButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <LogOut size={18} color={palette.error} />
        <Text style={[styles.logoutText, { color: palette.error }]}>Log out</Text>
      </Pressable>

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLogoutVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Log out?</Text>
            <Text style={[styles.sheetText, { color: palette.textSecondary }]}>You will need to sign in again before accepting deliveries.</Text>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setLogoutVisible(false)} style={[styles.sheetButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <Text style={[styles.sheetButtonText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmLogout} style={[styles.sheetButton, { backgroundColor: palette.error, borderColor: palette.error }]}>
                <Text style={[styles.sheetButtonText, { color: '#fff' }]}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function MenuRow({ item }: { item: { title: string; subtitle: string; href: string; Icon: ComponentType<{ color?: string; size?: number }> } }) {
  const palette = useAppPalette();
  return (
    <Pressable onPress={() => router.push(item.href as never)} style={({ pressed }) => [styles.menuRow, { borderColor: palette.border }, pressed ? styles.pressed : null]}>
      <View style={[styles.iconBox, { backgroundColor: palette.text }]}>
        <item.Icon size={18} color={palette.primary} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: palette.text }]}>{item.title}</Text>
        <Text style={[styles.menuSubtitle, { color: palette.textSecondary }]}>{item.subtitle}</Text>
      </View>
      <ChevronRight size={18} color={palette.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 110, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '900' },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  sectionCard: { borderRadius: 28, borderWidth: 1, padding: 18 },
  group: { gap: 10 },
  groupSpacing: { marginTop: 18 },
  groupLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, padding: 14 },
  iconBox: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuCopy: { flex: 1, gap: 2 },
  menuTitle: { fontSize: 15, fontWeight: '900' },
  menuSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, borderWidth: 1, minHeight: 54 },
  logoutText: { fontSize: 15, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 22, gap: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  sheetText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetButton: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetButtonText: { fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.92 },
});
