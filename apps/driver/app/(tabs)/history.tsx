import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Card, Pill, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { demoOrders } from '@/lib/demo-data';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

export default function HistoryScreen() {
  const [page, setPage] = useState(1);
  const pageSize = 2;
  const history = useMemo(() => demoOrders.slice(0, page * pageSize), [page]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Delivery history</Text>
          <Text style={styles.title}>Past routes and completed jobs.</Text>
          <Text style={styles.subtitle}>Use this timeline to review earnings, distances, and the most recent jobs completed on shift.</Text>
        </View>

        <SectionHeader title="Recent deliveries" caption={`${history.length} shown`} />
        {history.map((order) => (
          <Card key={order.id}>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.code}>{order.trackingCode}</Text>
                <Text style={styles.route}>{order.pickupFormattedAddress} → {order.deliveryFormattedAddress}</Text>
              </View>
              <Pill label={order.status} tone={order.status === 'COMPLETED' ? 'success' : 'warning'} />
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{formatCurrency(order.price)}</Text>
              <Text style={styles.meta}>{order.distanceKm.toFixed(1)} km</Text>
              <Text style={styles.meta}>{new Date(order.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</Text>
            </View>
          </Card>
        ))}

        <Pressable onPress={() => setPage((value) => value + 1)} style={styles.moreButton}>
          <Text style={styles.moreText}>Load more</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 30 },
  hero: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  eyebrow: { color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1, gap: 4 },
  code: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  route: { color: '#CBD5E1', fontSize: 13, lineHeight: 19 },
  metaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  meta: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  moreButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  moreText: { color: '#F8FAFC', fontSize: 13, fontWeight: '800' },
});
