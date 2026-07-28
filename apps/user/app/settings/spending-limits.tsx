import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useAppPalette, isLight } from '@/lib/theme';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { CheckCircle2, ChevronRight, CreditCard, Lock, Shield, ShieldCheck, Sparkles, Zap } from 'lucide-react-native';
import { useWallet } from '@/hooks/useWallet';
import { useProfile } from '@/hooks/useProfile';
import { formatNaira } from '@/lib/wallet';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { StateCard } from '@/components/ui/StateCard';
import { useRouter } from 'expo-router';

const TIERS = [
  {
    tier: 1,
    label: 'Tier 1',
    limit: 50000,
    requirement: 'No verification',
    description: 'Basic account. Sign up automatically grants this.',
    color: '#8E8E93',
  },
  {
    tier: 2,
    label: 'Tier 2',
    limit: 200000,
    requirement: 'BVN or NIN verified',
    description: 'Complete BVN verification in the KYC section.',
    color: '#FF9F0A',
  },
  {
    tier: 3,
    label: 'Tier 3',
    limit: 5000000,
    requirement: 'BVN and NIN verified',
    description: 'Add your NIN after BVN verification to unlock maximum limits.',
    color: '#30D158',
  },
];

export default function SpendingLimitsScreen() {
  const palette = useAppPalette();
  const router = useRouter();
  const back = useSafeBack("/settings");
  const { data: wallet, isLoading: walletLoading, isError, refetch } = useWallet();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const isLoading = walletLoading || profileLoading;

  const Header = () => (
    <View style={[styles.headerRow, { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl }]}>
      <Pressable onPress={() => back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <ChevronRight size={18} color={palette.text} style={{ transform: [{ rotate: '180deg' }] }} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: palette.text }]}>Spending Limits</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.bg }]}>
        <Header />
        <View style={styles.content}><ListSkeleton count={2} /></View>
      </View>
    );
  }

  if (isError || !wallet) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.bg }]}>
        <Header />
        <View style={styles.content}>
          <StateCard
            title="Failed to load limits"
            description="We couldn't load your spending limits."
            icon={<CreditCard size={24} color={palette.textSecondary} />}
            actionLabel="Retry"
            onActionPress={() => void refetch()}
          />
        </View>
      </View>
    );
  }

  const bvnVerified = profile?.bvnVerified ?? false;
  const ninVerified = profile?.ninVerified ?? false;
  const isTier3 = bvnVerified && ninVerified;
  const isTier2 = bvnVerified || ninVerified;
  const currentTier = isTier3 ? 3 : (isTier2 ? 2 : 1);

  const dailyLimit = wallet.dailyLimit ?? 50000;
  const usage = wallet.dailyTransferUsage ?? 0;
  const remaining = Math.max(0, dailyLimit - usage);
  const percentage = Math.min(100, Math.max(0, (usage / dailyLimit) * 100));
  const tierColor = isTier3 ? '#30D158' : (isTier2 ? palette.primary : '#8E8E93');

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <Header />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Daily usage card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardTop}>
            <View>
              <Text style={[styles.cardLabel, { color: palette.textSecondary }]}>Daily Transfer Limit</Text>
              <Text style={[styles.limitValue, { color: palette.text }]}>{formatNaira(dailyLimit)}</Text>
            </View>
            <View style={[styles.tierPill, { backgroundColor: tierColor + '22', borderColor: tierColor }]}>
              <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
              <Text style={[styles.tierPillText, { color: tierColor }]}>Tier {currentTier}</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
              <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: tierColor }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressText, { color: palette.textSecondary }]}>Used: {formatNaira(usage)}</Text>
              <Text style={[styles.progressText, { color: palette.textSecondary }]}>Left: {formatNaira(remaining)}</Text>
            </View>
          </View>

          <View style={[styles.resetHint, { backgroundColor: isLight(palette.bg) ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', borderColor: palette.border }]}>
            <ShieldCheck size={14} color={palette.textSecondary} />
            <Text style={[styles.resetHintText, { color: palette.textSecondary }]}>Limits reset daily at midnight (UTC)</Text>
          </View>
        </View>

        {/* Tier ladder */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Verification Tiers</Text>
          <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Unlock higher daily transfer limits</Text>
        </View>

        <View style={styles.tierCardsContainer}>
          {TIERS.map((t) => {
            const isActive = t.tier === currentTier;
            const isUnlocked = t.tier <= currentTier;
            const isNext = t.tier === currentTier + 1;
            const tierAccent = t.tier === 3 ? '#30D158' : (t.tier === 2 ? palette.primary : '#8E8E93');

            return (
              <View
                key={t.tier}
                style={[
                  styles.tierCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: isActive ? tierAccent : palette.border,
                    borderWidth: isActive ? 1.5 : 1,
                  },
                ]}
              >
                {/* Header row: Tier Badge, Label, Status Pill */}
                <View style={styles.tierCardHeader}>
                  <View style={[styles.tierIconBox, { backgroundColor: `${tierAccent}18` }]}>
                    {t.tier === 3 ? (
                      <Sparkles size={20} color={tierAccent} />
                    ) : t.tier === 2 ? (
                      <ShieldCheck size={20} color={tierAccent} />
                    ) : (
                      <Shield size={20} color={tierAccent} />
                    )}
                  </View>

                  <View style={styles.tierTitleWrap}>
                    <Text style={[styles.tierTitleText, { color: palette.text }]}>{t.label}</Text>
                    <Text style={[styles.tierReqText, { color: palette.textSecondary }]}>{t.requirement}</Text>
                  </View>

                  {isActive ? (
                    <View style={[styles.statusBadgePill, { backgroundColor: `${tierAccent}22`, borderColor: tierAccent }]}>
                      <View style={[styles.statusBadgeDot, { backgroundColor: tierAccent }]} />
                      <Text style={[styles.statusBadgeText, { color: tierAccent }]}>CURRENT</Text>
                    </View>
                  ) : isUnlocked ? (
                    <View style={[styles.statusBadgePill, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: '#30D158' }]}>
                      <CheckCircle2 size={12} color="#30D158" />
                      <Text style={[styles.statusBadgeText, { color: '#30D158' }]}>UNLOCKED</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadgePill, { backgroundColor: isLight(palette.bg) ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', borderColor: palette.border }]}>
                      <Lock size={12} color={palette.textSecondary} />
                      <Text style={[styles.statusBadgeText, { color: palette.textSecondary }]}>LOCKED</Text>
                    </View>
                  )}
                </View>

                {/* Limit Callout Banner */}
                <View
                  style={[
                    styles.limitBanner,
                    {
                      backgroundColor: isActive
                        ? `${tierAccent}12`
                        : isLight(palette.bg)
                        ? 'rgba(0,0,0,0.02)'
                        : 'rgba(255,255,255,0.03)',
                      borderColor: isActive ? `${tierAccent}30` : palette.border,
                    },
                  ]}
                >
                  <View>
                    <Text style={[styles.limitBannerLabel, { color: palette.textSecondary }]}>Daily Limit</Text>
                    <Text style={[styles.limitBannerValue, { color: isActive ? tierAccent : palette.text }]}>
                      {formatNaira(t.limit)}
                    </Text>
                  </View>

                  {isNext && (
                    <Pressable
                      onPress={() => router.push('/settings/kyc')}
                      style={({ pressed }) => [
                        styles.inlineUpgradeBtn,
                        { backgroundColor: palette.primary },
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <Zap size={14} color="#FFF" />
                      <Text style={styles.inlineUpgradeBtnText}>Upgrade</Text>
                      <ChevronRight size={14} color="#FFF" />
                    </Pressable>
                  )}
                </View>

                {/* Description */}
                <Text style={[styles.tierCardDesc, { color: palette.textSecondary }]}>
                  {t.description}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.lg },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  limitValue: { fontSize: 30, fontFamily: Typography.family.bold, letterSpacing: -0.8 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierPillText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  progressWrap: { gap: 8 },
  progressBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  resetHint: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.sm, borderRadius: 10, borderWidth: 1 },
  resetHintText: { fontSize: Typography.xs, fontFamily: Typography.family.regular },

  sectionHeaderRow: { gap: 2 },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sectionSubtitle: { fontSize: Typography.xs, fontFamily: Typography.family.regular },

  tierCardsContainer: { gap: 14 },
  tierCard: { borderRadius: 24, padding: Spacing.lg, gap: 12 },
  tierCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierIconBox: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tierTitleWrap: { flex: 1, gap: 2 },
  tierTitleText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  tierReqText: { fontSize: Typography.xs, fontFamily: Typography.family.medium },

  statusBadgePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  statusBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontFamily: Typography.family.bold, letterSpacing: 0.5 },

  limitBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  limitBannerLabel: { fontSize: Typography.xs, fontFamily: Typography.family.regular, textTransform: 'uppercase', letterSpacing: 0.5 },
  limitBannerValue: { fontSize: 20, fontFamily: Typography.family.bold, letterSpacing: -0.4, marginTop: 2 },

  inlineUpgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  inlineUpgradeBtnText: { color: '#FFF', fontSize: Typography.xs, fontFamily: Typography.family.bold },

  tierCardDesc: { fontSize: Typography.xs, fontFamily: Typography.family.regular, lineHeight: 18 },
});
