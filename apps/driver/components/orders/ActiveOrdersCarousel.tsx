import React from 'react';
import {
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Package, MapPin, ChevronRight } from 'lucide-react-native';
import { useAppPalette, hexToRgba } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { DriverOrder } from '@/lib/types';

type Props = {
  orders: DriverOrder[];
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
};

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function ActiveOrdersCarousel({ orders, selectedOrderId, onSelectOrder }: Props) {
  const palette = useAppPalette();

  if (orders.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>
        ACTIVE ORDERS ({orders.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {orders.map((order, idx) => {
          const isSelected = order.id === selectedOrderId;
          const statusColor = order.status === 'ACCEPTED' ? '#FFD60A' : '#30D158';

          return (
            <Pressable
              key={order.id}
              onPress={() => onSelectOrder(order.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: isSelected ? palette.card : palette.bg,
                  borderColor: isSelected ? palette.primary : palette.border,
                  borderWidth: isSelected ? 2 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                  <Package size={14} color={palette.primary} />
                </View>
                <Text style={[styles.orderCode, { color: palette.text }]}>{order.trackingCode}</Text>

                <View style={[styles.statusBadge, { backgroundColor: hexToRgba(statusColor, 0.14) }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{order.status}</Text>
                </View>
              </View>

              <View style={styles.routeRow}>
                <MapPin size={12} color={palette.textSecondary} />
                <Text style={[styles.routeText, { color: palette.textSecondary }]} numberOfLines={1}>
                  {(order.pickupFormattedAddress ?? 'Pickup').split(',')[0]} → {(order.deliveryFormattedAddress ?? 'Delivery').split(',')[0]}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.priceText, { color: palette.text }]}>{formatNaira(order.price)}</Text>
                <View style={styles.selectHint}>
                  <Text style={[styles.selectText, { color: isSelected ? palette.primary : palette.textSecondary }]}>
                    {isSelected ? 'Viewing' : 'Select'}
                  </Text>
                  <ChevronRight size={12} color={isSelected ? palette.primary : palette.textSecondary} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    marginVertical: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  card: {
    width: 220,
    borderRadius: 18,
    padding: Spacing.md,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCode: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontFamily: Typography.family.bold,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  selectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  selectText: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
  },
});
