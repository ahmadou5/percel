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
        {/* Tier ladder - Route Card Pattern */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Verification Tiers</Text>
        <View style={[styles.tiersCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {TIERS.map((t, idx) => {
            const isActive = t.tier === currentTier;
            const isDone = t.tier < currentTier;
            const isNext = t.tier === currentTier + 1;
            const itemColor = t.tier === 3 ? '#30D158' : (t.tier === 2 ? palette.primary : '#8E8E93');
            const isLast = idx === TIERS.length - 1;

            return (
              <View key={t.tier} style={styles.tierRouteRow}>
                {/* Vertical Route Connector Column */}
                <View style={styles.routeConnectorCol}>
                  <View
                    style={[
                      styles.tierNodeBadge,
                      {
                        backgroundColor: (isDone || isActive) ? `${itemColor}1F` : palette.bg,
                        borderColor: (isDone || isActive) ? itemColor : palette.border,
                      },
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} color={itemColor} strokeWidth={2.5} />
                    ) : isActive ? (
                      <View style={[styles.activeDotInner, { backgroundColor: itemColor }]} />
                    ) : (
                      <View style={[styles.emptyDotInner, { borderColor: palette.border }]} />
                    )}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.routeConnectorLine,
                        { backgroundColor: isDone ? itemColor : palette.border },
                      ]}
                    />
                  )}
                </View>

                {/* Tier Details Column */}
                <View
                  style={[
                    styles.tierDetailsCol,
                    isActive && {
                      backgroundColor: isLight(palette.bg) ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                      borderColor: `${itemColor}44`,
                      borderWidth: 1,
                      borderRadius: 16,
                      padding: 12,
                      marginBottom: 8,
                    },
                    !isActive && !isLast && { paddingBottom: 16 },
                  ]}
                >
                  <View style={styles.tierHeaderRow}>
                    <View style={styles.tierTitleBadgeGroup}>
                      <Text style={[styles.tierLabelText, { color: isActive || isDone ? palette.text : palette.textSecondary }]}>
                        {t.label}
                      </Text>
                      {isActive && (
                        <View style={[styles.activeTagBadge, { backgroundColor: `${itemColor}22`, borderColor: itemColor }]}>
                          <Text style={[styles.activeTagBadgeText, { color: itemColor }]}>ACTIVE TIER</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.tierLimitTextVal, { color: isActive ? itemColor : palette.text }]}>
                      {formatNaira(t.limit)}<Text style={[styles.perDaySubtext, { color: palette.textSecondary }]}>/day</Text>
                    </Text>
                  </View>

                  <Text style={[styles.tierReqSub, { color: palette.textSecondary }]}>{t.requirement}</Text>
                  
                  {(isActive || isNext) && (
                    <Text style={[styles.tierDescriptionNote, { color: isActive ? palette.text : palette.textSecondary }]}>
                      {t.description}
                    </Text>
                  )}
                </View>
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
  tiersCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 0 },
  tierRouteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  routeConnectorCol: { alignItems: 'center', width: 32 },
  tierNodeBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  activeDotInner: { width: 10, height: 10, borderRadius: 5 },
  emptyDotInner: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  routeConnectorLine: { flex: 1, width: 2, marginVertical: 4, minHeight: 28 },

  tierDetailsCol: { flex: 1, gap: 4 },
  tierHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierTitleBadgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierLabelText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  activeTagBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  activeTagBadgeText: { fontSize: 9, fontFamily: Typography.family.bold, letterSpacing: 0.5 },
  tierLimitTextVal: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  perDaySubtext: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  tierReqSub: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  tierDescriptionNote: { fontSize: Typography.xs, fontFamily: Typography.family.regular, lineHeight: 18, marginTop: 2 },

  upgradeCta: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: Spacing.lg, minHeight: 58 },
  upgradeCtaText: { flex: 1, color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold, lineHeight: 18 },
});
