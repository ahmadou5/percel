import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedReveal } from '@/components/ui/AnimatedReveal';
import { haptics } from '@/utils/haptics';
import { Bell, ChevronDown, Eye, EyeOff, ArrowUpRight, Plus, Smartphone, Globe, Tv2, Zap, CircleHelp, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/palette';
import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira, formatTxnDate, safeBalance, titleize, type WalletTransaction } from '@/lib/wallet';
import { useAuthStore } from '@/store/auth.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { StateCard } from '@/components/ui/StateCard';
import { useTransactions, useWallet } from '@/hooks/useWallet';
import { useNotifications } from '@/hooks/useNotifications';
import { SkeletonGroup } from '@/components/ui/Skeleton';

const quickActions = [
  { label: 'Airtime', href: '/wallet/airtime', Icon: Smartphone, bg: 'rgba(10, 132, 255, 0.14)' },
  { label: 'Data', href: '/wallet/data', Icon: Globe, bg: 'rgba(48, 209, 88, 0.14)' },
  { label: 'TV', href: '/wallet/tv', Icon: Tv2, bg: 'rgba(255, 149, 0, 0.16)' },
  { label: 'Electricity', href: '/wallet/electricity', Icon: Zap, bg: 'rgba(255, 214, 10, 0.18)' },
] as const;

const currencies = [
  { label: 'NGN Wallet', value: 'NGN' },
  { label: 'Savings', value: 'Savings' },
  { label: 'USD Wallet', value: 'USD' },
] as const;

function initialsFrom(text: string) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'P';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function TransactionRow({ transaction, palette, index }: { transaction: WalletTransaction; palette: (typeof Colors)[keyof typeof Colors]; index: number }) {
  const positive = transaction.type === 'CREDIT';
  const amount = `${positive ? '+' : '-'}${formatNaira(transaction.amount)}`;
  const avatar = positive ? '↑' : initialsFrom(transaction.description || transaction.category);

  return (
    <AnimatedReveal index={index}>
      <View style={[styles.txRow, { borderBottomColor: palette.border }]}>
      <View style={[styles.txAvatar, { backgroundColor: positive ? 'rgba(48, 209, 88, 0.14)' : 'rgba(255, 69, 58, 0.12)' }]}>
        <Text style={[styles.txAvatarText, { color: positive ? palette.success : palette.text }]}>{avatar}</Text>
      </View>
      <View style={styles.txBody}>
        <Text style={[styles.txTitle, { color: palette.text }]}>{transaction.description}</Text>
        <Text style={[styles.txMeta, { color: palette.textSecondary }]}>
          {titleize(transaction.category)} • {formatTxnDate(transaction.createdAt)}
        </Text>
      </View>
      <View style={styles.txAmountWrap}>
        <Text style={[styles.txAmount, { color: positive ? palette.success : palette.error }]}>{amount}</Text>
        <Text style={[styles.txStatus, { color: palette.textSecondary }]}>{transaction.status.toLowerCase()}</Text>
      </View>
    </View>
    </AnimatedReveal>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const notificationsEnabled = usePreferencesStore((state) => state.notificationsEnabled);
  const notificationsReminderDismissedAt = usePreferencesStore((state) => state.notificationsReminderDismissedAt);
  const setNotificationsReminderDismissedAt = usePreferencesStore((state) => state.setNotificationsReminderDismissedAt);
  const user = useAuthStore((state) => state.user);
  const walletQuery = useWallet();
  const txQuery = useTransactions({ limit: 5 });
  const notificationsQuery = useNotifications(20);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currency, setCurrency] = useState<(typeof currencies)[number]['value']>('NGN');

  const wallet = walletQuery.data;
  const unreadNotifications = notificationsQuery.data?.unreadCount ?? 0;
  const balance = safeBalance(wallet?.balance);
  const transactions = useMemo(() => txQuery.data?.pages.flatMap((page) => page.data).slice(0, 5) ?? wallet?.transactions ?? [], [txQuery.data, wallet?.transactions]);
  const refresh = () => {
    void haptics.tap();
    void walletQuery.refetch();
    void txQuery.refetch();
  };
  const hasPromptedForPin = useRef(false);
  const hasPromptedForNotifications = useRef(false);
  const [pinPromptVisible, setPinPromptVisible] = useState(false);
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const isInitialLoading = walletQuery.isLoading && !wallet;

  useEffect(() => {
    if (!walletQuery.isLoading && wallet && !wallet.walletPinSet && !hasPromptedForPin.current) {
      hasPromptedForPin.current = true;
      setPinPromptVisible(true);
    }
  }, [wallet, walletQuery.isLoading]);

  useEffect(() => {
    const dismissedAt = notificationsReminderDismissedAt ?? 0;
    const cooldownExpired = !dismissedAt || Date.now() - dismissedAt >= 24 * 60 * 60 * 1000;
    if (!notificationsEnabled && cooldownExpired && !hasPromptedForNotifications.current) {
      hasPromptedForNotifications.current = true;
      setNotificationPromptVisible(true);
    }
    if (notificationsEnabled) {
      hasPromptedForNotifications.current = false;
    }
  }, [notificationsEnabled, notificationsReminderDismissedAt]);

  if (isInitialLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.bg }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.loadingContent}>
          <SkeletonGroup style={{ gap: Spacing.lg }}>
            <View style={styles.loadingTopRow}>
              <View style={[styles.loadingAvatar, { backgroundColor: palette.card }]} />
              <View style={styles.loadingCopy}>
                <View style={[styles.loadingLine, { width: 92, backgroundColor: palette.card }]} />
                <View style={[styles.loadingLine, { width: 160, height: 20, backgroundColor: palette.card }]} />
              </View>
              <View style={[styles.loadingCircle, { backgroundColor: palette.card }]} />
            </View>

            <View style={[styles.loadingHero, { backgroundColor: palette.primaryDark }]}>
              <View style={[styles.loadingLine, { width: 112, backgroundColor: 'rgba(255,255,255,0.16)' }]} />
              <View style={[styles.loadingBalance, { width: '78%', backgroundColor: 'rgba(255,255,255,0.12)' }]} />
              <View style={styles.loadingRow}>
                <View style={[styles.loadingPill, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                <View style={[styles.loadingPill, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
              </View>
              <View style={styles.loadingRow}>
                <View style={[styles.loadingButton, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                <View style={[styles.loadingButton, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
              </View>
            </View>

            <View style={styles.loadingGrid}>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={[styles.loadingActionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <View style={[styles.loadingActionIcon, { backgroundColor: palette.bg }]} />
                  <View style={[styles.loadingLine, { width: '64%', backgroundColor: palette.bg }]} />
                </View>
              ))}
            </View>

            <View style={styles.loadingSection}>
              <View style={[styles.loadingSectionHeader, { backgroundColor: palette.card }]} />
              <View style={[styles.loadingTransactions, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.loadingSectionText, { color: palette.textSecondary }]}>Loading your wallet…</Text>
              </View>
            </View>
          </SkeletonGroup>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={walletQuery.isFetching || txQuery.isFetching} onRefresh={refresh} tintColor={palette.primary} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topRow}>
          <Pressable onPressIn={() => void haptics.tap()} onPress={() => router.push('/profile')} style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initialsFrom(user?.fullName ?? 'Percel User')}</Text>
              )}
            </View>
            <View>
              <Text style={[styles.greeting, { color: palette.textSecondary }]}>Welcome back</Text>
              <Text style={[styles.userName, { color: palette.text }]}>{user?.fullName ?? 'Percel User'}</Text>
            </View>
          </Pressable>
          <Pressable onPressIn={() => void haptics.tap()} style={[styles.bellButton, { borderColor: palette.border, backgroundColor: palette.card }]} onPress={() => router.push('/notifications')}>
            <Bell size={18} color={palette.text} />
            {unreadNotifications > 0 ? (
              <View style={[styles.badge, { backgroundColor: palette.error }]}>
                <Text style={styles.badgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.heroWrap}>
          <View style={[styles.heroCard, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.10)' }]}>
            <View style={styles.heroDecorA} />
            <View style={styles.heroDecorB} />
            <View style={styles.heroHeader}>
              <Pressable onPressIn={() => void haptics.tap()} style={styles.currencyPill} onPress={() => setCurrencyOpen(true)}>
                <Text style={styles.currencyText}>🇳🇬 {currencies.find((item) => item.value === currency)?.label ?? 'NGN Wallet'}</Text>
                <ChevronDown size={16} color="#fff" />
              </Pressable>
              <Pressable onPressIn={() => void haptics.tap()} onPress={() => setBalanceHidden((value) => !value)} style={styles.eyeButton} hitSlop={10}>
                {balanceHidden ? <EyeOff size={18} color="#fff" /> : <Eye size={18} color="#fff" />}
              </Pressable>
            </View>

            <View style={styles.balanceBlock}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balanceValue}>{balanceHidden ? '••••••••' : formatNaira(balance)}</Text>
            </View>

            <View style={styles.heroMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>NUBAN</Text>
                <Text style={styles.metaValue}>{wallet?.nuban ?? '--- --- ---'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Bank</Text>
                <Text style={styles.metaValue}>{wallet?.bankName ?? '---'}</Text>
              </View>
            </View>

            <View style={styles.heroActions}>
              <Pressable onPressIn={() => void haptics.press()} style={styles.heroAction} onPress={() => router.push('/wallet/topup')}>
                <Plus size={16} color="#fff" />
                <Text style={styles.heroActionText}>Deposit</Text>
              </Pressable>
              <Pressable onPressIn={() => void haptics.press()} style={styles.heroAction} onPress={() => router.push('/wallet/transfer')}>
                <ArrowUpRight size={16} color="#fff" />
                <Text style={styles.heroActionText}>Transfer</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick actions</Text>
          <Text style={[styles.sectionLink, { color: palette.textSecondary }]}>Bills & top ups</Text>
        </View>
        <View style={styles.quickGrid}>
          {quickActions.map(({ label, href, Icon }) => (
            <Pressable key={label} onPressIn={() => void haptics.tap()} onPress={() => router.push(href as never)} style={({ pressed }) => [styles.quickCard, { backgroundColor: palette.card, borderColor: palette.border, opacity: pressed ? 0.94 : 1 } ]}>
              <View style={[styles.quickIcon, {  borderColor: palette.primaryDark }]}>
                <Icon size={19} color={palette.primary} />
              </View>
              <Text style={[styles.quickLabel, { color: palette.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Transactions</Text>
          <Pressable onPress={() => router.push('/wallet/transactions')}>
            <Text style={[styles.sectionLink, { color: palette.textSecondary }]}>View all</Text>
          </Pressable>
        </View>

        <View style={[styles.transactionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {txQuery.isLoading && !transactions.length ? (
            <StateCard
              loading
              title="Loading transactions"
              description="We’re fetching your latest activity and payment history."
              icon={<CircleHelp size={24} color={palette.textSecondary} />}
            />
          ) : transactions.length ? (
            transactions.map((transaction, index) => <TransactionRow key={transaction.id} transaction={transaction} index={index} palette={palette} />)
          ) : (
            <StateCard
              title="No transactions yet"
              description="Your deposits, transfers, and bill payments will appear here."
              icon={<CircleHelp size={24} color={palette.textSecondary} />}
              actionLabel="Refresh"
              onActionPress={refresh}
            />
          )}
        </View>

      </ScrollView>

      <Modal transparent visible={pinPromptVisible} animationType='fade' onRequestClose={() => setPinPromptVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPinPromptVisible(false)} />
          <View style={[styles.pinSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.pinIcon, { backgroundColor: palette.primary }]}>
              <ShieldCheck size={18} color={palette.card} />
            </View>
            <Text style={[styles.pinTitle, { color: palette.text }]}>Set your PIN</Text>
            <Text style={[styles.pinBody, { color: palette.textSecondary }]}>You haven’t set a transfer PIN yet. Set one now to turn on app lock and protect your wallet.</Text>
            <View style={styles.pinActions}>
              <Pressable onPress={() => setPinPromptVisible(false)} style={[styles.pinSecondary, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <Text style={[styles.pinSecondaryText, { color: palette.text }]}>Later</Text>
              </Pressable>
              <Pressable onPress={() => { setPinPromptVisible(false); router.push('/profile/security'); }} style={[styles.pinPrimary, { backgroundColor: palette.primary }]}>
                <Text style={[styles.pinPrimaryText, { color: palette.card }]}>Set PIN</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={notificationPromptVisible} transparent animationType="fade" onRequestClose={() => setNotificationPromptVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNotificationPromptVisible(false)} />
          <View style={[styles.notificationSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.pinIcon, { backgroundColor: palette.primary }]}>
              <Bell size={18} color={palette.card} />
            </View>
            <Text style={[styles.pinTitle, { color: palette.text }]}>Keep delivery alerts on</Text>
            <Text style={[styles.pinBody, { color: palette.textSecondary }]}>Get delivery updates and payment alerts. You can turn them off later from settings.</Text>
            <View style={styles.pinActions}>
              <Pressable onPress={async () => { await setNotificationsReminderDismissedAt(Date.now()); setNotificationPromptVisible(false); }} style={[styles.pinSecondary, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <Text style={[styles.pinSecondaryText, { color: palette.text }]}>Maybe Later</Text>
              </Pressable>
              <Pressable onPress={() => { setNotificationPromptVisible(false); router.push('/settings/notifications'); }} style={[styles.pinPrimary, { backgroundColor: palette.primary }]}>
                <Text style={[styles.pinPrimaryText, { color: palette.card }]}>Enable Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={currencyOpen} animationType="fade" onRequestClose={() => setCurrencyOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCurrencyOpen(false)} />
          <View style={[styles.currencySheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Choose wallet</Text>
            {currencies.map((item) => {
              const active = item.value === currency;
              return (
                <Pressable key={item.value} onPress={() => { setCurrency(item.value); setCurrencyOpen(false); }} style={[styles.currencyRow, active ? { backgroundColor: 'rgba(10,132,255,0.10)' } : null]}>
                  <Text style={[styles.currencyRowLabel, { color: palette.text }]}>{item.label}</Text>
                  {active ? <Text style={[styles.currencyRowMeta, { color: palette.primary }]}>Selected</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl, paddingBottom: Spacing.huge + 80, gap: Spacing.lg },
  loadingContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl, paddingBottom: Spacing.huge + 80, gap: Spacing.lg },
  loadingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadingAvatar: { width: 44, height: 44, borderRadius: 22 },
  loadingCopy: { flex: 1, gap: 8 },
  loadingLine: { height: 14, borderRadius: 999 },
  loadingCircle: { width: 42, height: 42, borderRadius: 21 },
  loadingHero: { borderRadius: 24, padding: Spacing.lg, gap: 14 },
  loadingBalance: { height: 48, borderRadius: 16 },
  loadingRow: { flexDirection: 'row', gap: 10 },
  loadingPill: { flex: 1, height: 38, borderRadius: 999 },
  loadingButton: { flex: 1, height: 46, borderRadius: 14 },
  loadingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  loadingActionCard: { width: '47%', borderRadius: 20, borderWidth: 1, padding: Spacing.md, minHeight: 110, justifyContent: 'space-between' },
  loadingActionIcon: { width: 42, height: 42, borderRadius: 21 },
  loadingSection: { gap: 12 },
  loadingSectionHeader: { height: 22, width: 140, borderRadius: 999 },
  loadingTransactions: { minHeight: 180, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingSectionText: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontFamily: Typography.family.bold, fontSize: Typography.md },
  greeting: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.semibold },
  userName: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  bellButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, lineHeight: 12, fontFamily: Typography.family.bold },
  heroWrap: { position: 'relative' },
  heroCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, overflow: 'hidden', gap: Spacing.md },
  heroDecorA: { position: 'absolute', top: -40, right: -10, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroDecorB: { position: 'absolute', bottom: -60, left: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  currencyPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  currencyText: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  eyeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  balanceBlock: { gap: 6, zIndex: 1 },
  balanceLabel: { color: 'rgba(255,255,255,0.72)', fontSize: Typography.sm, fontFamily: Typography.family.medium, textTransform: 'uppercase', letterSpacing: 0.8 },
  balanceValue: { color: '#fff', fontSize: 42, lineHeight: 46, fontFamily: Typography.family.bold, letterSpacing: -1.6 },
  heroMeta: { flexDirection: 'row', gap: 12, zIndex: 1 },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: { color: 'rgba(255,255,255,0.56)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
  metaValue: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.semibold },
  heroActions: { flexDirection: 'row', gap: 10, zIndex: 1 },
  heroAction: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  heroActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.semibold },
  fundBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: Spacing.md, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.card },
  fundIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fundBody: { flex: 1, gap: 2 },
  fundTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  fundText: { fontSize: Typography.sm, lineHeight: 18 },
  fundLink: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  sectionLink: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { width: '47%', borderRadius: 20, borderWidth: 1, padding: Spacing.md, minHeight: 110, justifyContent: 'space-between' },
  quickIcon: { width: 42, height: 42, borderRadius: 99, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quickLabel: { fontSize: Typography.md, fontFamily: Typography.family.semibold },
  transactionCard: { borderRadius: 24, borderWidth: 1, paddingHorizontal: Spacing.md },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  txAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  txAvatarText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  txBody: { flex: 1, gap: 3 },
  txTitle: { fontSize: Typography.md, fontFamily: Typography.family.semibold },
  txMeta: { fontSize: Typography.xs },
  txAmountWrap: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  txStatus: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10 },
  emptyTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  emptyText: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.44)', padding: Spacing.lg },
  pinSheet: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  notificationSheet: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  pinIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pinTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  pinBody: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  pinActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  pinSecondary: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pinSecondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  pinPrimary: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pinPrimaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  currencySheet: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 8 },
  sheetTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, marginBottom: 4 },
  currencyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16 },
  currencyRowLabel: { fontSize: Typography.md, fontFamily: Typography.family.semibold },
  currencyRowMeta: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
});
