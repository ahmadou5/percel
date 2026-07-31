import BottomSheet from '@gorhom/bottom-sheet';
import { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Maximize2, MessageSquare, Phone, X } from 'lucide-react-native';

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
  items?: Array<{ id?: string; description?: string; imageUrl?: string | null }>;
  onOpenChat?: () => void;
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

export function OrderTrackingSheet({ data, orderCode, items, onOpenChat }: Props) {
  const palette = useAppPalette();
  const user = useAuthStore((state) => state.user);
  const snapPoints = useMemo(() => ['10%', '38%', '74%'], []);
  const statusLabel = STATUS_LABELS[data.status] ?? data.status.replace(/_/g, ' ');

  const [previewItem, setPreviewItem] = useState<{ url: string; desc?: string } | null>(null);

  const packagePhotos = useMemo(() => {
    const list = items || data.items || [];
    const uploaded = list
      .filter((i) => Boolean(i.imageUrl))
      .map((i) => ({ url: i.imageUrl!, desc: i.description }));

    if (uploaded.length > 0) return uploaded;

    return [
      {
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
        desc: 'Parcel item package',
      },
    ];
  }, [items, data.items]);

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

          {/* Package Photos Row */}
          {packagePhotos.length > 0 && (
            <View style={styles.photosSection}>
              <View style={styles.photosHeader}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Package Photo(s)</Text>
                <Text style={{ fontSize: 10, fontFamily: Typography.family.medium, color: palette.primary }}>Tap to expand</Text>
              </View>
              <View style={styles.photosRow}>
                {packagePhotos.map((photo, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setPreviewItem(photo)}
                    style={({ pressed }) => [styles.photoThumbWrapper, { borderColor: palette.border }, pressed && { opacity: 0.8 }]}
                  >
                    <Image source={{ uri: photo.url }} style={styles.photoThumb} />
                    <View style={styles.expandIconOverlay}>
                      <Maximize2 size={12} color="#FFFFFF" />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

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
              { }
            </View>
          </View>

          <View style={styles.actionRow}>
            {data.driver.phone ? (
              <Pressable
                onPress={handleCall}
                style={({ pressed }) => [
                  styles.summaryActionBtn,
                  { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 },
                  pressed ? { opacity: 0.8 } : null,
                ]}
              >
                <Phone size={16} color={palette.text} strokeWidth={2.5} />
                <Text style={[styles.summaryActionBtnText, { color: palette.text }]}>Call</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                void haptics.press();
                onOpenChat?.();
              }}
              style={({ pressed }) => [
                styles.summaryActionPrimary,
                { backgroundColor: palette.primary },
                pressed ? { opacity: 0.8 } : null,
              ]}
            >
              <MessageSquare size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.summaryActionPrimaryText}>Chat with Courier</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      {/* Package Photo Enlarged Lightbox Modal */}
      {previewItem && (
        <Modal visible={Boolean(previewItem)} transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
          <View style={styles.lightboxBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreviewItem(null)} />
            <View style={[styles.lightboxCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.lightboxHeader}>
                <Text style={[styles.lightboxTitle, { color: palette.text }]}>Package Photo Preview</Text>
                <Pressable onPress={() => setPreviewItem(null)} style={[styles.closeButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <X size={18} color={palette.text} />
                </Pressable>
              </View>
              <Image source={{ uri: previewItem.url }} style={styles.lightboxImage} resizeMode="contain" />
              {previewItem.desc ? (
                <Text style={[styles.lightboxDesc, { color: palette.textSecondary }]}>{previewItem.desc}</Text>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.md,
  },
  summaryActionBtn: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  summaryActionBtnText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  summaryActionPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  summaryActionPrimaryText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
    color: '#FFFFFF',
  },
  photosSection: { gap: 6, marginVertical: 4 },
  photosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumbWrapper: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%' },
  expandIconOverlay: { position: 'absolute', right: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 3 },
  lightboxBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  lightboxCard: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  lightboxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lightboxTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  closeButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: 260, borderRadius: 14 },
  lightboxDesc: { fontSize: Typography.sm, fontFamily: Typography.family.regular, textAlign: 'center' },
});
