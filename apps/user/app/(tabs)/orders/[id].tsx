import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DriverCard } from '@/components/order/DriverCard';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrderDetail } from '@/hooks/useOrder';

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOrderDetail(id);
  const order = query.data;

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading order…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Order detail</Text>
        <Text style={styles.title}>{order.trackingCode}</Text>
        <Text style={styles.subtitle}>{order.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Route</Text>
        <Text style={styles.body}>{order.pickupFormattedAddress}</Text>
        <Text style={styles.body}>↓</Text>
        <Text style={styles.body}>{order.deliveryFormattedAddress}</Text>
      </View>

      <DriverCard
        driver={order.driver}
        onCall={() => Alert.alert('Call driver', 'Driver calling is wired in the tracking prompt.')}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {(order.items ?? []).map((item, index) => (
          <View key={`${item.description}-${index}`} style={styles.itemRow}>
            <Text style={styles.body}>{item.description}</Text>
            <Text style={styles.body}>x{item.quantity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status history</Text>
        <StatusTimeline items={order.statusHistory} />
      </View>

      {order.status === 'DELIVERED' || order.status === 'COMPLETED' ? (
        <Pressable onPress={() => router.push({ pathname: '/orders/rate/[id]', params: { id: order.id } } as never)} style={styles.rateButton}>
          <Text style={styles.rateButtonText}>{order.rating ? 'View rating' : 'Rate delivery'}</Text>
        </Pressable>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  hero: { gap: 4 },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 26, fontWeight: Typography.bold },
  subtitle: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  card: { backgroundColor: Colors.light.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  body: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rateButton: { backgroundColor: Colors.light.primary, borderRadius: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  rateButtonText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
