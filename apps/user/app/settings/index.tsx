import { useState, type ComponentType } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, Bell, ChevronLeft, ChevronRight, CircleHelp, CreditCard, History, LogOut, Palette, Shield, User, Users } from 'lucide-react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { useAppPalette } from '@/lib/theme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';

import { AppVersionFooter } from '@/components/AppVersionFooter';

const preferenceItems = [
  { title: 'Preferences', subtitle: 'Choose your theme and custom palette', href: '/settings/preferences', Icon: Palette },
] as const;

const accountItems = [
  { title: 'My Profile', subtitle: 'View your profile', href: '/profile', Icon: User },
  { title: 'KYC', subtitle: 'Verify your identity', href: '/settings/kyc', Icon: BadgeCheck },
  { title: 'Spending Limits', subtitle: 'Manage your transaction limits', href: '/settings/spending-limits', Icon: CreditCard },
  { title: 'Beneficiaries', subtitle: 'Manage saved bank accounts', href: '/settings/beneficiaries', Icon: Users },
] as const;

const activityItems = [
  { title: 'Transactions', subtitle: 'View your transaction history', href: '/wallet/transactions', Icon: History },
  { title: 'Notifications', subtitle: 'Manage notification preferences', href: '/settings/notifications', Icon: Bell },
] as const;

const securityItems = [
  { title: 'Security', subtitle: 'Change password, PIN, and biometrics', href: '/profile/security', Icon: Shield },
  { title: 'Support', subtitle: 'Talk to us', href: '/settings/support', Icon: CircleHelp },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const back = useSafeBack('/profile');
  const logout = useLogout();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const confirmLogout = async () => {
    setLogoutVisible(false);
    await logout.mutateAsync();
    router.replace('/(auth)/welcome');
  };

  const openLink = async (href: string) => {
    if (href.startsWith('mailto:')) {
      await Linking.openURL(href);
      return;
    }
    router.push(href as never);
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => back()} style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <ChevronLeft size={20} color={palette.text} fill={'none'} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <SectionGroup label="Preferences" items={preferenceItems} palette={palette} onPress={openLink} />
        <View style={styles.groupSpacer} />
        <SectionGroup label="Account" items={accountItems} palette={palette} onPress={openLink} />
        <View style={styles.groupSpacer} />
        <SectionGroup label="Activity" items={activityItems} palette={palette} onPress={openLink} />
        <View style={styles.groupSpacer} />
        <SectionGroup label="Security" items={securityItems} palette={palette} onPress={openLink} />
      </View>

      <Pressable onPress={() => setLogoutVisible(true)} style={({ pressed }) => [styles.logoutButton, { backgroundColor: palette.card, borderColor: palette.border }, pressed ? styles.pressed : null]}>

        <Text style={[styles.logoutText, { color: palette.error }]}>Log out</Text>
      </Pressable>

      <AppVersionFooter />

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLogoutVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Are you sure you want to log out?</Text>
            <Text style={[styles.sheetText, { color: palette.textSecondary }]}>You’ll need to sign in again to access your wallet and account settings.</Text>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setLogoutVisible(false)} style={[styles.sheetButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <Text style={[styles.sheetButtonText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void confirmLogout()} style={[styles.sheetButton, { backgroundColor: palette.error, borderColor: palette.error }]}>
                <Text style={[styles.sheetButtonText, { color: palette.card }]}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SectionGroup({ label, items, palette, onPress }: { label: string; items: ReadonlyArray<{ title: string; subtitle: string; href: string; Icon: ComponentType<{ color?: string; size?: number }>; external?: boolean }>; palette: (typeof Colors)[keyof typeof Colors]; onPress: (href: string) => void; }) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: palette.textSecondary }]}>{label}</Text>
      <View style={styles.groupList}>
        {items.map((item) => (
          <Pressable key={item.title} onPress={() => void onPress(item.href)} style={({ pressed }) => [styles.menuRow, { borderColor: palette.border }, pressed ? styles.pressed : null]}>
            <View style={[styles.iconBox, { backgroundColor: palette.text }]}>
              <item.Icon size={18} color={palette.primary} />
            </View>
            <View style={styles.menuCopy}>
              <Text style={[styles.menuTitle, { color: palette.text }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: palette.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <ChevronRight size={18} color={palette.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg },
  group: { gap: 10 },
  groupLabel: { fontSize: 11, fontFamily: Typography.family.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  groupList: { gap: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, padding: Spacing.md },
  iconBox: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuCopy: { flex: 1, gap: 2 },
  menuTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  menuSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  groupSpacer: { height: 16 },
  logoutButton: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, borderWidth: 1, minHeight: 54 },
  logoutText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.xl, gap: 12 },
  sheetTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  sheetText: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20, textAlign: 'center' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetButton: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  pressed: { opacity: 0.92 },
});
