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
  const snapPoints = useMemo(() => ['10%', '56%'], []);
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

          <View style={styles.routeRow}>
            <Text style={[styles.hub, { color: palette.text }]} numberOfLines={1}>
              {data.origin_hub}
            </Text>
            <Text style={[styles.arrow, { color: palette.primary }]}></Text>
            <Text style={[styles.hub, { color: palette.text }]} numberOfLines={1}>
              {data.destination_hub}
            </Text>
          </View>
          <Text style={[styles.orderCode, { color: palette.textSecondary }]}>Order ID  {orderCode}</Text>

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
              {data.driver.phone ? (
                <Pressable
                  accessibilityLabel="Call driver"
                  onPress={handleCall}
                  style={({ pressed }) => [
                    styles.callButton,
                    { backgroundColor: palette.card, borderColor: palette.border },
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                >
                  <Phone size={14} color={palette.primary} />
                </Pressable>
              ) : null}
            </View>
          </View>
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
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hub: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.bold },
  arrow: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
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
});
