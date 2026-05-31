import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, Clock3, CreditCard, FileClock, Filter, Search, TriangleAlert } from 'lucide-react-native';

import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira, formatTxnDate, titleize, walletCategories } from '@/lib/wallet';
import { useTransactions } from '@/hooks/useWallet';
import { useRouter } from 'expo-router';

export default function TransactionsScreen() {
    const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const [category, setCategory] = useState<'ALL' | string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useTransactions({ category, limit: 20 });

  const transactions = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const filtered = transactions.filter((item) => {
    const haystack = `${item.description} ${item.reference} ${item.category}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });
  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  const summary = useMemo(() => {
    const credits = filtered.filter((item) => item.type === 'CREDIT').reduce((sum, item) => sum + item.amount, 0);
    const debits = filtered.filter((item) => item.type === 'DEBIT').reduce((sum, item) => sum + item.amount, 0);
    return { credits, debits };
  }, [filtered]);

  const renderFooter = () => {
    if (!query.isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.headerContent}>
        <View style={styles.headerRow}>
                <Pressable onPress={() => router.back()} style={[styles.backButton, {  borderColor: palette.border }]}>
                 <ChevronLeft size={20} color={palette.text} fill={"none"}  />
                </Pressable>
                <Text style={[styles.headerTitle, { color: palette.text }]}>Transactions History</Text>
                <View style={styles.headerSpacer} />
              </View>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>Ledger</Text>
            <Text style={[styles.title, { color: palette.text }]}>Every wallet movement in one searchable list.</Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <FileClock size={18} color={palette.primary} />
          </View>
        </View>

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

        <View style={[styles.searchWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Search size={16} color={palette.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search description, reference, category"
            placeholderTextColor={palette.textSecondary}
            style={[styles.searchInput, { color: palette.text }]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {walletCategories.map((item) => {
            const active = item.key === category;
            return (
              <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.filterChip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
                <Text style={[styles.filterText, { color: active ? palette.card : palette.text }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>

      <View style={[styles.listCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {query.isLoading ? (
          <StateCard loading title="Loading transactions" description="We’re fetching your latest activity and payment history." icon={<Clock3 size={24} color={palette.textSecondary} />} />
        ) : query.isError ? (
          <StateCard
            title="Could not load transactions"
            description="Check your connection and try again."
            icon={<TriangleAlert size={24} color={palette.textSecondary} />}
            actionLabel="Retry"
            onActionPress={() => void query.refetch()}
          />
        ) : filtered.length ? (
          <FlashList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionRow item={item} palette={palette} onPress={() => setSelectedId(item.id)} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) {
                void query.fetchNextPage();
              }
            }}
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <StateCard
            title={search ? 'No matches' : 'No transactions yet'}
            description={search ? 'Try a different filter or search term.' : 'Your deposits, transfers, and bill payments will appear here.'}
            icon={<CreditCard size={24} color={palette.textSecondary} />}
            actionLabel="Refresh"
            onActionPress={() => void query.refetch()}
          />
        )}
      </View>

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {selected ? (
              <>
                <Text style={[styles.modalTitle, { color: palette.text }]}>{selected.description}</Text>
                <Text style={[styles.modalMeta, { color: palette.textSecondary }]}>{titleize(selected.category)} • {formatTxnDate(selected.createdAt)}</Text>
                <Row label="Reference" value={selected.reference} palette={palette} />
                <Row label="Status" value={selected.status} palette={palette} />
                <Row label="Amount" value={formatNaira(selected.amount)} palette={palette} />
                <Pressable onPress={() => setSelectedId(null)} style={[styles.modalButton, { backgroundColor: palette.primary }]}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TransactionRow({ item, onPress, palette }: { item: { id: string; description: string; reference: string; category: string; createdAt: string; amount: number; status: string; type: 'CREDIT' | 'DEBIT' }; onPress: () => void; palette: (typeof Colors)[keyof typeof Colors]; }) {
  const credit = item.type === 'CREDIT';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: palette.border }, pressed ? styles.pressed : null]}>
      <View style={[styles.rowIcon, { backgroundColor: credit ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)' }]}>
        <CreditCard size={16} color={credit ? palette.success : palette.error} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: palette.text }]}>{item.description}</Text>
        <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>{titleize(item.category)} • {formatTxnDate(item.createdAt)}</Text>
      </View>
      <View style={styles.rowAmountWrap}>
        <Text style={[styles.rowAmount, { color: credit ? palette.success : palette.error }]}>{`${credit ? '+' : '-'}${formatNaira(item.amount)}`}</Text>
        <Text style={[styles.rowStatus, { color: palette.textSecondary }]}>{item.status.toLowerCase()}</Text>
      </View>
    </Pressable>
  );
}

function Row({ label, value, palette }: { label: string; value: string; palette: (typeof Colors)[keyof typeof Colors] }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: palette.border }]}>
      <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  headerIcon: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { borderRadius: 28, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryItem: { flex: 1, gap: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.14)' },
  searchWrap: { minHeight: 54, borderRadius: 18, borderWidth: 1, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.regular },
  filters: { gap: 10, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 16, minHeight: 42, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  listCard: { flex: 1, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: 28, borderWidth: 1, overflow: 'hidden' },
  footer: { paddingVertical: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  rowMeta: { fontSize: Typography.sm },
  rowAmountWrap: { alignItems: 'flex-end', gap: 2 },
  rowAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  rowStatus: { fontSize: Typography.xs, textTransform: 'uppercase', fontFamily: Typography.family.bold },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLabel: { fontSize: Typography.sm },
  detailValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textAlign: 'right', flex: 1, marginLeft: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.xl, gap: 10 },
  modalTitle: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  modalMeta: { fontSize: Typography.sm },
  modalButton: { marginTop: Spacing.sm, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
   headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.92 },
});
