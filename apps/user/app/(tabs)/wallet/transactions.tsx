import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, Clock3, CreditCard, Search, TriangleAlert, Box, Share2, FileDown, ArrowUpRight, ArrowDownLeft, CheckCircle2, Smartphone } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';

import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedReveal } from '@/components/ui/AnimatedReveal';
import { haptics } from '@/utils/haptics';

import { ListSkeleton } from '@/components/ui/Skeleton';
import { StateCard } from '@/components/ui/StateCard';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useTransactions } from '@/hooks/useWallet';
import { formatNaira, formatTxnDate, titleize, walletCategories } from '@/lib/wallet';
import { getThemeIconSource, useAppPalette } from '@/lib/theme';

function DashedDivider() {
  return (
    <View style={styles.dashedContainer}>
      {Array.from({ length: 30 }).map((_, i) => (
        <View key={i} style={styles.dash} />
      ))}
    </View>
  );
}

function ReceiptRow({ label, value, isStatus, statusType, palette }: { label: string; value: string; isStatus?: boolean; statusType?: string; palette: ReturnType<typeof useAppPalette> }) {
  let statusColor: string = palette.text;
  let statusBg: string = palette.bg;
  if (isStatus && statusType) {
    if (statusType.toUpperCase() === 'COMPLETED' || statusType.toUpperCase() === 'SUCCESS') {
      statusColor = palette.success;
      statusBg = 'rgba(48,209,88,0.12)';
    } else if (statusType.toUpperCase() === 'FAILED') {
      statusColor = palette.error;
      statusBg = 'rgba(255,69,58,0.12)';
    } else {
      statusColor = palette.warning;
      statusBg = 'rgba(255,214,10,0.12)';
    }
  }

  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, { color: palette.textSecondary }]}>{label}</Text>
      {isStatus ? (
        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          <Text style={[styles.receiptValue, { color: statusColor, fontSize: 11 }]}>{value.toUpperCase()}</Text>
        </View>
      ) : (
        <Text style={[styles.receiptValue, { color: palette.text }]}>{value}</Text>
      )}
    </View>
  );
}

export default function TransactionsScreen() {
  const palette = useAppPalette();
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

  // Summary uses full backend accumulation for the selected category filter, fallback to loaded transactions
  const summary = useMemo(() => {
    const apiSummary = query.data?.pages[0]?.summary;
    if (apiSummary) {
      return {
        credits: apiSummary.totalCredits,
        debits: apiSummary.totalDebits,
      };
    }
    return transactions.reduce(
      (acc, item) => {
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
  }, [query.data, transactions]);

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
      if (!(await Sharing.isAvailableAsync())) {
        setReceiptResult({ visible: true, type: 'failed', title: 'Sharing unavailable', message: 'Your device cannot share receipt images right now.', amount: formatNaira(selected.amount), reference: selected.reference });
        return;
      }

      const uri = await captureRef(receiptRef, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share receipt image" });
      setReceiptResult({ visible: true, type: 'success', title: 'Receipt exported', message: 'The receipt image is ready to share.', amount: formatNaira(selected.amount), reference: selected.reference });
    } catch {
      setReceiptResult({ visible: true, type: 'failed', title: 'Receipt export failed', message: 'Unable to create the receipt image on this device.', amount: formatNaira(selected.amount), reference: selected.reference });
    }
  };

  const handleSharePdf = async () => {
    if (!selected) return;
    try {
      const html = `
        <html><head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0F172A; background: #FAFAFA; }
            .container { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; padding: 32px; border: 1px solid #E2E8F0; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px dashed #E2E8F0; }
            .brand { font-weight: 800; font-size: 22px; color: ${palette.primary}; }
            .amount { font-size: 32px; font-weight: 800; color: ${selected.type === 'CREDIT' ? '#30D158' : '#0F172A'}; margin-bottom: 4px; }
            .date { font-size: 12px; color: #64748B; margin-bottom: 24px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .td-label { padding: 12px 0; color: #64748B; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
            .td-value { padding: 12px 0; text-align: right; font-weight: 700; font-size: 13px; color: #0F172A; border-bottom: 1px solid #F1F5F9; }
            .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 32px; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">Percel</div>
              <div style="font-size: 12px; color: #64748B; font-weight: 700;">TRANSACTION RECEIPT</div>
            </div>
            <div style="text-align: center;">
              <div class="amount">${selected.type === "CREDIT" ? "+" : "-"}${formatNaira(selected.amount)}</div>
              <div class="date">${formatTxnDate(selected.createdAt)}</div>
            </div>
            <table class="table">
              <tr><td class="td-label">Transaction Type</td><td class="td-value">${titleize(selected.category)}</td></tr>
              <tr><td class="td-label">Status</td><td class="td-value">${selected.status}</td></tr>
              <tr><td class="td-label">Reference ID</td><td class="td-value" style="font-family: monospace;">${selected.reference}</td></tr>
              <tr><td class="td-label">Payment Type</td><td class="td-value">${selected.type}</td></tr>
              ${selected.metadata?.phone || selected.metadata?.recipientPhone || selected.metadata?.accountNumber ? `
                <tr><td class="td-label">Recipient Account</td><td class="td-value">${selected.metadata?.phone || selected.metadata?.recipientPhone || selected.metadata?.accountNumber}</td></tr>
              ` : ''}
            </table>
            <div class="footer">Official Receipt &bull; Percel Logistics</div>
          </div>
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
          <ListSkeleton style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }} />
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
          <View ref={receiptRef} collapsable={false} style={[styles.receiptCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {selected ? (
              <>
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptLogoBox}>
                    <Image source={getThemeIconSource(palette.primary)} style={styles.brandIconImage} />
                    <Text style={[styles.receiptLogoText, { color: palette.text }]}>Percel</Text>
                  </View>
                  <View style={[styles.receiptBadgeWrap, { backgroundColor: palette.bg }]}>
                    {selected.category === 'AIRTIME' || selected.category === 'DATA' ? (
                      <Smartphone size={16} color={palette.textSecondary} />
                    ) : selected.type === 'CREDIT' ? (
                      <ArrowDownLeft size={16} color={palette.success} />
                    ) : (
                      <ArrowUpRight size={16} color={palette.error} />
                    )}
                  </View>
                </View>

                <View style={styles.receiptAmountSection}>
                  <Text style={[styles.receiptAmountText, { color: selected.type === 'CREDIT' ? palette.success : palette.text }]}>
                    {selected.type === 'CREDIT' ? '+' : '-'}{formatNaira(selected.amount)}
                  </Text>
                  <Text style={[styles.receiptTimestamp, { color: palette.textSecondary }]}>
                    {formatTxnDate(selected.createdAt)}
                  </Text>
                </View>

                <DashedDivider />

                <View style={styles.receiptDetails}>
                  <ReceiptRow label="Transaction Type" value={titleize(selected.category)} palette={palette} />
                  <ReceiptRow label="Status" value={selected.status} isStatus statusType={selected.status} palette={palette} />
                  <ReceiptRow label="Reference ID" value={selected.reference} palette={palette} />
                  <ReceiptRow label="Payment Type" value={selected.type} palette={palette} />
                  {selected.metadata?.phone || selected.metadata?.recipientPhone || selected.metadata?.accountNumber ? (
                    <ReceiptRow
                      label="Recipient Account"
                      value={String(selected.metadata?.phone || selected.metadata?.recipientPhone || selected.metadata?.accountNumber)}
                      palette={palette}
                    />
                  ) : null}
                </View>

                <DashedDivider />

                <View style={styles.receiptActions}>
                  <Pressable onPress={handleShareImage} style={[styles.receiptActionButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                    <Share2 size={16} color={palette.text} />
                    <Text style={[styles.receiptActionText, { color: palette.text }]}>Share Image</Text>
                  </Pressable>
                  <Pressable onPress={handleSharePdf} style={[styles.receiptActionButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                    <FileDown size={16} color={palette.text} />
                    <Text style={[styles.receiptActionText, { color: palette.text }]}>Share PDF</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => setSelectedId(null)} style={[styles.receiptCloseButton, { backgroundColor: palette.primary }]}>
                  <Text style={styles.receiptCloseButtonText}>Close</Text>
                </Pressable>

                <View style={styles.scallopedContainer}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View key={i} style={styles.scallopCircle} />
                  ))}
                </View>
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
  palette: ReturnType<typeof useAppPalette>;
}) {
  const credit = item.type === 'CREDIT';
  const Icon = credit ? ArrowDownLeft : ArrowUpRight;
  const iconColor = credit ? palette.success : palette.error;
  const iconBg = credit ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)';

  return (
    <AnimatedReveal index={index}>
      <Pressable onPressIn={() => void haptics.tap()} onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: palette.border }, pressed ? styles.pressed : null]}>
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: palette.text }]}>{item.description}</Text>
          <Text style={[styles.rowMeta, { color: palette.textSecondary }]}>
            {titleize(item.category)} • {formatTxnDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.rowAmountWrap}>
          <Text style={[styles.rowAmount, { color: iconColor }]}>{`${credit ? '+' : '-'}${formatNaira(item.amount)}`}</Text>
          <Text style={[styles.rowStatus, { color: palette.textSecondary }]}>{item.status.toLowerCase()}</Text>
        </View>
      </Pressable>
    </AnimatedReveal>
  );
}

function Row({ label, value, palette }: { label: string; value: string; palette: ReturnType<typeof useAppPalette> }) {
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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.sm },
  modalActionButton: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modalButton: { marginTop: Spacing.sm, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  pressed: { opacity: 0.92 },
  receiptCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    gap: 16,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  dashedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginVertical: 10,
    height: 1.5,
  },
  dash: {
    width: 6,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconImage: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  receiptLogoText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Typography.family.bold,
  },
  receiptBadgeWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptAmountSection: {
    alignItems: 'center',
    marginVertical: 14,
    gap: 6,
  },
  receiptAmountText: {
    color: '#fff',
    fontSize: 32,
    fontFamily: Typography.family.bold,
  },
  receiptTimestamp: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Typography.family.regular,
  },
  receiptDetails: {
    gap: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: Typography.family.regular,
  },
  receiptValue: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Typography.family.bold,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  receiptActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  receiptActionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Typography.family.bold,
  },
  receiptCloseButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  receiptCloseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Typography.family.bold,
  },
  scallopedContainer: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    zIndex: 10,
  },
  scallopCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', // blends into backdrop
  },
});