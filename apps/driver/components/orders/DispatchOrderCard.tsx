import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock3, Package } from 'lucide-react-native';
import { useAppPalette, hexToRgba } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import type { DriverOrder } from '@/lib/types';

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function statusMeta(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'PENDING_MATCH': return { label: 'Waiting',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    case 'MATCHED':       return { label: 'Offered',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' };
    case 'ACCEPTED':      return { label: 'Accepted',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' };
    case 'IN_TRANSIT':    return { label: 'In Transit', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)' };
    case 'DELIVERED':     return { label: 'Delivered',  color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
    case 'COMPLETED':     return { label: 'Completed',  color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
    case 'CANCELLED':     return { label: 'Cancelled',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  };
    case 'DISPUTED':      return { label: 'Disputed',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' };
    default:              return { label: status.replace(/_/g, ' '), color: '#FFD60A', bg: 'rgba(255,214,10,0.12)' };
  }
}

type DispatchOrderCardProps = {
  order: DriverOrder;
  onAccept?: () => void;
  onDecline?: () => void;
  accepting?: boolean;
  declining?: boolean;
  /** Disables accept/decline actions — used in History view */
  readonly?: boolean;
  onPress?: () => void;
};

export function DispatchOrderCard({
  order,
  onAccept,
  onDecline,
  accepting = false,
  declining = false,
  readonly = false,
  onPress,
}: DispatchOrderCardProps) {
  const palette = useAppPalette();
  const { label, color, bg } = statusMeta(order.status);
  const canAccept = !readonly && (order.status === 'PENDING_MATCH' || order.status === 'MATCHED');

  const cardContent = (
    <>
      {/* ── Header: icon + tracking code + status badge ── */}
      <View style={styles.cardHeader}>
        <View style={styles.waybillBox}>
          <Package size={16} color={palette.primary} />
          <Text style={[styles.waybillText, { color: palette.text }]}>{order.trackingCode}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
        </View>
      </View>

      {/* ── Route timeline (matches user app exactly) ── */}
      <View style={styles.routeContainer}>
        <View style={styles.routeTimeline}>
          {/* Pickup dot: outer ring + inner fill (primary colour) */}
          <View style={[styles.routeDotOuter, { backgroundColor: `${palette.primary}20` }]}>
            <View style={[styles.routeDotInner, { backgroundColor: palette.primary }]} />
          </View>
          <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
          {/* Dropoff dot: outer ring + inner fill (green) */}
          <View style={[styles.routeDotOuter, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <View style={[styles.routeDotInner, { backgroundColor: '#10B981' }]} />
          </View>
        </View>
        <View style={styles.routeAddresses}>
          <Text style={[styles.routeAddressText, { color: palette.text }]} numberOfLines={1}>
            {order.pickupFormattedAddress}
          </Text>
          <Text style={[styles.routeAddressTextMuted, { color: palette.textSecondary }]} numberOfLines={1}>
            {order.deliveryFormattedAddress}
          </Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={[styles.cardDivider, { backgroundColor: palette.border }]} />

      {/* ── Footer: date + earnings ── */}
      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Clock3 size={12} color={palette.textSecondary} />
          <Text style={[styles.cardDate, { color: palette.textSecondary }]}>
            {new Date(order.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <Text style={[styles.cardPrice, { color: palette.text }]}>{formatNaira(order.price)}</Text>
      </View>

      {/* ── Accept / Decline CTAs (Dispatch only) ── */}
      {canAccept && (
        <View style={[styles.actionRow, { borderTopColor: palette.border }]}>
          <Pressable
            onPress={onDecline}
            disabled={declining || accepting}
            style={({ pressed }) => [
              styles.declineBtn,
              { borderColor: palette.border, opacity: pressed || declining || accepting ? 0.7 : 1 },
            ]}
          >
            {declining
              ? <ActivityIndicator color={palette.textSecondary} size="small" />
              : <Text style={[styles.declineBtnText, { color: palette.textSecondary }]}>Decline</Text>
            }
          </Pressable>
          <Pressable
            onPress={onAccept}
            disabled={accepting || declining}
            style={({ pressed }) => [
              styles.acceptBtn,
              { backgroundColor: palette.primary, opacity: pressed || accepting || declining ? 0.75 : 1 },
            ]}
          >
            {accepting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.acceptBtnText}>Accept job</Text>
            }
          </Pressable>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.border },
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── card ──
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: 12,
  },

  // ── header ──
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  waybillBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waybillText: {
    fontSize: Typography.sm,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_700Bold' },

  // ── route (left-side timeline — mirrors user app exactly) ──
  routeContainer: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  routeTimeline: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  routeDotOuter: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  routeDotInner: { width: 6, height: 6, borderRadius: 3 },
  routeLine: { width: 1, flex: 1, marginVertical: 2 },
  routeAddresses: { flex: 1, justifyContent: 'space-between', gap: 8 },
  routeAddressText: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium' },
  routeAddressTextMuted: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular' },

  // ── divider ──
  cardDivider: { height: 1 },

  // ── footer ──
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_500Medium' },
  cardPrice: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },

  // ── accept/decline ──
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: 2,
  },
  declineBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  declineBtnText: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  acceptBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { color: '#fff', fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
});
