import { useMemo, type ComponentType } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Gift, Share2, Users, Wallet } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAuthStore } from '@/store/auth.store';

export default function ReferralsScreen() {
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);

  const code = useMemo(() => (user?.phone ?? user?.id ?? 'PERCEL').replace(/\D/g, '').slice(-6) || 'PERCEL', [user?.id, user?.phone]);
  const shareMessage = `Join me on Percel and earn rewards. Use my referral code: ${code}`;

  if (!isAuthenticated) {
    return <Redirect href='/(auth)/welcome' />;
  }

  if (!isUnlocked) {
    return <Redirect href='/auth-lock' />;
  }

  const onShare = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch {
      Alert.alert('Could not share', 'Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.backArrow, { color: palette.text }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Refer & Earn</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <View style={[styles.heroIcon, { backgroundColor: palette.primary }]}>
          <Gift size={24} color={palette.card} />
        </View>
        <Text style={[styles.heroTitle, { color: palette.text }]}>Invite friends and earn rewards</Text>
        <Text style={[styles.heroText, { color: palette.textSecondary }]}>Share your referral code and get rewarded when new users complete their first successful order.</Text>
      </View>

      <View style={[styles.codeCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Your code</Text>
        <Text style={[styles.code, { color: palette.text }]}>{code}</Text>
        <Pressable onPress={() => void onShare()} style={({ pressed }) => [styles.shareButton, { backgroundColor: palette.text }, pressed ? styles.pressed : null]}>
          <Share2 size={18} color={palette.card} />
          <Text style={[styles.shareText, { color: palette.card }]}>Share invite</Text>
        </Pressable>
      </View>

      <View style={[styles.benefitsCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <InfoRow Icon={Users} title="Bring friends on board" subtitle="They get a smooth onboarding path through your invite." palette={palette} />
        <InfoRow Icon={Wallet} title="Track rewards" subtitle="Earned rewards will land in your wallet activity feed." palette={palette} />
      </View>
    </ScrollView>
  );
}

function InfoRow({ Icon, title, subtitle, palette }: { Icon: ComponentType<{ color?: string; size?: number }>; title: string; subtitle: string; palette: (typeof Colors)[keyof typeof Colors]; }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: palette.text }]}>
        <Icon size={18} color={palette.card} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.infoSubtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, lineHeight: 28, marginTop: -2 },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.8 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  hero: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 12, alignItems: 'center' },
  heroIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 24, fontFamily: Typography.family.bold, textAlign: 'center', lineHeight: 28 },
  heroText: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular, textAlign: 'center' },
  codeCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  sectionLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1.1 },
  code: { fontSize: 40, lineHeight: 44, fontFamily: Typography.family.bold, letterSpacing: 1.2, textAlign: 'center' },
  shareButton: { minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  shareText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  benefitsCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, gap: 2 },
  infoTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  infoSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20 },
  pressed: { opacity: 0.92 },
});
