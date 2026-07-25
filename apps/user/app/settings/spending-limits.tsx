import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useAppPalette, isLight } from '@/lib/theme';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { ChevronRight, CreditCard, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react-native';
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
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Verification Tiers</Text>
        <View style={[styles.tiersCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {TIERS.map((t, idx) => {
            const isActive = t.tier === currentTier;
            const isDone = t.tier < currentTier;
            const isNext = t.tier === currentTier + 1;
            const itemColor = t.tier === 3 ? '#30D158' : (t.tier === 2 ? palette.primary : '#8E8E93');
            return (
              <View key={t.tier}>
                <View style={[styles.tierRow, isActive && { backgroundColor: itemColor + '11', borderRadius: 16, paddingHorizontal: 8 }]}>
                  <View style={[styles.tierIconWrap, { backgroundColor: (isDone || isActive) ? itemColor + '22' : palette.bg, borderColor: (isDone || isActive) ? itemColor : palette.border }]}>
                    {isDone
                      ? <CheckCircle2 size={18} color={itemColor} />
                      : isActive
                        ? <View style={[styles.activeDot, { backgroundColor: itemColor }]} />
                        : <View style={[styles.emptyDot, { borderColor: palette.border }]} />
                    }
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.tierRowTop}>
                      <Text style={[styles.tierLabel, { color: isActive || isDone ? palette.text : palette.textSecondary }]}>{t.label}</Text>
                      <Text style={[styles.tierLimitText, { color: isActive ? itemColor : palette.textSecondary }]}>{formatNaira(t.limit)}/day</Text>
                    </View>
                    <Text style={[styles.tierReq, { color: palette.textSecondary }]}>{t.requirement}</Text>
                    {isNext && (
                      <Text style={[styles.tierHint, { color: itemColor }]}>{t.description}</Text>
                    )}
                  </View>
                </View>
                {idx < TIERS.length - 1 && <View style={[styles.tierDivider, { backgroundColor: palette.border }]} />}
              </View>
            );
          })}
        </View>

        {/* Upgrade CTA */}
        {!isTier3 && (
          <Pressable
            onPress={() => router.push('/settings/kyc')}
            style={({ pressed }) => [styles.upgradeCta, { backgroundColor: palette.primary }, pressed && { opacity: 0.88 }]}
          >
            <Zap size={20} color="#fff" />
            <Text style={styles.upgradeCtaText}>
              {isTier2 ? 'Add NIN to unlock Tier 3 (₦5,000,000/day)' : 'Start KYC to unlock Tier 2 (₦200,000/day)'}
            </Text>
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}
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

  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  tiersCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.md, gap: 0 },
  tierRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: Spacing.md },
  tierIconWrap: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  emptyDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  tierRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierLabel: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  tierLimitText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  tierReq: { fontSize: Typography.xs, lineHeight: 16 },
  tierHint: { fontSize: Typography.xs, lineHeight: 16, fontFamily: Typography.family.medium, marginTop: 2 },
  tierDivider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },

  upgradeCta: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: Spacing.lg, minHeight: 58 },
  upgradeCtaText: { flex: 1, color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold, lineHeight: 18 },
});
