import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatDistance, formatDuration, formatMoney } from '@/lib/order';
import { useWallet } from '@/hooks/useWallet';
import { useCreateOrder, useGetQuote } from '@/hooks/useOrder';
import { PriceBreakdown } from '@/components/order/PriceBreakdown';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useSafeBack } from '@/components/navigation/useSafeBack';

export default function QuoteScreen() {
  const router = useRouter();
  const back = useSafeBack("/send");
  const params = useLocalSearchParams<{ pickup?: string; delivery?: string; size?: 'SMALL' | 'MEDIUM' | 'LARGE'; fragile?: string; notes?: string }>();
  const walletQuery = useWallet();
  const quoteQuery = useGetQuote();
  const createOrder = useCreateOrder();

  const pickup = params.pickup ?? '';
  const delivery = params.delivery ?? '';
  const size = params.size ?? 'SMALL';
  const fragile = params.fragile === 'true';
  const notes = params.notes ?? '';
  const walletBalance = Number(walletQuery.data?.balance ?? 0);

  const quote = quoteQuery.data;

  const loadQuote = async () => {
    if (!pickup || !delivery) return;
    try {
      await quoteQuery.mutateAsync({ size, pickupAddress: pickup, deliveryAddress: delivery });
    } catch (error) {
      Alert.alert('Quote failed', error instanceof Error ? error.message : 'Unable to generate quote.');
    }
  };

  const submitOrder = async () => {
    if (!quote) return;
    try {
      const order = await createOrder.mutateAsync({
        size,
        pickupAddress: pickup,
        deliveryAddress: delivery,
        fragile,
        notes,
        items: [{ description: 'Package', quantity: 1, weightKg: 1, fragile }],
      });
      router.replace(`/send/tracking/${order.id}`);
    } catch (error) {
      Alert.alert('Order failed', error instanceof Error ? error.message : 'Unable to create order.');
    }
  };

  const canProceed = Boolean(quote) && walletBalance >= Number(quote?.totalPrice ?? 0) && !createOrder.isPending;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => back()} style={{ alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.card, borderColor: Colors.light.border }}>
        <Text style={{ color: Colors.light.text, fontSize: 14, fontWeight: Typography.bold }}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Confirm quote</Text>
        <Text style={styles.title}>Review the route, price, and wallet balance.</Text>
      </View>

      {quoteQuery.isError ? <ErrorBanner message="Could not load quote. Check the addresses and try again." onDismiss={() => quoteQuery.reset()} /> : null}

      {!quote ? (
        <Pressable onPress={loadQuote} style={styles.primary}>
          <Text style={styles.primaryText}>{quoteQuery.isPending ? 'Calculating…' : 'Get quote'}</Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.routeCard}>
            <Text style={styles.routeLabel}>Route summary</Text>
            <Text style={styles.routeText}>{pickup}</Text>
            <Text style={styles.arrow}>↓</Text>
            <Text style={styles.routeText}>{delivery}</Text>
          </View>

          <PriceBreakdown quote={quote} walletBalance={walletBalance} />

          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Estimated delivery time</Text>
            <Text style={styles.metaValue}>{formatDuration(quote.durationMin)}</Text>
            <Text style={styles.metaSub}>{formatDistance(quote.distanceKm)}</Text>
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Wallet balance</Text>
            <Text style={styles.metaValue}>{formatMoney(walletBalance)}</Text>
            {!canProceed ? <Text style={styles.warning}>Top up your wallet before confirming this order.</Text> : null}
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Address check</Text>
            <Text style={styles.metaValue}>Backend geocoding</Text>
            <Text style={styles.metaSub}>The server resolves both addresses before pricing and order creation.</Text>
          </View>

          <Pressable disabled={!canProceed} onPress={submitOrder} style={[styles.primary, !canProceed ? styles.disabled : null]}>
            <Text style={styles.primaryText}>{createOrder.isPending ? 'Creating order…' : `Pay ${formatMoney(quote.totalPrice)} from Wallet`}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  routeCard: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: 6 },
  routeLabel: { color: Colors.light.textSecondary, fontSize: Typography.xs, textTransform: 'uppercase' },
  routeText: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.semibold },
  arrow: { color: Colors.light.primary, fontSize: Typography.xl, alignSelf: 'center' },
  metaCard: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: 4 },
  metaTitle: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  metaValue: { color: Colors.light.text, fontSize: Typography.xl, fontWeight: Typography.bold },
  metaSub: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  warning: { color: Colors.light.error, fontSize: Typography.sm },
  primary: { minHeight: 52, borderRadius: 16, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
  disabled: { opacity: 0.5 },
});
