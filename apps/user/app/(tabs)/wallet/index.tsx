import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Device from 'expo-device';
import * as ScreenCapture from 'expo-screen-capture';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { BalanceCard } from '@/components/wallet/BalanceCard';
import { TransactionItem } from '@/components/wallet/TransactionItem';
import { formatNaira, safeBalance } from '@/lib/wallet';
import { useAuthStore } from '@/store/auth.store';
import { useTransactions, useWallet } from '@/hooks/useWallet';

const quickActions = [
  { label: 'Top up', icon: 'plus-circle', href: '/wallet/topup' },
  { label: 'Transfer', icon: 'send', href: '/wallet/transfer' },
  { label: 'Bills', icon: 'bolt', href: '/wallet/bills' },
  { label: 'History', icon: 'list', href: '/wallet/transactions' },
] as const;

export default function WalletScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const walletQuery = useWallet();
  const transactionsQuery = useTransactions({ limit: 5 });

  const wallet = walletQuery.data;
  const recentTransactions = useMemo(
    () => transactionsQuery.data?.pages.flatMap((page) => page.data).slice(0, 5) ?? wallet?.transactions ?? [],
    [transactionsQuery.data, wallet?.transactions],
  );

  const balance = safeBalance(wallet?.balance);
  const totalTx = transactionsQuery.data?.pages[0]?.pagination.total ?? wallet?.transactions?.length ?? 0;

  useEffect(() => {
    if (!Device.isDevice) {
      Alert.alert('Security warning', 'Use a physical device for wallet actions when possible.');
    }

    void ScreenCapture.preventScreenCaptureAsync();
    return () => {
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  if (walletQuery.isLoading && !wallet) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (walletQuery.isError || !wallet) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Wallet unavailable</Text>
        <Text style={styles.errorBody}>We could not load your wallet right now.</Text>
        <Pressable onPress={() => walletQuery.refetch()} style={styles.retry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={walletQuery.isFetching} onRefresh={() => walletQuery.refetch()} />}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Percel Wallet</Text>
        <Text style={styles.title}>Money for deliveries, transfers, and quick bills.</Text>
        <Text style={styles.subtitle}>Fast top ups, same-screen transfers, and a clean ledger so users always know where every naira moved.</Text>
      </View>

      <BalanceCard
        wallet={wallet}
        userName={user?.fullName}
        onTopUp={() => router.push('/wallet/topup')}
        onTransfer={() => router.push('/wallet/transfer')}
        onRefresh={() => walletQuery.refetch()}
        refreshing={walletQuery.isFetching}
      />

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Available</Text>
          <Text style={styles.metricValue}>{formatNaira(balance)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Recent moves</Text>
          <Text style={styles.metricValue}>{totalTx}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
      </View>
      <View style={styles.actionGrid}>
        {quickActions.map((action) => (
          <Pressable key={action.label} onPress={() => router.push(action.href)} style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <FontAwesome name={action.icon as keyof typeof FontAwesome.glyphMap} color={Colors.light.primary} size={18} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        <Pressable onPress={() => router.push('/wallet/transactions')}>
          <Text style={styles.link}>See all</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {recentTransactions.length ? (
          recentTransactions.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyBody}>Your wallet activity will show up here after the first top up, transfer, or bill payment.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 30, lineHeight: 36, fontWeight: Typography.bold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.md, lineHeight: 22 },
  metricRow: { flexDirection: 'row', gap: Spacing.md },
  metricCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 4,
  },
  metricLabel: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase' },
  metricValue: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  link: { color: Colors.light.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  actionCard: {
    width: '47%',
    minHeight: 108,
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(10, 132, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.semibold },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.lg,
  },
  empty: { paddingVertical: Spacing.xl, gap: 8 },
  emptyTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  emptyBody: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  errorTitle: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  errorBody: { color: Colors.light.textSecondary, textAlign: 'center' },
  retry: { backgroundColor: Colors.light.primary, borderRadius: 14, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  retryText: { color: '#fff', fontWeight: Typography.bold },
});
