import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Card, Pill, Screen, SectionHeader, StatChip } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useWallet } from '@/hooks/useWallet';
import { demoEarningsByDay, demoWallet } from '@/lib/demo-data';

const periods = ['Today', 'This Week', 'This Month'] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

export default function EarningsScreen() {
  const [period, setPeriod] = useState<(typeof periods)[number]>('This Week');
  const walletQuery = useWallet();
  const wallet = walletQuery.data ?? demoWallet;

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
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Earnings dashboard</Text>
          <Text style={styles.title}>Track payouts by day, week, and month.</Text>
          <Text style={styles.subtitle}>The summary below is ready for live wallet data and still works with the current demo dataset.</Text>
        </View>

        <View style={styles.segmentRow}>
          {periods.map((item) => (
            <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.segment, period === item ? styles.segmentActive : null]}>
              <Text style={[styles.segmentText, period === item ? styles.segmentTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.metricRow}>
          <StatChip label="Total earned" value={formatCurrency(totals.earned)} />
          <StatChip label="Net" value={formatCurrency(totals.net)} />
        </View>

        <Card>
          <SectionHeader title="Commission deducted" caption="Platform share" />
          <Text style={styles.largeValue}>{formatCurrency(totals.commission)}</Text>
          <Text style={styles.smallCopy}>Commission is separated from net earnings so the settlement balance stays easy to audit.</Text>
        </Card>

        <Card>
          <SectionHeader title="Last 7 days" caption="Manual chart" />
          <View style={styles.chartRow}>
            {demoEarningsByDay.map((bar) => (
              <View key={bar.label} style={styles.barWrap}>
                <View style={[styles.bar, { height: Math.max(24, (bar.value / 22000) * 120) }]} />
                <Text style={styles.barLabel}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <SectionHeader title="Transactions" caption="Linked to wallet" />
          {wallet.transactions.slice(0, 4).map((tx) => (
            <View key={tx.id} style={styles.transactionRow}>
              <View style={styles.transactionCopy}>
                <Text style={styles.txTitle}>{tx.description}</Text>
                <Text style={styles.txMeta}>{tx.category} · {new Date(tx.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <Pill label={tx.type === 'CREDIT' ? '+' : '-'} tone={tx.type === 'CREDIT' ? 'success' : 'danger'} />
            </View>
          ))}
        </Card>

        <Pressable style={styles.withdrawButton}>
          <Text style={styles.withdrawText}>Withdraw</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 30 },
  hero: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  eyebrow: { color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentActive: { backgroundColor: '#FDE68A', borderColor: '#FDE68A' },
  segmentText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: '#061423' },
  metricRow: { flexDirection: 'row', gap: 12 },
  largeValue: { color: '#F8FAFC', fontSize: 28, fontWeight: '800' },
  smallCopy: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 160 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8, height: '100%' },
  bar: { width: '100%', borderRadius: 14, backgroundColor: '#0A84FF' },
  barLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  transactionCopy: { flex: 1, gap: 2 },
  txTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  txMeta: { color: '#94A3B8', fontSize: 12 },
  withdrawButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FDE68A',
  },
  withdrawText: { color: '#061423', fontSize: 13, fontWeight: '800' },
});
