import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Bell, CreditCard, HandCoins, Shield, Users, ChevronRight } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Linking } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAuthStore } from '@/store/auth.store';

const SLUGS = {
  kyc: { title: 'KYC', description: 'Verify your identity so your account stays compliant and ready for higher limits.', Icon: BadgeCheck },
  'spending-limits': { title: 'Spending Limits', description: 'Manage the transaction limits that keep your account safe and predictable.', Icon: CreditCard },
  beneficiaries: { title: 'Beneficiaries', description: 'Review and manage the bank accounts you save for faster transfers.', Icon: Users },
  notifications: { title: 'Notifications', description: 'Choose what updates you receive and when the app should alert you.', Icon: Bell },
  support: { title: 'Support', description: 'Reach the Percel team for help with deliveries, wallet issues, and account access.', Icon: HandCoins },
  'reset-pin': { title: 'Reset PIN', description: 'Need help regaining access? Reset your transfer PIN with guidance from support.', Icon: Shield },
} as const;

type SlugKey = keyof typeof SLUGS;

export default function SettingsDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);

  const slug = (Array.isArray(params.slug) ? params.slug[0] : params.slug) as SlugKey | undefined;
  const page = slug ? SLUGS[slug] : undefined;

  if (!isAuthenticated) {
    return <Redirect href='/(auth)/welcome' />;
  }

  if (!page) {
    return <Redirect href='/settings' />;
  }

  if (!isUnlocked && slug !== 'support' && slug !== 'reset-pin') {
    return <Redirect href='/auth-lock' />;
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ChevronRight size={18} color={palette.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{page.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <View style={[styles.icon, { backgroundColor: palette.text }]}> 
          <page.Icon size={24} color={palette.card} />
        </View>
        <View style={[styles.note, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(10,132,255,0.06)', borderColor: palette.border }]}>
          <Text style={[styles.noteText, { color: palette.textSecondary }]}>This screen is wired into the new settings flow and can be expanded with the full product feature later.</Text>
        </View>
        {slug === 'support' || slug === 'reset-pin' ? <Button title="Email support" variant="secondary" onPress={() => void Linking.openURL('mailto:support@percel.app?subject=Percel%20Support')} /> : null}
        <Button title="Back to Settings" variant="secondary" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.8 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14, alignItems: 'center' },
  icon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  note: { width: '100%', borderRadius: 20, borderWidth: 1, padding: Spacing.md },
  noteText: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular, textAlign: 'center' },
});
