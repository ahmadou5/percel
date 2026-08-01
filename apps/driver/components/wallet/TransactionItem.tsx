import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Landmark,
  Phone,
  Receipt,
  Smartphone,
  Tv,
  Zap,
  X,
} from 'lucide-react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';
import {
  formatNaira,
  formatTransactionTitle,
  formatTxnDate,
  type WalletTransaction,
} from '@/lib/wallet';

function getTxnIcon(category: string, type: 'CREDIT' | 'DEBIT') {
  const cat = (category || '').toUpperCase();
  if (cat === 'AIRTIME') return <Smartphone size={18} color="#FF9F0A" />;
  if (cat === 'DATA') return <Phone size={18} color="#5AC8FA" />;
  if (cat === 'ELECTRICITY') return <Zap size={18} color="#FFD60A" />;
  if (cat === 'TV') return <Tv size={18} color="#BF5AF2" />;
  if (cat === 'TRANSFER_IN' || type === 'CREDIT') return <ArrowDownLeft size={18} color="#30D158" />;
  if (cat === 'TRANSFER_OUT' || type === 'DEBIT') return <ArrowUpRight size={18} color="#FF453A" />;
  return <Landmark size={18} color="#0A84FF" />;
}

type TransactionItemProps = {
  item: WalletTransaction;
};

export function TransactionItem({ item }: TransactionItemProps) {
  const palette = useAppPalette();
  const [modalVisible, setModalVisible] = useState(false);

  const title = formatTransactionTitle(item.description, item.category, item.type, item.metadata);
  const isCredit = item.type === 'CREDIT';
  const icon = getTxnIcon(item.category, item.type);

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: palette.card, borderColor: palette.border },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <View style={[styles.iconWrap, { backgroundColor: isCredit ? '#30D1581A' : '#FF453A1A' }]}>
          {icon}
        </View>

        <View style={styles.details}>
          <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.date, { color: palette.textSecondary }]}>
            {formatTxnDate(item.createdAt)}
          </Text>
        </View>

        <View style={styles.amountWrap}>
          <Text
            style={[
              styles.amount,
              { color: isCredit ? '#30D158' : palette.text },
            ]}
          >
            {isCredit ? '+' : '-'}{formatNaira(item.amount)}
          </Text>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'COMPLETED'
                    ? '#30D158'
                    : item.status === 'PENDING'
                    ? '#FF9F0A'
                    : '#FF453A',
              },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </Pressable>

      {/* Receipt Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: isCredit ? '#30D15822' : '#FF453A22' }]}>
                <Receipt color={isCredit ? '#30D158' : '#FF453A'} size={24} />
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X color={palette.textSecondary} size={20} />
              </Pressable>
            </View>

            <Text style={[styles.modalAmount, { color: isCredit ? '#30D158' : palette.text }]}>
              {isCredit ? '+' : '-'}{formatNaira(item.amount)}
            </Text>
            <Text style={[styles.modalTitle, { color: palette.text }]}>{title}</Text>

            <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#30D15815' : '#FF9F0A15' }]}>
              {item.status === 'COMPLETED' ? (
                <CheckCircle2 size={14} color="#30D158" />
              ) : (
                <Clock size={14} color="#FF9F0A" />
              )}
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: item.status === 'COMPLETED' ? '#30D158' : '#FF9F0A' },
                ]}
              >
                {item.status}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>Reference</Text>
              <Text style={[styles.infoValue, { color: palette.text }]} numberOfLines={1}>
                {item.reference}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>Category</Text>
              <Text style={[styles.infoValue, { color: palette.text }]}>{item.category}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>Date & Time</Text>
              <Text style={[styles.infoValue, { color: palette.text }]}>{formatTxnDate(item.createdAt)}</Text>
            </View>

            {item.description ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>Description</Text>
                <Text style={[styles.infoValue, { color: palette.text }]}>{item.description}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.doneBtn, { backgroundColor: palette.primary }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.doneBtnText}>Close Receipt</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.xs + 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  date: {
    fontSize: 11,
    marginTop: 2,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  statusText: {
    fontSize: 10,
    fontWeight: Typography.semibold,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalAmount: {
    fontSize: 26,
    fontWeight: Typography.bold,
    marginTop: Spacing.xs,
  },
  modalTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: Spacing.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: Typography.bold,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.xs,
  },
  infoValue: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    maxWidth: '65%',
  },
  doneBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
});
