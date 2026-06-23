import BottomSheet from '@gorhom/bottom-sheet';
import { useMemo } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Phone } from 'lucide-react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { TrackingData } from '@/hooks/useLiveTracking';
import { useAppPalette } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { useAuthStore } from '@/store/auth.store';

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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function OrderTrackingSheet({ data, orderCode }: Props) {
  const palette = useAppPalette();
  const user = useAuthStore((state) => state.user);
  const snapPoints = useMemo(() => ['10%','26%', '62%'], []);
  const statusLabel = STATUS_LABELS[data.status] ?? data.status.replace(/_/g, ' ');

  const handleCall = () => {
    void haptics.press();
    if (data.driver.phone) {
      void Linking.openURL(`tel:${data.driver.phone}`);
    }
  };

  return (
    <>
      <BottomSheet
        index={1}
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
  <Text style={[styles.orderCode, { color: palette.textSecondary }]}>Order ID  {orderCode}</Text>
          <View style={styles.routeContainer}>
            <View style={styles.routeConnectorCol}>
              <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
              <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
              <View style={[styles.routeDot, { backgroundColor: palette.primary }]} />
            </View>
            <View style={styles.routeDetailsCol}>
              <View style={styles.routeDetailItem}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Pickup Location</Text>
                <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                  {data.origin_hub}
                </Text>
              </View>
              <View style={styles.routeDetailItem}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Delivery Location</Text>
                <Text style={[styles.routeValue, { color: palette.text }]} numberOfLines={2}>
                  {data.destination_hub}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <MetaItem label="Departed" value={formatDateTime(data.departed_at)} />
            <MetaItem label="Est. Arrival" value={formatDateTime(data.estimated_delivery)} />
            <MetaItem label="Distance" value={`${data.distance_km.toFixed(1)} km`} />
            <MetaItem label="Weight" value={`${data.weight_kg.toFixed(1)} kg`} />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.profilesRow}>
            {/* Sender Profile */}
            <View style={[styles.profileCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatarFallback, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <Text style={[styles.profileInitials, { color: palette.primary }]}>{initials(user?.fullName ?? 'Sender')}</Text>
                </View>
              )}
              <View style={styles.profileMeta}>
                <Text style={[styles.profileRole, { color: palette.textSecondary }]}>Sender</Text>
                <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1}>
                  {user?.fullName ?? 'Percel User'}
                </Text>
              </View>
            </View>

            {/* Driver Profile */}
            <View style={[styles.profileCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              {data.driver.avatar_url ? (
                <Image source={{ uri: data.driver.avatar_url }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatarFallback, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <Text style={[styles.profileInitials, { color: palette.primary }]}>{initials(data.driver.name) || 'PD'}</Text>
                </View>
              )}
              <View style={styles.profileMeta}>
                <Text style={[styles.profileRole, { color: palette.textSecondary }]}>Driver</Text>
                <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1}>
                  {data.driver.name}
                </Text>
              </View>
              {}
            </View>
          </View>

          {data.driver.phone ? (
            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                styles.summaryAction,
                { backgroundColor: palette.primary },
                pressed ? { opacity: 0.8 } : null,
              ]}
            >
              <Phone size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.summaryActionText}>Call Driver</Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheet>
    </>
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
  routeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  routeConnectorCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  routeDetailsCol: {
    flex: 1,
    gap: Spacing.md,
  },
  routeDetailItem: {
    gap: 2,
  },
  routeLabel: {
    fontSize: 9,
    fontFamily: Typography.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
    lineHeight: 18,
  },
  orderCode: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.md },
  metaItem: { width: '50%', gap: 3 },
  metaLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  metaValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold, paddingRight: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 2 },
  profilesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  profileCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  profileAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  profileMeta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  profileRole: {
    fontSize: 10,
    fontFamily: Typography.family.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryAction: {
    marginTop: Spacing.md,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  summaryActionText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
    color: '#FFFFFF',
  },
});
