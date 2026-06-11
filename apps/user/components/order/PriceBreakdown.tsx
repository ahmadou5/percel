import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatDistance, formatMoney } from '@/lib/order';
import type { OrderQuoteResponse } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';

type Props = {
  quote: OrderQuoteResponse;
  walletBalance: number;
};

export function PriceBreakdown({ quote, walletBalance }: Props) {
  const palette = useAppPalette();
  const serviceFee = Math.max(0, quote.totalPrice - quote.basePrice);
  const total = quote.totalPrice;
  const insufficient = walletBalance < total;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Base price</Text>
        <Text style={[styles.value, { color: palette.text }]}>{formatMoney(quote.basePrice)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Distance ({formatDistance(quote.distanceKm)})</Text>
        <Text style={[styles.value, { color: palette.text }]}>{formatMoney(Math.round(quote.basePrice * quote.distanceMultiplier - quote.basePrice))}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Service fee</Text>
        <Text style={[styles.value, { color: palette.text }]}>{formatMoney(serviceFee)}</Text>
      </View>
      <View style={[styles.totalRow, { borderTopColor: palette.border }]}>
        <Text style={[styles.totalLabel, { color: palette.text }]}>Total</Text>
        <Text style={[styles.totalValue, { color: palette.text }]}>{formatMoney(total)}</Text>
      </View>
      {insufficient ? <Text style={[styles.warning, { color: palette.error }]}>Wallet balance is not enough for this order.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  value: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, marginTop: Spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  totalValue: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  warning: { fontSize: Typography.sm, marginTop: Spacing.xs, fontFamily: Typography.family.regular },
});
