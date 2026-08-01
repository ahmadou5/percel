import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, TrendingUp, Download, Eye, EyeOff, Bell, Car, Send, PlusCircle, Smartphone, Wifi } from 'lucide-react-native';

import { Text } from '@/components/Themed';
import { useWallet } from '@/hooks/useWallet';
import { useAppPalette, hexToRgba } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import { useDriverStore } from '@/store/driver.store';

import { PayoutModal } from '@/components/wallet/PayoutModal';

const periods = ['Today', 'This Week', 'This Month'] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'D';
}

export default function EarningsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<(typeof periods)[number]>('This Week');
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const walletQuery = useWallet();
  const wallet = walletQuery.data;
  const transactions = wallet?.transactions ?? [];
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const driver = useDriverStore((s) => s.driver);
  const user = useDriverStore((s) => s.user);

  const totals = useMemo(() => {
    const isWithinPeriod = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      if (period === 'Today') {
        return date.toDateString() === now.toDateString();
      }
      if (period === 'This Week') {
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return date >= startOfWeek;
      }
      if (period === 'This Month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= startOfMonth;
      }
      return true;
    };

    const earned = transactions
      .filter((tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT' && isWithinPeriod(tx.createdAt))
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const commission = transactions
      .filter((tx) => tx.category === 'COMMISSION' && tx.type === 'DEBIT' && isWithinPeriod(tx.createdAt))
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const trips = transactions.filter(
      (tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT' && isWithinPeriod(tx.createdAt)
    ).length;

    return { earned, commission, net: earned - commission, trips };
  }, [transactions, period]);

  // Build last-7-days bar data from real transactions
  const earningsByDay = useMemo(() => {
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Build a map: dateString -> total earned that day
    const map = new Map<string, number>();
    transactions
      .filter((tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT')
      .forEach((tx) => {
        const d = new Date(tx.createdAt);
        const key = d.toDateString();
        map.set(key, (map.get(key) ?? 0) + Number(tx.amount));
      });

    // Generate the last 7 calendar days (oldest → newest)
    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: DAY_LABELS[d.getDay()],
        value: map.get(d.toDateString()) ?? 0,
      };
    });

    // If there's genuinely no data at all (wallet not loaded / no transactions), keep zeros visible
    return bars;
  }, [transactions]);

  const chartMax = Math.max(...earningsByDay.map((b) => b.value), 1);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting header ───────────────────────────────── */}
        <View style={styles.topRow}>
          <View style={styles.greetingRow}>
            <View>
              <Text style={[styles.greetingEye, { color: palette.textSecondary }]}>Hello</Text>
              <Text style={[styles.greetingName, { color: palette.text }]}>
                {user?.fullName?.split(' ')[0] ?? 'Driver'}!
              </Text>
            </View>
          </View>

        </View>

        {/* ── Balance hero — single CTA ─────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.10)' }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />
          {/* Balance + single withdraw CTA on same row */}
          <View style={styles.heroBalanceRow}>
            <View style={styles.balanceBlock}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balanceValue}>
                {balanceHidden ? '••••••••' : wallet ? formatCurrency(wallet.balance) : '---'}
              </Text>
            </View>
            <Pressable
              onPress={() => setPayoutModalVisible(true)}
              style={[styles.cashOutBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            >
              <Download size={14} color="#fff" />
              <Text style={styles.cashOutText}>Withdraw →</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Quick Actions Grid ──────────────────────────────── */}
        <View style={styles.quickActionsGrid}>
          <Pressable
            onPress={() => router.push('/(tabs)/wallet/transfer')}
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
              <Send size={20} color={palette.primary} />
            </View>
            <Text style={[styles.actionLabelText, { color: palette.text }]}>Transfer</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/wallet/topup')}
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: hexToRgba('#30D158', 0.12) }]}>
              <PlusCircle size={20} color="#30D158" />
            </View>
            <Text style={[styles.actionLabelText, { color: palette.text }]}>Top Up</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/wallet/airtime')}
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: hexToRgba('#FF9500', 0.12) }]}>
              <Smartphone size={20} color="#FF9500" />
            </View>
            <Text style={[styles.actionLabelText, { color: palette.text }]}>Airtime</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/wallet/data')}
            style={({ pressed }) => [
              styles.actionItem,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: hexToRgba('#AF52DE', 0.12) }]}>
              <Wifi size={20} color="#AF52DE" />
            </View>
            <Text style={[styles.actionLabelText, { color: palette.text }]}>Data</Text>
          </Pressable>
        </View>

        {/* ── Period selector ───────────────────────────────── */}
        <View style={styles.segmentRow}>
          {periods.map((item) => {
            const isActive = period === item;
            return (
              <Pressable
                key={item}
                onPress={() => setPeriod(item)}
                style={[
                  styles.segment,
                  {
                    backgroundColor: isActive ? palette.primary : palette.card,
                    borderColor: isActive ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text style={[styles.segmentText, { color: isActive ? '#fff' : palette.textSecondary, fontFamily: Typography.family.semibold }]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Bento stats grid ──────────────────────────────── */}
        <View style={styles.bentoGrid}>
          {/* Left: tall card = most important number */}
          <View style={styles.bentoLeft}>
            <View style={[styles.bentoCardTall, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.bentoLabel, { color: palette.textSecondary }]}>Net payout</Text>
              <Text style={[styles.bentoValueLarge, { color: palette.primary }]}>
                {formatCurrency(totals.net)}
              </Text>
              <View style={[styles.bentoDivider, { backgroundColor: palette.border }]} />
              <Text style={[styles.bentoLabel, { color: palette.textSecondary }]}>Gross</Text>
              <Text style={[styles.bentoValueSmall, { color: palette.text }]}>
                {formatCurrency(totals.earned)}
              </Text>
            </View>
          </View>

          {/* Right: 3 stacked smaller cards */}
          <View style={styles.bentoRight}>
            <View style={[styles.bentoCardSmall, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.bentoLabel, { color: palette.textSecondary }]}>Rating</Text>
              <Text style={[styles.bentoValueMid, { color: palette.text }]}>
                {driver?.rating != null ? driver.rating.toFixed(1) : '---'}
              </Text>
            </View>

            <View style={[styles.bentoCardSmall, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.bentoLabel, { color: palette.textSecondary }]}>
                {period === 'Today' ? 'Trips today' : period === 'This Week' ? 'Trips this week' : 'Trips this month'}
              </Text>
              <Text style={[styles.bentoValueMid, { color: palette.text }]}>{totals.trips}</Text>
            </View>
          </View>
        </View>

        {/* ── Vehicle context card ──────────────────────────── */}
        <View style={[styles.vehicleCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.vehicleIconWrap, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
            <Car size={22} color={palette.primary} />
          </View>
          <View style={styles.vehicleCopy}>
            <Text style={[styles.bentoLabel, { color: palette.textSecondary }]}>Your vehicle</Text>
            <Text style={[styles.vehicleName, { color: palette.text }]}>
              {driver?.vehicleType ?? 'Vehicle'} • {driver?.vehiclePlate ?? '---'}
            </Text>
          </View>
          <View style={[styles.vehicleStatusDot, { backgroundColor: '#30D158' }]} />
        </View>

        {/* ── Bar chart with y-axis labels ──────────────────── */}
        <View style={[styles.chartCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Daily income</Text>
            <Text style={[styles.sectionCaption, { color: palette.textSecondary }]}>Last 7 days</Text>
          </View>

          <View style={styles.chartArea}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              <Text style={[styles.yAxisLabel, { color: palette.textSecondary }]}>
                ₦{Math.round(chartMax / 1000)}k
              </Text>
              <Text style={[styles.yAxisLabel, { color: palette.textSecondary }]}>
                ₦{Math.round(chartMax / 2000)}k
              </Text>
              <Text style={[styles.yAxisLabel, { color: palette.textSecondary }]}>0</Text>
            </View>

            <View style={styles.chartRow}>
              {earningsByDay.map((bar, idx) => {
                const isSelected = selectedBar === idx;
                const heightPct = Math.max(0.04, bar.value / chartMax);
                return (
                  <Pressable
                    key={bar.label}
                    style={styles.barWrap}
                    onPress={() => setSelectedBar(isSelected ? null : idx)}
                  >
                    <View style={{ flex: 1, width: '100%', position: 'relative', alignItems: 'center' }}>
                      {/* Tooltip bubble — positioned dynamically at the top of the filled bar */}
                      {isSelected && (
                        <View style={[styles.tooltip, { backgroundColor: palette.primary, bottom: `${heightPct * 100}%`, marginBottom: 6 }]}>
                          <Text style={styles.tooltipText}>
                            {bar.value > 0 ? formatCurrency(bar.value) : '₦0'}
                          </Text>
                          <View style={[styles.tooltipArrow, { borderTopColor: palette.primary }]} />
                        </View>
                      )}
                      <View
                        style={[
                          styles.barTrack,
                          {
                            backgroundColor: isSelected
                              ? hexToRgba(palette.primary, 0.2)
                              : hexToRgba(palette.primary, 0.1),
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.bar,
                            {
                              backgroundColor: isSelected ? palette.text : palette.primary,
                              height: `${heightPct * 100}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.barLabel,
                        { color: isSelected ? palette.primary : palette.textSecondary,
                          fontFamily: isSelected ? Typography.family.bold : Typography.family.semibold },
                      ]}
                    >
                      {bar.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Recent transactions ───────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: palette.text, paddingHorizontal: 4 }]}>Recent Activity</Text>

        <View style={[styles.listCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {transactions.slice(0, 5).map((tx, index) => (
            <View
              key={tx.id}
              style={[
                styles.transactionRow,
                index < Math.min(4, transactions.length - 1) && {
                  borderBottomWidth: 1,
                  borderBottomColor: palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.txIconWrap,
                  { backgroundColor: tx.type === 'CREDIT' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)' },
                ]}
              >
                {tx.type === 'CREDIT' ? (
                  <TrendingUp size={18} color="#30D158" />
                ) : (
                  <CreditCard size={18} color="#FF453A" />
                )}
              </View>
              <View style={styles.transactionCopy}>
                <Text style={[styles.txTitle, { color: palette.text }]} numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text style={[styles.txMeta, { color: palette.textSecondary }]}>
                  {new Date(tx.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? '#30D158' : palette.text }]}>
                {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          ))}
          {transactions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: palette.textSecondary }]}>No recent transactions</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <PayoutModal
        visible={payoutModalVisible}
        onClose={() => setPayoutModalVisible(false)}
        availableBalance={wallet?.balance ?? 0}
        onSuccess={() => void walletQuery.refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },

  // header
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 16, fontFamily: Typography.family.bold },
  greetingEye: { fontSize: 12, fontFamily: Typography.family.semibold },
  greetingName: { fontSize: 20, fontFamily: Typography.family.bold },
  bellBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // hero
  heroCard: { borderRadius: 32, padding: 24, borderWidth: 1, overflow: 'hidden', gap: 20 },
  heroDecorA: { position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroDecorB: { position: 'absolute', bottom: -60, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
  currencyPill: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  currencyText: { color: '#fff', fontSize: 12, fontFamily: Typography.family.bold },
  eyeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroBalanceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', zIndex: 2 },
  balanceBlock: { gap: 4 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: Typography.family.semibold },
  balanceValue: { color: '#fff', fontSize: 34, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  cashOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  cashOutText: { color: '#fff', fontSize: 13, fontFamily: Typography.family.bold },

  // quick actions
  quickActionsGrid: { flexDirection: 'row', gap: 10 },
  actionItem: { flex: 1, borderRadius: 20, borderWidth: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabelText: { fontSize: 12, fontFamily: Typography.family.semibold },

  // period
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  segmentText: { fontSize: 13, fontFamily: Typography.family.semibold },

  // bento
  bentoGrid: { flexDirection: 'row', gap: 12, height: 220 },
  bentoLeft: { flex: 1.1 },
  bentoRight: { flex: 1, gap: 10 },
  bentoCardTall: { flex: 1, borderRadius: 28, borderWidth: 1, padding: 20, justifyContent: 'center', gap: 6 },
  bentoCardSmall: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', gap: 2 },
  bentoLabel: { fontSize: 11, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0 },
  bentoValueLarge: { fontSize: 26, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  bentoValueMid: { fontSize: 22, fontFamily: Typography.family.bold },
  bentoValueSmall: { fontSize: 16, fontFamily: Typography.family.bold },
  bentoDivider: { height: 1, marginVertical: 8 },

  // vehicle
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, borderWidth: 1, padding: 18 },
  vehicleIconWrap: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  vehicleCopy: { flex: 1, gap: 3 },
  vehicleName: { fontSize: 15, fontFamily: Typography.family.bold },
  vehicleStatusDot: { width: 8, height: 8, borderRadius: 4 },

  // chart
  chartCard: { borderRadius: 28, borderWidth: 1, padding: 24, gap: 16 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 18, fontFamily: Typography.family.bold },
  sectionCaption: { fontSize: 13, fontFamily: Typography.family.semibold },
  chartArea: { flexDirection: 'row', gap: 8, height: 140 },
  yAxis: { justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 20 },
  yAxisLabel: { fontSize: 10, fontFamily: Typography.family.semibold },
  chartRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  barWrap: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  barTrack: { flex: 1, width: '100%', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 10 },
  barLabel: { fontSize: 10, fontFamily: Typography.family.bold },

  // tooltips
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Typography.family.bold,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  // transactions
  listCard: { borderRadius: 28, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 20 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  txIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  transactionCopy: { flex: 1, gap: 4 },
  txTitle: { fontSize: 15, fontFamily: Typography.family.bold },
  txMeta: { fontSize: 13, fontFamily: Typography.family.regular },
  txAmount: { fontSize: 16, fontFamily: Typography.family.bold },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyStateText: { fontSize: 14, fontFamily: Typography.family.semibold },
});