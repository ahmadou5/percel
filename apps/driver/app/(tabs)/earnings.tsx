import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, TrendingUp, History, Download, Eye, EyeOff } from 'lucide-react-native';

import { Pill, Screen } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useWallet } from '@/hooks/useWallet';
import { demoEarningsByDay, demoWallet } from '@/lib/demo-data';
import { useAppPalette } from '@/lib/theme';
import { formatNaira } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

const periods = ['Today', 'This Week', 'This Month'] as const;

export default function EarningsScreen() {
  const [period, setPeriod] = useState<(typeof periods)[number]>('This Week');
  const [balanceHidden, setBalanceHidden] = useState(false);
  const walletQuery = useWallet();
  const wallet = walletQuery.data ?? demoWallet;
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();

  const totals = useMemo(() => {
    const earned = wallet.transactions.filter((tx) => tx.category === 'ORDER_EARNING' && tx.type === 'CREDIT').reduce((sum, tx) => sum + tx.amount, 0);
    const commission = wallet.transactions.filter((tx) => tx.category === 'COMMISSION' && tx.type === 'DEBIT').reduce((sum, tx) => sum + tx.amount, 0);
    return {
      earned,
      commission,
      net: earned - commission,
    };
  }, [wallet.transactions]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        
        {/* Wallet Hero */}
        <View style={styles.heroWrap}>
          <View style={[styles.heroCard, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.10)' }]}>
            <View style={styles.heroDecorA} />
            <View style={styles.heroDecorB} />
            <View style={styles.heroHeader}>
              <View style={styles.currencyPill}>
                <Text style={styles.currencyText}>NGN Wallet</Text>
              </View>
              <Pressable onPressIn={() => void haptics.tap()} onPress={() => setBalanceHidden((value) => !value)} style={styles.eyeButton} hitSlop={10}>
                {balanceHidden ? <EyeOff size={18} color="#fff" /> : <Eye size={18} color="#fff" />}
              </Pressable>
            </View>

            <View style={styles.balanceBlock}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Text style={styles.balanceValue}>{balanceHidden ? '••••••••' : formatNaira(wallet.realBalance)}</Text>
            </View>

            <View style={styles.heroActions}>
              <Pressable onPressIn={() => void haptics.press()} style={styles.heroAction}>
                <Download size={16} color="#fff" />
                <Text style={styles.heroActionText}>Withdraw</Text>
              </Pressable>
              <Pressable onPressIn={() => void haptics.press()} style={styles.heroAction}>
                <History size={16} color="#fff" />
                <Text style={styles.heroActionText}>History</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.segmentRow}>
          {periods.map((item) => {
            const isActive = period === item;
            return (
              <Pressable 
                key={item} 
                onPress={() => setPeriod(item)} 
                style={[
                  styles.segment, 
                  { backgroundColor: isActive ? palette.primary : palette.card, borderColor: isActive ? palette.primary : palette.border }
                ]}
              >
                <Text style={[styles.segmentText, { color: isActive ? '#061423' : palette.textSecondary, fontWeight: isActive ? '800' : '600' }]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Metrics */}
        <View style={styles.metricRow}>
          <View style={[styles.statChip, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.statChipLabel, { color: palette.textSecondary }]}>Gross earnings</Text>
            <Text style={[styles.statChipValue, { color: palette.text }]}>{formatNaira(totals.earned)}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.statChipLabel, { color: palette.textSecondary }]}>Net payout</Text>
            <Text style={[styles.statChipValue, { color: palette.primary }]}>{formatNaira(totals.net)}</Text>
          </View>
        </View>

        {/* Charts */}
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Earnings breakdown</Text>
            <Text style={[styles.sectionCaption, { color: palette.textSecondary }]}>Last 7 days</Text>
          </View>
          
          <View style={styles.chartRow}>
            {demoEarningsByDay.map((bar) => (
              <View key={bar.label} style={styles.barWrap}>
                <View style={[styles.bar, { backgroundColor: palette.primary, height: Math.max(24, (bar.value / 22000) * 120) }]} />
                <Text style={[styles.barLabel, { color: palette.textSecondary }]}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Activity</Text>
        </View>
        
        <View style={[styles.listCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {wallet.transactions.slice(0, 5).map((tx, index) => (
            <View key={tx.id} style={[styles.transactionRow, index < Math.min(4, wallet.transactions.length - 1) && { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
              <View style={[styles.txIconWrap, { backgroundColor: tx.type === 'CREDIT' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)' }]}>
                {tx.type === 'CREDIT' ? <TrendingUp size={18} color="#30D158" /> : <CreditCard size={18} color="#FF453A" />}
              </View>
              <View style={styles.transactionCopy}>
                <Text style={[styles.txTitle, { color: palette.text }]} numberOfLines={1}>{tx.description}</Text>
                <Text style={[styles.txMeta, { color: palette.textSecondary }]}>{new Date(tx.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? '#30D158' : palette.text }]}>
                {tx.type === 'CREDIT' ? '+' : '-'}{formatNaira(tx.amount)}
              </Text>
            </View>
          ))}
          {wallet.transactions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: palette.textSecondary }]}>No recent transactions</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 120 },
  heroWrap: { marginBottom: 8 },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecorA: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecorB: {
    position: 'absolute',
    bottom: -60,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 2,
  },
  currencyPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  currencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBlock: {
    gap: 6,
    marginBottom: 28,
    zIndex: 2,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 2,
  },
  heroAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    borderRadius: 16,
  },
  heroActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentText: { fontSize: 13 },
  metricRow: { flexDirection: 'row', gap: 12 },
  statChip: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 6,
  },
  statChipLabel: { fontSize: 12, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 },
  statChipValue: { fontSize: 24, fontWeight: '800' },
  sectionCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    gap: 20,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionHeaderWrap: { marginTop: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionCaption: { fontSize: 13, fontWeight: '600' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 160 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8, height: '100%' },
  bar: { width: '100%', borderRadius: 14 },
  barLabel: { fontSize: 11, fontWeight: '700' },
  listCard: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
  },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionCopy: { flex: 1, gap: 4 },
  txTitle: { fontSize: 15, fontWeight: '700' },
  txMeta: { fontSize: 13 },
  txAmount: { fontSize: 16, fontWeight: '800' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyStateText: { fontSize: 14, fontWeight: '600' },
});
