import { memo, useCallback, useState, type ComponentType } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  BadgeCheck,
  Bell,
  Car,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  History,
  LogOut,
  Palette,
  Shield,
  User2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppVersionFooter } from '@/components/AppVersionFooter';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { hexToRgba, useAppPalette } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';

type MenuItem = {
  title: string;
  subtitle: string;
  href: string;
  Icon: ComponentType<{ color?: string; size?: number }>;
};

const PREFERENCE_ITEMS: ReadonlyArray<MenuItem> = [
  { title: 'Appearance', subtitle: 'Customize your view', href: '/settings/preferences', Icon: Palette },
];

const ACCOUNT_ITEMS: ReadonlyArray<MenuItem> = [
  { title: 'Profile', subtitle: 'Driver profile', href: '/(tabs)/profile', Icon: User2 },
  { title: 'KYC', subtitle: 'Courier ID verification', href: '/(kyc)', Icon: BadgeCheck },
  { title: 'Vehicle', subtitle: 'Vehicle info.', href: '/settings/vehicle', Icon: Car },
  { title: 'Transactions', subtitle: 'Ledger history', href: '/(tabs)/wallet/transactions', Icon: History },
];

const ACTIVITY_ITEMS: ReadonlyArray<MenuItem> = [
  { title: 'Notification Preferences', subtitle: 'Manage Notifications', href: '/settings/notifications', Icon: Bell },
];

const SECURITY_ITEMS: ReadonlyArray<MenuItem> = [

  { title: 'Security', subtitle: 'Password, PIN, and biometrics', href: '/profile/security', Icon: Shield },
  { title: 'Support', subtitle: 'Get help from us', href: '/support', Icon: CircleHelp },
];

const MenuItemRow = memo(function MenuItemRow({
  item,
  palette,
  onPress,
}: {
  item: MenuItem;
  palette: ReturnType<typeof useAppPalette>;
  onPress: (href: string) => void;
}) {
  const Icon = item.Icon;
  return (
    <Pressable
      onPress={() => onPress(item.href)}
      style={({ pressed }) => [
        styles.menuRow,
        { borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
        <Icon size={18} color={palette.primary} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: palette.text }]}>{item.title}</Text>
        <Text style={[styles.menuSubtitle, { color: palette.textSecondary }]}>{item.subtitle}</Text>
      </View>
      <ChevronRight size={18} color={palette.textSecondary} />
    </Pressable>
  );
});

const SectionGroup = memo(function SectionGroup({
  label,
  items,
  palette,
  onPress,
}: {
  label: string;
  items: ReadonlyArray<MenuItem>;
  palette: ReturnType<typeof useAppPalette>;
  onPress: (href: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: palette.textSecondary }]}>{label}</Text>
      <View style={styles.groupList}>
        {items.map((item) => (
          <MenuItemRow key={item.title} item={item} palette={palette} onPress={onPress} />
        ))}
      </View>
    </View>
  );
});

export default function DriverSettingsScreen() {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const back = useSafeBack('/(tabs)/home');
  const logout = useDriverStore((state) => state.logout);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const confirmLogout = useCallback(async () => {
    setLogoutVisible(false);
    await logout();
    router.replace('/(auth)/login');
  }, [logout]);

  const openLink = useCallback((href: string) => {
    if (href.startsWith('/(tabs)')) {
      router.navigate(href as never);
    } else {
      router.push(href as never);
    }
  }, []);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => back()}
          style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.card }]}
        >
          <ChevronLeft size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Settings groups card */}
      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <SectionGroup label="Preferences" items={PREFERENCE_ITEMS} palette={palette} onPress={openLink} />
        <View style={styles.groupSpacer} />
        <SectionGroup label="Account" items={ACCOUNT_ITEMS} palette={palette} onPress={openLink} />
        <View style={styles.groupSpacer} />
        <SectionGroup label="Activity" items={ACTIVITY_ITEMS} palette={palette} onPress={openLink} />
        <View style={styles.groupSpacer} />
        <SectionGroup label="Security" items={SECURITY_ITEMS} palette={palette} onPress={openLink} />
      </View>

      {/* Logout button */}
      <Pressable
        onPress={() => setLogoutVisible(true)}
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: palette.card, borderColor: palette.border },
          pressed && styles.pressed,
        ]}
      >
        <LogOut size={18} color={palette.error} />
        <Text style={[styles.logoutText, { color: palette.error }]}>Log out</Text>
      </Pressable>

      {/* Logout confirm modal */}
      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLogoutVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Are you sure you want to log out?</Text>
            <Text style={[styles.sheetText, { color: palette.textSecondary }]}>
              You'll need to sign in again before accepting deliveries.
            </Text>
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setLogoutVisible(false)}
                style={[styles.sheetButton, { backgroundColor: palette.bg, borderColor: palette.border }]}
              >
                <Text style={[styles.sheetButtonText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmLogout()}
                style={[styles.sheetButton, { backgroundColor: palette.error, borderColor: palette.error }]}
              >
                <Text style={[styles.sheetButtonText, { color: palette.card }]}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <AppVersionFooter />


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 110, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg },
  group: { gap: 10 },
  groupLabel: { fontSize: 11, fontFamily: Typography.family.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  groupList: { gap: 10 },
  groupSpacer: { height: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, padding: Spacing.md },
  iconBox: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuCopy: { flex: 1, gap: 2 },
  menuTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  menuSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, borderWidth: 1, minHeight: 54 },
  logoutText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.xl, gap: 12 },
  sheetTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: 'center' },
  sheetText: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20, textAlign: 'center' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetButton: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});

