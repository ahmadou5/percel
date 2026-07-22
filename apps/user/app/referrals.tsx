import { useCallback, useMemo, useState, type ComponentType } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import {
  ChevronLeft,
  Clock,
  Copy,
  Gift,
  PartyPopper,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { useAuthStore } from '@/store/auth.store';
import { useAppPalette, isLight } from '@/lib/theme';
import { useReferralStats, useApplyReferralCode, type ReferralEntry } from '@/hooks/useReferrals';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

const NGN = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

function statusColor(status: ReferralEntry['status'], palette: ReturnType<typeof useAppPalette>) {
  switch (status) {
    case 'REWARDED': return palette.success;
    case 'QUALIFIED': return '#5B8CFF';
    case 'PENDING': return palette.warning;
    case 'EXPIRED': return palette.textSecondary;
  }
}

function statusLabel(status: ReferralEntry['status']) {
  switch (status) {
    case 'REWARDED': return 'Rewarded';
    case 'QUALIFIED': return 'Qualified';
    case 'PENDING': return 'Pending';
    case 'EXPIRED': return 'Expired';
  }
}

export default function ReferralsScreen() {
  const modal = useAppModal();
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const back = useSafeBack('/');

  const statsQuery = useReferralStats();
  const applyMutation = useApplyReferralCode();
  const [inputCode, setInputCode] = useState('');
  const [showApply, setShowApply] = useState(false);

  const stats = statsQuery.data;
  const code = stats?.code ?? '------';

  if (!isAuthenticated) return <Redirect href='/(auth)/welcome' />;
  if (!isUnlocked) return <Redirect href='/auth-lock' />;

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join me on Percel – Nigeria's premium delivery platform. Use my referral code: ${code}\n\nYou'll get ${NGN.format(stats?.inviteeBonus ?? 200)} and I'll earn ${NGN.format(stats?.inviterBonus ?? 500)} when you complete your first delivery!`,
      });
    } catch {
      modal.alert('Could not share', 'Please try again.', 'error');
    }
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(code);
    modal.alert('Copied!', 'Referral code copied to clipboard.', 'success');
  };

  const onApply = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed.length < 4) {
      modal.alert('Invalid code', 'Please enter a valid referral code.', 'warning');
      return;
    }
    try {
      const result = await applyMutation.mutateAsync(trimmed);
      modal.alert('Success! 🎉', `You've been referred by ${result.inviterName}. Complete your first order to unlock your ${NGN.format(stats?.inviteeBonus ?? 200)} welcome bonus!`, 'success');
      setInputCode('');
      setShowApply(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong';
      modal.alert('Could not apply code', message, 'error');
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => back()} style={[styles.backButton, { borderColor: palette.border }]}>
          <ChevronLeft size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Refer & Earn</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Loading state */}
      {statsQuery.isLoading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      )}

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={[styles.heroIconWrap, { backgroundColor: lightBg ? 'rgba(10,132,255,0.12)' : 'rgba(10,132,255,0.18)' }]}>
          <Gift size={28} color={palette.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: palette.text }]}>Invite friends,{'\n'}earn together</Text>
        <Text style={[styles.heroText, { color: palette.textSecondary }]}>
          Share your code and both of you get rewarded when they complete their first delivery.
        </Text>
        <View style={styles.bonusRow}>
          <View style={[styles.bonusPill, { backgroundColor: lightBg ? 'rgba(48,209,88,0.12)' : 'rgba(48,209,88,0.16)' }]}>
            <Text style={[styles.bonusLabel, { color: palette.success }]}>You earn</Text>
            <Text style={[styles.bonusAmount, { color: palette.success }]}>{NGN.format(stats?.inviterBonus ?? 500)}</Text>
          </View>
          <View style={[styles.bonusPill, { backgroundColor: lightBg ? 'rgba(10,132,255,0.12)' : 'rgba(10,132,255,0.16)' }]}>
            <Text style={[styles.bonusLabel, { color: palette.primary }]}>They earn</Text>
            <Text style={[styles.bonusAmount, { color: palette.primary }]}>{NGN.format(stats?.inviteeBonus ?? 200)}</Text>
          </View>
        </View>
      </View>

      {/* Code card */}
      <View style={[styles.codeCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Your referral code</Text>
        <Pressable onPress={onCopy} style={styles.codeRow}>
          <Text style={[styles.code, { color: palette.text }]}>{code}</Text>
          <View style={[styles.copyBadge, { backgroundColor: lightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
            <Copy size={16} color={palette.textSecondary} />
          </View>
        </Pressable>
        <Pressable
          onPress={onShare}
          style={({ pressed }) => [styles.shareButton, { backgroundColor: palette.primary }, pressed ? styles.pressed : null]}
        >
          <Share2 size={18} color="#FFFFFF" />
          <Text style={[styles.shareText, { color: '#FFFFFF' }]}>Share invite</Text>
        </Pressable>
      </View>

      {/* Stats cards */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard
            icon={Users}
            value={stats.totalReferred}
            label="Invited"
            palette={palette}
            lightBg={lightBg}
            accent={palette.primary}
          />
          <StatCard
            icon={Clock}
            value={stats.pending}
            label="Pending"
            palette={palette}
            lightBg={lightBg}
            accent={palette.warning}
          />
          <StatCard
            icon={Trophy}
            value={stats.rewarded}
            label="Rewarded"
            palette={palette}
            lightBg={lightBg}
            accent={palette.success}
          />
        </View>
      )}

      {/* Total earned */}
      {stats && stats.totalEarned > 0 && (
        <View style={[styles.earnedCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.earnedIcon, { backgroundColor: lightBg ? 'rgba(48,209,88,0.12)' : 'rgba(48,209,88,0.16)' }]}>
            <Sparkles size={20} color={palette.success} />
          </View>
          <View style={styles.earnedCopy}>
            <Text style={[styles.earnedLabel, { color: palette.textSecondary }]}>Total earned from referrals</Text>
            <Text style={[styles.earnedAmount, { color: palette.success }]}>{NGN.format(stats.totalEarned)}</Text>
          </View>
        </View>
      )}

      {/* Apply a referral code */}
      <Pressable
        onPress={() => setShowApply(!showApply)}
        style={[styles.applyToggle, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        <View style={[styles.applyIcon, { backgroundColor: lightBg ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.16)' }]}>
          <UserPlus size={18} color={palette.warning} />
        </View>
        <Text style={[styles.applyToggleText, { color: palette.text }]}>Have a referral code?</Text>
      </Pressable>

      {showApply && (
        <View style={[styles.applyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <TextInput
            style={[styles.applyInput, { color: palette.text, borderColor: palette.border, backgroundColor: lightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)' }]}
            placeholder="Enter referral code"
            placeholderTextColor={palette.textSecondary}
            value={inputCode}
            onChangeText={(text) => setInputCode(text.toUpperCase())}
            maxLength={12}
            autoCapitalize="characters"
          />
          <Pressable
            onPress={onApply}
            disabled={applyMutation.isPending}
            style={({ pressed }) => [styles.applyButton, { backgroundColor: palette.text }, pressed ? styles.pressed : null]}
          >
            {applyMutation.isPending ? (
              <ActivityIndicator size="small" color={palette.card} />
            ) : (
              <Text style={[styles.applyButtonText, { color: palette.card }]}>Apply code</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Referral list */}
      {stats && stats.referrals.length > 0 && (
        <View style={[styles.listCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>Your referrals</Text>
          {stats.referrals.map((ref, index) => (
            <View
              key={ref.id}
              style={[
                styles.refRow,
                index < stats.referrals.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border } : null,
              ]}
            >
              <View style={[styles.refAvatar, { backgroundColor: lightBg ? 'rgba(10,132,255,0.10)' : 'rgba(10,132,255,0.16)' }]}>
                <Text style={[styles.refInitials, { color: palette.primary }]}>
                  {ref.inviteeName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.refInfo}>
                <Text style={[styles.refName, { color: palette.text }]} numberOfLines={1}>
                  {ref.inviteeName}
                </Text>
                <Text style={[styles.refDate, { color: palette.textSecondary }]}>
                  Joined {new Date(ref.joinedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(ref.status, palette) + '1A' }]}>
                <Text style={[styles.statusText, { color: statusColor(ref.status, palette) }]}>
                  {statusLabel(ref.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* How it works */}
      <View style={[styles.howCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>How it works</Text>
        <HowStep
          number={1}
          title="Share your code"
          subtitle="Send your unique code to friends."
          palette={palette}
          lightBg={lightBg}
        />
        <HowStep
          number={2}
          title="Friend signs up"
          subtitle="They create an account with your code."
          palette={palette}
          lightBg={lightBg}
        />
        <HowStep
          number={3}
          title="Both get rewarded"
          subtitle="Once they complete their first order, rewards land in both wallets."
          palette={palette}
          lightBg={lightBg}
        />
      </View>
      <AppModal config={modal.config} onClose={modal.hide} />
    </ScrollView>
  );
}

function StatCard({ icon: Icon, value, label, palette, lightBg, accent }: {
  icon: ComponentType<{ color?: string; size?: number }>;
  value: number;
  label: string;
  palette: ReturnType<typeof useAppPalette>;
  lightBg: boolean;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.statIcon, { backgroundColor: accent + (lightBg ? '14' : '24') }]}>
        <Icon size={16} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

function HowStep({ number, title, subtitle, palette, lightBg }: {
  number: number;
  title: string;
  subtitle: string;
  palette: ReturnType<typeof useAppPalette>;
  lightBg: boolean;
}) {
  return (
    <View style={styles.howStep}>
      <View style={[styles.howNumber, { backgroundColor: lightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
        <Text style={[styles.howNumberText, { color: palette.text }]}>{number}</Text>
      </View>
      <View style={styles.howCopy}>
        <Text style={[styles.howTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.howSubtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { paddingVertical: Spacing.xxxl, alignItems: 'center' },

  hero: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14, alignItems: 'center' },
  heroIconWrap: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 24, fontFamily: Typography.family.bold, textAlign: 'center', lineHeight: 30, letterSpacing: -0.6 },
  heroText: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular, textAlign: 'center' },
  bonusRow: { flexDirection: 'row', gap: 10, width: '100%' },
  bonusPill: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', gap: 2 },
  bonusLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  bonusAmount: { fontSize: Typography.xl, fontFamily: Typography.family.bold, letterSpacing: -0.4 },

  codeCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1.1 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  code: { fontSize: 38, lineHeight: 42, fontFamily: Typography.family.bold, letterSpacing: 3 },
  copyBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  shareButton: { minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  shareText: { fontSize: Typography.md, fontFamily: Typography.family.bold },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 22, fontFamily: Typography.family.bold },
  statLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium },

  earnedCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  earnedIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  earnedCopy: { flex: 1, gap: 2 },
  earnedLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  earnedAmount: { fontSize: 22, fontFamily: Typography.family.bold },

  applyToggle: { borderRadius: 22, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  applyIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  applyToggleText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  applyCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  applyInput: { minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: Spacing.md, fontSize: Typography.lg, fontFamily: Typography.family.bold, letterSpacing: 2, textAlign: 'center' },
  applyButton: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { fontSize: Typography.md, fontFamily: Typography.family.bold },

  listCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  refAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  refInitials: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  refInfo: { flex: 1, gap: 2 },
  refName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  refDate: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },

  howCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  howStep: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  howNumber: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  howNumberText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  howCopy: { flex: 1, gap: 2 },
  howTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  howSubtitle: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 20 },

  pressed: { opacity: 0.92 },
});
