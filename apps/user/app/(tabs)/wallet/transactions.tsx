import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, Clock3, CreditCard, Search, TriangleAlert } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedReveal } from '@/components/ui/AnimatedReveal';
import { haptics } from '@/utils/haptics';

import { StateCard } from '@/components/ui/StateCard';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useTransactions } from '@/hooks/useWallet';
import { formatNaira, formatTxnDate, titleize, walletCategories } from '@/lib/wallet';

export default function TransactionsScreen() {
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const back = useSafeBack("/wallet");
  const [category, setCategory] = useState<'ALL' | string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<null | { visible: boolean; type: 'success' | 'failed' | 'pending'; title: string; message: string; amount?: string; reference?: string }>(null);
  const query = useTransactions({ category, limit: 20 });
  const receiptRef = useRef<View>(null);

  const transactions = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);

  // Filter for display only — summary always uses the full loaded set
  const visibleTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return transactions;
    return transactions.filter((item) => {
      const haystack = `${item.description} ${item.reference} ${item.category}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [search, transactions]);

  const selected = useMemo(() => transactions.find((item) => item.id === selectedId) ?? null, [selectedId, transactions]);

  // Summary is derived from the full loaded set, not the filtered subset
 const summary = useMemo(() => {
  return transactions.reduce(
    (acc, item) => {
      // Using Number() ensures "5000" becomes 5000 before adding
      const amount = Number(item.amount) || 0; 

      if (item.type === 'CREDIT') {
        acc.credits += amount;
      } else {
        acc.debits += amount;
      }
      return acc;
    },
    { credits: 0, debits: 0 },
  );
}, [transactions]);

  const renderFooter = () => {
    if (!query.isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  };

  const handleShareImage = async () => {
    if (!selected) return;
    if (!receiptRef.current) {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt unavailable', message: 'Open the transaction again and try exporting the image.', amount: formatNaira(selected.amount), reference: selected.reference });
      return;
    }

    try {
      const sharing = await import("expo-sharing");
      const { captureRef } = await import("react-native-view-shot");

      if (!(await sharing.isAvailableAsync())) {
        setReceiptResult({ visible: true, type: 'failed', title: 'Sharing unavailable', message: 'Your device cannot share receipt images right now.', amount: formatNaira(selected.amount), reference: selected.reference });
        return;
      }

      const uri = await captureRef(receiptRef, { format: "png", quality: 1 });
      await sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share receipt image" });
      setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The receipt image is ready to share.', amount: formatNaira(selected.amount), reference: selected.reference });
    } catch {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt export failed', message: 'Unable to create the receipt image on this device.', amount: formatNaira(selected.amount), reference: selected.reference });
    }
  };

  const handleSharePdf = async () => {
    if (!selected) return;
    try {
      const Print = await import("expo-print");
      const Sharing = await import("expo-sharing");
      const html = `
        <html><body style="font-family:sans-serif;padding:32px;color:#111;">
          <h2 style="margin-bottom:4px;">${selected.description}</h2>
          <p style="color:#666;margin-top:0;">${titleize(selected.category)} &bull; ${formatTxnDate(selected.createdAt)}</p>
          <hr/>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;">Reference</td><td style="text-align:right;">${selected.reference}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Status</td><td style="text-align:right;">${selected.status}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Amount</td><td style="text-align:right;font-weight:bold;">${selected.type === "CREDIT" ? "+" : "-"}${formatNaira(selected.amount)}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Type</td><td style="text-align:right;">${selected.type}</td></tr>
          </table>
          <hr/>
          <p style="font-size:12px;color:#aaa;text-align:center;margin-top:24px;">Generated by Percel</p>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: ".pdf" });
        setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The PDF receipt is ready to share.', amount: formatNaira(selected.amount), reference: selected.reference });
      } else {
        setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The PDF receipt was saved to your device.', amount: formatNaira(selected.amount), reference: selected.reference });
      }
    } catch {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt export failed', message: 'Unable to create the receipt PDF on this device.', amount: formatNaira(selected.amount), reference: selected.reference });
    }
  };

 return (
  <View style={[styles.screen, { backgroundColor: palette.bg }]}>
    
    {/* 🌟 FIX 1: Wrap header in a non-flexible container so it doesn't crush the list */}
    <View style={{ flexGrow: 0, flexShrink: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.headerContent}>
        <View style={styles.headerRow}>
          <Pressable onPressIn={() => void haptics.tap()} onPress={() => back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <ChevronLeft size={20} color={palette.text} />
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Ledger history</Text>
          <Text style={[styles.title, { color: palette.text }]}>Every wallet movement in one searchable list.</Text>
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
              <Pressable
                key={item.key}
                onPressIn={() => void haptics.tap()} onPress={() => setCategory(item.key)}
                style={[styles.filterChip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}
              >
                <Text style={[styles.filterText, { color: active ? palette.card : palette.text }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>
    </View>

    {/* 🌟 FIX 2: List card takes up all remaining space cleanly */}
    <View style={[styles.listCard, { backgroundColor: palette.card, borderColor: palette.border, flex: 1 }]}>
      {query.isLoading ? (
        <StateCard loading title="Loading transactions" description="We're fetching your latest activity and payment history." icon={<Clock3 size={24} color={palette.textSecondary} />} />
      ) : query.isError ? (
        <StateCard
          title="Could not load transactions"
          description="Check your connection and try again."
          icon={<TriangleAlert size={24} color={palette.textSecondary} />}
          actionLabel="Retry"
          onActionPress={() => { void haptics.tap(); void query.refetch(); }}
        />
      ) : visibleTransactions.length ? (
        <FlashList
          data={visibleTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <TransactionRow item={item} index={index} palette={palette} onPress={() => setSelectedId(item.id)} />}
          
          // 🌟 FIX 3: FlashList still needs this prop to size rows correctly!
          //estimatedItemSize={76}

          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          refreshing={query.isRefetching}
          onRefresh={() => { void haptics.tap(); void query.refetch(); }}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <StateCard
          title={search ? 'No matches' : 'No transactions yet'}
          description={search ? 'Try a different filter or search term.' : 'Your deposits, transfers, and bill payments will appear here.'}
          icon={<CreditCard size={24} color={palette.textSecondary} />}
          actionLabel="Refresh"
          onActionPress={() => { void haptics.tap(); void query.refetch(); }}
        />
      )}
    </View>

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />
          <View ref={receiptRef} collapsable={false} style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {selected ? (
              <>
                <Text style={[styles.modalTitle, { color: palette.text }]}>{selected.description}</Text>
                <Text style={[styles.modalMeta, { color: palette.textSecondary }]}>
                  {titleize(selected.category)} • {formatTxnDate(selected.createdAt)}
                </Text>
                <Row label="Reference" value={selected.reference} palette={palette} />
                <Row label="Status" value={selected.status} palette={palette} />
                <Row label="Amount" value={`${selected.type === 'CREDIT' ? '+' : '-'}${formatNaira(selected.amount)}`} palette={palette} />
                <Row label="Type" value={selected.type} palette={palette} />
                <View style={styles.modalActions}>
                  <Pressable onPress={handleShareImage} style={[styles.modalActionButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <Text style={[styles.modalActionText, { color: palette.text }]}>Save Image</Text>
                  </Pressable>
                  <Pressable onPress={handleSharePdf} style={[styles.modalActionButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <Text style={[styles.modalActionText, { color: palette.text }]}>Export PDF</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setSelectedId(null)} style={[styles.modalButton, { backgroundColor: palette.primary }]}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <TransactionResultModal
        visible={Boolean(receiptResult?.visible)}
        type={receiptResult?.type ?? 'pending'}
        title={receiptResult?.title ?? ''}
        message={receiptResult?.message ?? ''}
        amount={receiptResult?.amount}
        reference={receiptResult?.reference}
        onClose={() => setReceiptResult(null)}
      />
    </View>
  );
}

function TransactionRow({
  item,
  index,
  onPress,
  palette,
}: {
  item: { id: string; description: string; reference: string; category: string; createdAt: string; amount: number; status: string; type: 'CREDIT' | 'DEBIT' };
  index: number;
  onPress: () => void;
  palette: (typeof Colors)[keyof typeof Colors];
}) {
  const credit = item.type === 'CREDIT';
  return (
    <AnimatedReveal index={index}>
      <Pressable onPressIn={() => void haptics.tap()} onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: palette.border }, pressed ? styles.pressed : null]}>
        <View style={[styles.rowIcon, { backgroundColor: credit ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)' }]}>
          <CreditCard size={16} color={credit ? palette.success : palette.error} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: palette.text }]}>{item.description}</Text>
          <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
            {titleize(item.category)} • {formatTxnDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.rowAmountWrap}>
          <Text style={[styles.rowAmount, { color: credit ? palette.success : palette.error }]}>{`${credit ? '+' : '-'}${formatNaira(item.amount)}`}</Text>
          <Text style={[styles.rowStatus, { color: palette.textSecondary }]}>{item.status.toLowerCase()}</Text>
        </View>
      </Pressable>
    </AnimatedReveal>
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
  headerContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
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
  listCard: { flex: 1, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: 28, borderWidth: 1, overflow: 'hidden'},
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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.sm },
  modalActionButton: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modalButton: { marginTop: Spacing.sm, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  pressed: { opacity: 0.92 },
});