import FontAwesome from '@expo/vector-icons/FontAwesome';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedReveal } from '@/components/ui/AnimatedReveal';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira, formatTxnDate, titleize, type WalletTransaction } from '@/lib/wallet';
import { haptics } from '@/utils/haptics';

type Props = {
  transaction: WalletTransaction;
  onPress?: () => void;
};

const iconMap: Record<string, string> = {
  TOP_UP: 'plus-circle',
  ORDER_PAYMENT: 'shopping-cart',
  ORDER_EARNING: 'truck',
  TRANSFER_IN: 'arrow-down',
  TRANSFER_OUT: 'arrow-up',
  AIRTIME: 'mobile-phone',
  DATA: 'signal',
  ELECTRICITY: 'bolt',
  TV: 'tv',
  COMMISSION: 'percent',
  REFUND: 'undo',
};

function TransactionItemBase({ transaction, onPress }: Props) {
  const amount = formatNaira(transaction.amount);
  const isCredit = transaction.type === 'CREDIT';
  const icon = iconMap[transaction.category] ?? 'circle';

  return (
    <AnimatedReveal index={0}>
      <Pressable
        onPressIn={() => void haptics.tap()}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        <View style={[styles.icon, isCredit ? styles.iconCredit : styles.iconDebit]}>
          <FontAwesome name={icon as keyof typeof FontAwesome.glyphMap} size={16} color={isCredit ? Colors.light.success : Colors.light.error} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{transaction.description}</Text>
          <Text style={styles.subtitle}>
            {titleize(transaction.category)} • {formatTxnDate(transaction.createdAt)}
          </Text>
        </View>
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, isCredit ? styles.credit : styles.debit]}>
            {isCredit ? '+' : '-'}{amount}
          </Text>
          <Text style={styles.status}>{transaction.status}</Text>
        </View>
      </Pressable>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCredit: { backgroundColor: 'rgba(48, 209, 88, 0.12)' },
  iconDebit: { backgroundColor: 'rgba(255, 69, 58, 0.12)' },
  body: { flex: 1, gap: 2 },
  title: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.semibold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  amountWrap: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: Typography.md, fontWeight: Typography.bold },
  credit: { color: Colors.light.success },
  debit: { color: Colors.light.error },
  status: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase' },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});

export const TransactionItem = memo(TransactionItemBase);
