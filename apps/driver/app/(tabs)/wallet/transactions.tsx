import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  CreditCard,
  Landmark,
  Phone,
  Search,
  Smartphone,
  TriangleAlert,
  Tv,
  Zap,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useTransactions } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira, formatTransactionTitle, formatTxnDate, titleize, walletCategories, type WalletTransaction } from '@/lib/wallet';

// ─── helpers ────────────────────────────────────────────────────────────────

function getTxnIconBg(category: string, type: 'CREDIT' | 'DEBIT') {
  const cat = category.toUpperCase();
  if (cat === 'AIRTIME') return { bg: 'rgba(255,159,10,0.12)', color: '#FF9F0A', Icon: Smartphone };
  if (cat === 'DATA') return { bg: 'rgba(90,200,250,0.12)', color: '#5AC8FA', Icon: Phone };
  if (cat === 'ELECTRICITY') return { bg: 'rgba(255,214,10,0.12)', color: '#FFD60A', Icon: Zap };
  if (cat === 'TV') return { bg: 'rgba(191,90,242,0.12)', color: '#BF5AF2', Icon: Tv };
  if (type === 'CREDIT') return { bg: 'rgba(48,209,88,0.12)', color: '#30D158', Icon: ArrowDownLeft };
  return { bg: 'rgba(255,69,58,0.12)', color: '#FF453A', Icon: ArrowUpRight };
}

function TransactionRow({
  item,
  onPress,
  palette,
}: {
  item: WalletTransaction;
  onPress: () => void;
  palette: ReturnType<typeof useAppPalette>;
}) {
  const credit = item.type === 'CREDIT';
  const { bg, color, Icon } = getTxnIconBg(item.category, item.type);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: palette.border },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>
          {formatTransactionTitle(item.description, item.category, item.type, item.metadata)}
        </Text>
        <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
          {titleize(item.category)} • {formatTxnDate(item.createdAt)}
        </Text>
      </View>
      <View style={styles.rowAmountWrap}>
        <Text style={[styles.rowAmount, { color: credit ? '#30D158' : '#FF453A' }]}>
          {credit ? '+' : '-'}{formatNaira(item.amount)}
        </Text>
        <Text style={[styles.rowStatus, { color: palette.textSecondary }]}>
          {item.status.toLowerCase()}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function DriverTransactionsScreen() {
  const router = useRouter();
  const palette = useAppPalette();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useTransactions({ category: selectedCategory });

  const allItems = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.description.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [allItems, searchQuery]);

  const summary = useMemo(() => {
    const apiSummary = data?.pages[0]?.summary;
    if (apiSummary) return { credits: apiSummary.totalCredits, debits: apiSummary.totalDebits };
    return allItems.reduce(
      (acc, item) => {
        const amount = Number(item.amount) || 0;
        if (item.type === 'CREDIT') acc.credits += amount;
        else acc.debits += amount;
        return acc;
      },
      { credits: 0, debits: 0 },
    );
  }, [data, allItems]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>

      {/* ── scrollable header (no flex so it doesn't crush the list) ── */}
      <View style={{ flexGrow: 0, flexShrink: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.headerContent}>

          {/* back */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <ChevronLeft size={20} color={palette.text} />
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>

          {/* eyebrow */}
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>Ledger history</Text>
          </View>

          {/* credits / debits hero card */}
          <View style={[styles.summaryCard, { backgroundColor: palette.primaryDark }]}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Credits</Text>
              <Text style={styles.summaryValue}>{formatNaira(summary.credits)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Debits</Text>
              <Text style={styles.summaryValue}>{formatNaira(summary.debits)}</Text>
            </View>
          </View>

          {/* search */}
          <View style={[styles.searchWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Search size={16} color={palette.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search description, reference…"
              placeholderTextColor={palette.textSecondary}
              style={[styles.searchInput, { color: palette.text }]}
            />
          </View>

          {/* category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {walletCategories.map((item) => {
              const active = item.key === selectedCategory;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setSelectedCategory(item.key)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border },
                  ]}
                >
                  <Text style={[styles.filterText, { color: active ? '#fff' : palette.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </ScrollView>
      </View>

      {/* ── list card ── */}
      <View style={[styles.listCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={[styles.stateText, { color: palette.textSecondary }]}>Loading transactions…</Text>
          </View>
        ) : isError ? (
          <View style={styles.centerWrap}>
            <TriangleAlert size={24} color={palette.textSecondary} />
            <Text style={[styles.stateText, { color: palette.textSecondary }]}>
              Could not load transactions.
            </Text>
            <Pressable onPress={() => void refetch()} style={[styles.retryBtn, { backgroundColor: palette.primary }]}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerWrap}>
            <CreditCard size={24} color={palette.textSecondary} />
            <Text style={[styles.stateText, { color: palette.textSecondary }]}>
              {searchQuery ? `No matches for "${searchQuery}"` : 'No transactions in this category.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TransactionRow item={item} palette={palette} onPress={() => {}} />
            )}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            refreshing={isRefetching}
            onRefresh={refetch}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator color={palette.primary} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // header
  headerContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 4 },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },

  // summary hero card
  summaryCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryItem: { flex: 1, gap: 4 },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Typography.family.bold,
  },
  summaryValue: {
    color: '#fff',
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.14)' },

  // search
  searchWrap: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.md,
    fontFamily: Typography.family.regular,
  },

  // filters
  filters: { gap: 10, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 16,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },

  // list card
  listCard: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  rowMeta: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  rowAmountWrap: { alignItems: 'flex-end', gap: 2 },
  rowAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  rowStatus: {
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    fontFamily: Typography.family.bold,
  },

  // state cards
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.xl },
  stateText: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 14 },
  retryBtnText: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
});
