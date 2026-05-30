import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrders } from '@/hooks/useOrder';

export default function OrdersScreen() {
  const router = useRouter();
  const query = useOrders();
  const [tab, setTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');

  const orders = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const active = orders.filter((order) => ['CREATED', 'PENDING_MATCH', 'MATCHED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status));
  const past = orders.filter((order) => ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(order.status));
  const current = tab === 'ACTIVE' ? active : past;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Orders</Text>
        <Text style={styles.title}>Track your active runs and review old deliveries.</Text>
      </View>

      <View style={styles.tabRow}>
        {(['ACTIVE', 'PAST'] as const).map((item) => {
          const selected = item === tab;
          return (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, selected ? styles.tabActive : null]}>
              <Text style={[styles.tabText, selected ? styles.tabTextActive : null]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      {current.map((order) => (
        <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.code}>{order.trackingCode}</Text>
            <Text style={styles.badge}>{order.status}</Text>
          </View>
          <Text style={styles.address}>{order.pickupFormattedAddress}</Text>
          <Text style={styles.arrow}>↓</Text>
          <Text style={styles.address}>{order.deliveryFormattedAddress}</Text>
          <View style={styles.row}>
            <Text style={styles.price}>₦{Number(order.price).toLocaleString('en-NG')}</Text>
            <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString('en-NG')}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  header: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.card, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  tabText: { color: Colors.light.text, fontWeight: Typography.semibold },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: Colors.light.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.bold },
  badge: { color: Colors.light.primary, fontSize: Typography.xs, fontWeight: Typography.bold },
  address: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  arrow: { color: Colors.light.primary, fontSize: Typography.lg, alignSelf: 'center' },
  price: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  date: { color: Colors.light.textSecondary, fontSize: Typography.sm },
});
