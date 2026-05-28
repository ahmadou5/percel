import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatMoney, formatDistance } from '@/lib/order';
import type { OrderQuoteResponse } from '@/lib/order';

type Props = {
  quote: OrderQuoteResponse;
  walletBalance: number;
};

export function PriceBreakdown({ quote, walletBalance }: Props) {
  const serviceFee = Math.max(0, quote.totalPrice - quote.basePrice);
  const total = quote.totalPrice;
  const insufficient = walletBalance < total;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Base price</Text>
        <Text style={styles.value}>{formatMoney(quote.basePrice)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Distance ({formatDistance(quote.distanceKm)})</Text>
        <Text style={styles.value}>{formatMoney(Math.round(quote.basePrice * quote.distanceMultiplier - quote.basePrice))}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Service fee</Text>
        <Text style={styles.value}>{formatMoney(serviceFee)}</Text>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatMoney(total)}</Text>
      </View>
      {insufficient ? <Text style={styles.warning}>Wallet balance is not enough for this order.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  value: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, marginTop: Spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border },
  totalLabel: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  totalValue: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  warning: { color: Colors.light.error, fontSize: Typography.sm, marginTop: Spacing.xs },
});
