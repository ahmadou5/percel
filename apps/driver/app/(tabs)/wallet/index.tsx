import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  ChevronRight,
  Copy,
  CreditCard,
  Check,
  Landmark,
  Plus,
  RefreshCw,
  Smartphone,
  Tv,
  Zap,
  Phone,
  ShieldCheck,
  Wallet as WalletIcon,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransactionItem } from '@/components/wallet/TransactionItem';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useWallet } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira } from '@/lib/wallet';

let Clipboard: typeof import('expo-clipboard') | null = null;
try {
  Clipboard = require('expo-clipboard');
} catch {
  // Fallback if native module not linked
}

export default function DriverWalletHub() {
  const router = useRouter();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const walletQuery = useWallet();
  const [copied, setCopied] = useState(false);

  const wallet = walletQuery.data;
  const balance = wallet?.balance ?? 0;
  const nuban = wallet?.nuban;
  const bankName = wallet?.bankName || 'Percel Virtual Bank';
  const transactions = wallet?.transactions ?? [];

  const copyNuban = async () => {
    if (!nuban) return;
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(nuban);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(nuban);
      }
    } catch {
      // Safe fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const quickActions = [
    { label: 'Transfer', icon: ArrowUpRight, color: palette.primary, href: '/(tabs)/wallet/transfer' },
    { label: 'Top Up', icon: Plus, color: '#30D158', href: '/(tabs)/wallet/topup' },
    { label: 'Airtime', icon: Smartphone, color: '#FF9F0A', href: '/(tabs)/wallet/airtime' },
    { label: 'Data', icon: Phone, color: '#5AC8FA', href: '/(tabs)/wallet/data' },
    { label: 'Electricity', icon: Zap, color: '#FFD60A', href: '/(tabs)/wallet/electricity' },
    { label: 'TV Sub', icon: Tv, color: '#BF5AF2', href: '/(tabs)/wallet/tv' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={walletQuery.isRefetching}
            onRefresh={() => walletQuery.refetch()}
            tintColor={palette.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: palette.text }]}>Courier Wallet</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
              Manage earnings, transfers & payments
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.refreshBtn,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => walletQuery.refetch()}
          >
            <RefreshCw size={18} color={palette.text} />
          </Pressable>
        </View>

        {/* Balance Card with Virtual Account Details */}
        <View style={[styles.balanceCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <WalletIcon size={18} color={palette.primary} />
              <Text style={[styles.balanceLabel, { color: palette.textSecondary }]}>Available Balance</Text>
            </View>
            <View style={[styles.kycBadge, { backgroundColor: '#30D15815' }]}>
              <ShieldCheck size={12} color="#30D158" />
              <Text style={styles.kycBadgeText}>KYC Verified</Text>
            </View>
          </View>

          <Text style={[styles.balanceAmount, { color: palette.text }]}>
            {formatNaira(balance)}
          </Text>

          {/* Dedicated Virtual Bank Account Box */}
          <View style={[styles.nubanBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={styles.nubanInfo}>
              <Text style={[styles.nubanLabel, { color: palette.textSecondary }]}>
                Dedicated Bank Account
              </Text>
              {nuban ? (
                <View style={styles.nubanRow}>
                  <Text style={[styles.nubanNumber, { color: palette.text }]}>{nuban}</Text>
                  <Text style={[styles.bankNameText, { color: palette.primary }]}>
                    · {bankName}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.pendingNubanText, { color: palette.textSecondary }]}>
                  Generating Virtual Account…
                </Text>
              )}
            </View>

            {nuban ? (
              <Pressable
                style={({ pressed }) => [
                  styles.copyBtn,
                  { backgroundColor: palette.primary + '18' },
                  pressed && { opacity: 0.6 },
                ]}
                onPress={copyNuban}
              >
                {copied ? <Check size={14} color="#30D158" /> : <Copy size={14} color={palette.primary} />}
                <Text style={[styles.copyBtnText, { color: copied ? '#30D158' : palette.primary }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Quick Action Grid */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((action, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [
                styles.actionItem,
                { backgroundColor: palette.card, borderColor: palette.border },
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => router.push(action.href as never)}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.color + '1A' }]}>
                <action.icon size={22} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: palette.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent Transactions */}
        <View style={styles.txnHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent Transactions</Text>
          <Pressable onPress={() => router.push('/(tabs)/wallet/transactions' as never)}>
            <Text style={[styles.seeAllText, { color: palette.primary }]}>See all</Text>
          </Pressable>
        </View>

        {walletQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : transactions.length === 0 ? (
          <View style={[styles.emptyWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No transactions yet. Complete deliveries or transfer funds to get started.
            </Text>
          </View>
        ) : (
          transactions.slice(0, 5).map((txn) => <TransactionItem key={txn.id} item={txn} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
  },
  headerSubtitle: {
    fontSize: Typography.xs,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kycBadgeText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: Typography.bold,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: Typography.bold,
    marginVertical: Spacing.xs,
  },
  nubanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  nubanInfo: {
    flex: 1,
  },
  nubanLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nubanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  nubanNumber: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  bankNameText: {
    fontSize: 11,
    fontWeight: Typography.semibold,
    marginLeft: 4,
  },
  pendingNubanText: {
    fontSize: Typography.xs,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: Spacing.xs,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: Typography.bold,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  actionItem: {
    width: '31%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  seeAllText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  loadingWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyWrap: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
