import BottomSheet from '@gorhom/bottom-sheet';
import { useMemo } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { DriverContactRow } from '@/components/order/DriverContactRow';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { TrackingData } from '@/hooks/useLiveTracking';
import { useAppPalette } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

type Props = {
  data: TrackingData;
  orderCode: string;
};

const STATUS_LABELS: Partial<Record<string, string>> = {
  IN_TRANSIT: 'On the way',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  AT_HUB: 'At Sorting Hub',
  PENDING: 'Preparing',
  CREATED: 'Preparing',
  PENDING_MATCH: 'Preparing',
  MATCHED: 'Preparing',
  ACCEPTED: 'On the way',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderTrackingSheet({ data, orderCode }: Props) {
  const palette = useAppPalette();
  const snapPoints = useMemo(() => ['42%'], []);
  const statusLabel = STATUS_LABELS[data.status] ?? data.status.replace(/_/g, ' ');

  const handleCall = () => {
    void haptics.press();
    if (data.driver.phone) {
      void Linking.openURL(`tel:${data.driver.phone}`);
    }
  };

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: palette.card, borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth }}
      handleIndicatorStyle={{ backgroundColor: palette.border }}
    >
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: palette.primary }]}>
            <Text style={[styles.statusText, { color: Colors.dark.text }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <Text style={[styles.hub, { color: palette.text }]} numberOfLines={1}>
            {data.origin_hub}
          </Text>
          <Text style={[styles.arrow, { color: palette.primary }]}>→</Text>
          <Text style={[styles.hub, { color: palette.text }]} numberOfLines={1}>
            {data.destination_hub}
          </Text>
        </View>
        <Text style={[styles.orderCode, { color: palette.textSecondary }]}>Order ID  {orderCode}</Text>

        <View style={styles.metaGrid}>
          <MetaItem label="Sender" value="Percel user" />
          <MetaItem label="Departed" value={formatDateTime(data.departed_at)} />
          <MetaItem label="Distance" value={`${data.distance_km.toFixed(1)} km`} />
          <MetaItem label="Weight" value={`${data.weight_kg.toFixed(1)} kg`} />
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        <DriverContactRow
          driver={data.driver}
          onChat={() => Alert.alert('Chat', 'Driver chat is coming soon.')}
          onCall={handleCall}
        />
      </View>
    </BottomSheet>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  const palette = useAppPalette();

  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: palette.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  badgeRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  statusBadge: { borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: 7 },
  statusText: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hub: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.bold },
  arrow: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  orderCode: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.md },
  metaItem: { width: '50%', gap: 3 },
  metaLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  metaValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold, paddingRight: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 2 },
});
