import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { TransactionItem } from '@/components/wallet/TransactionItem';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatTxnDate, titleize, walletCategories } from '@/lib/wallet';
import { useTransactions } from '@/hooks/useWallet';

export default function TransactionsScreen() {
  const [category, setCategory] = useState<'ALL' | string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useTransactions({ category, limit: 20 });

  const transactions = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const filtered = transactions.filter((item) => {
    const haystack = `${item.description} ${item.reference} ${item.category}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });
  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  const renderFooter = () => {
    if (!query.isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.light.primary} />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Ledger</Text>
        <Text style={styles.title}>Every wallet movement in one searchable list.</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchLabel}>Search</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Description, reference, category"
          placeholderTextColor={Colors.light.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {walletCategories.map((item) => {
          const active = item.key === category;
          return (
            <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.listCard}>
        {query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : filtered.length ? (
          <FlashList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionItem transaction={item} onPress={() => setSelectedId(item.id)} />}
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
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyBody}>Try a different filter or search term.</Text>
          </View>
        )}
      </View>

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />
          <View style={styles.modalCard}>
            {selected ? (
              <>
                <Text style={styles.modalTitle}>{selected.description}</Text>
                <Text style={styles.modalMeta}>{titleize(selected.category)} • {formatTxnDate(selected.createdAt)}</Text>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Reference</Text><Text style={styles.modalValue}>{selected.reference}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Status</Text><Text style={styles.modalValue}>{selected.status}</Text></View>
                <View style={styles.modalRow}><Text style={styles.modalLabel}>Amount</Text><Text style={styles.modalValue}>₦{selected.amount.toLocaleString('en-NG')}</Text></View>
                <Pressable onPress={() => setSelectedId(null)} style={styles.modalButton}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg, padding: Spacing.lg, gap: Spacing.md },
  header: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  searchWrap: { gap: 6 },
  searchLabel: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  searchInput: { backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 16, minHeight: 52, paddingHorizontal: Spacing.lg, color: Colors.light.text },
  filters: { gap: Spacing.sm, paddingVertical: 2 },
  filterChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 999, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border },
  filterChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  filterText: { color: Colors.light.text, fontWeight: Typography.semibold },
  filterTextActive: { color: '#fff' },
  listCard: { flex: 1, backgroundColor: Colors.light.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border, paddingHorizontal: Spacing.lg },
  empty: { paddingVertical: Spacing.xl, gap: 8 },
  emptyTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  emptyBody: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  center: { paddingVertical: Spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: Spacing.lg },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.light.card, borderRadius: 24, padding: Spacing.xl, gap: Spacing.sm },
  modalTitle: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  modalMeta: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border },
  modalLabel: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  modalValue: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  modalButton: { marginTop: Spacing.sm, backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { color: '#fff', fontWeight: Typography.bold },
});
