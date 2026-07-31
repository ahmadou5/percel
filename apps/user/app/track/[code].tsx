import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Maximize2,
  Package,
  RefreshCw,
  Share2,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatusTimeline } from '@/components/order/StatusTimeline';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { http } from '@/lib/api';
import { useAppPalette } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

type PublicOrder = {
  id: string;
  trackingCode: string;
  status: string;
  paymentStatus: string;
  price: number;
  currency: string;
  size: string;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  distanceKm: number;
  estimatedDurationMin: number;
  createdAt: string;
  driver?: {
    id: string;
    fullName: string;
    vehicleType?: string;
    rating?: number;
  } | null;
  statusHistory?: Array<{ id: string; status: string; createdAt: string; note: string | null }>;
  items?: Array<{ id: string; description: string; quantity: number; imageUrl?: string | null }>;
};

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  CREATED: { label: 'Order Created', bg: 'rgba(59, 130, 246, 0.12)', text: '#3B82F6' },
  PENDING_MATCH: { label: 'Finding Courier', bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B' },
  MATCHED: { label: 'Courier Assigned', bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' },
  ACCEPTED: { label: 'Pickup Pending', bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' },
  IN_TRANSIT: { label: 'In Transit', bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6' },
  DELIVERED: { label: 'Delivered', bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' },
  COMPLETED: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' },
  CANCELLED: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444' },
};

export default function PublicTrackScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; desc?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ['public-track', code],
    queryFn: async () => {
      if (!code) throw new Error('Tracking code required');
      const res = await http.get<{ success: boolean; data: PublicOrder }>(`/orders/track/${encodeURIComponent(code)}`);
      return res.data.data;
    },
    enabled: Boolean(code),
    refetchInterval: 15000,
  });

  const order = query.data;
  const statusInfo = order ? STATUS_LABELS[order.status] ?? { label: order.status, bg: palette.card, text: palette.text } : null;

  const trackingUrl = `https://percel-production-f68c.up.railway.app/track/${code ?? ''}`;

  const handleShare = async () => {
    void haptics.press();
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(trackingUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        await Share.share({
          title: `Track Package ${code}`,
          message: `Track your Percel delivery live: ${trackingUrl}`,
          url: trackingUrl,
        });
      }
    } catch {}
  };

  if (query.isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.primary} size="large" />
        <Text style={[styles.loadingTitle, { color: palette.text }]}>Searching Waybill...</Text>
        <Text style={[styles.loadingBody, { color: palette.textSecondary }]}>Fetching live status for {code}</Text>
      </SafeAreaView>
    );
  }

  if (query.isError || !order) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: palette.bg }]}>
        <View style={[styles.errorIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <AlertCircle size={36} color="#EF4444" />
        </View>
        <Text style={[styles.loadingTitle, { color: palette.text }]}>Waybill Not Found</Text>
        <Text style={[styles.loadingBody, { color: palette.textSecondary }]}>
          We couldn't find delivery records for "{code}". Please check your tracking code and try again.
        </Text>
        <Pressable
          onPress={() => void query.refetch()}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: palette.primary }, pressed && { opacity: 0.8 }]}
        >
          <RefreshCw size={16} color="#FFF" />
          <Text style={styles.primaryBtnText}>Retry Tracking</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const packagePhotos = order.items
    ?.filter((i) => Boolean(i.imageUrl))
    .map((i) => ({ url: i.imageUrl!, desc: i.description })) ?? [
    {
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
      desc: 'Package item photo',
    },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ArrowLeft size={18} color={palette.text} />
          </Pressable>
          <View style={styles.headerBrand}>
            <Package size={20} color={palette.primary} />
            <Text style={[styles.brandText, { color: palette.text }]}>Percel Tracking</Text>
          </View>
          <Pressable onPress={handleShare} style={[styles.iconBtn, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Share2 size={18} color={palette.text} />
          </Pressable>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.waybillBadgeWrap}>
              <Text style={[styles.waybillLabel, { color: palette.textSecondary }]}>Waybill Tracking Code</Text>
              <Text style={[styles.waybillCode, { color: palette.text }]}>{order.trackingCode}</Text>
            </View>
            {statusInfo ? (
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.text }]} />
                <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
              </View>
            ) : null}
          </View>

          {/* Progress Banner */}
          <View style={[styles.etaBanner, { backgroundColor: `${palette.primary}12`, borderColor: `${palette.primary}30` }]}>
            <View style={styles.etaLeft}>
              <Clock size={20} color={palette.primary} />
              <View>
                <Text style={[styles.etaLabel, { color: palette.textSecondary }]}>Est. Delivery</Text>
                <Text style={[styles.etaValue, { color: palette.text }]}>{order.estimatedDurationMin ?? 45} mins approx.</Text>
              </View>
            </View>
            <View style={styles.etaRight}>
              <ShieldCheck size={18} color="#10B981" />
              <Text style={[styles.verifiedText, { color: '#10B981' }]}>Verified Order</Text>
            </View>
          </View>
        </View>

        {/* Route Card */}
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Delivery Route</Text>
          <View style={styles.routeContainer}>
            <View style={styles.routeConnectorCol}>
              <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
              <View style={[styles.routeLine, { backgroundColor: palette.border }]} />
              <View style={[styles.routeDot, { backgroundColor: palette.primary }]} />
            </View>
            <View style={styles.routeDetailsCol}>
              <View style={styles.routeItem}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Pickup Location</Text>
                <Text style={[styles.routeAddress, { color: palette.text }]}>{order.pickupFormattedAddress}</Text>
              </View>
              <View style={styles.routeItem}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>Destination Address</Text>
                <Text style={[styles.routeAddress, { color: palette.text }]}>{order.deliveryFormattedAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Package Photos */}
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.photoHeaderRow}>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Package Photo(s)</Text>
            <Text style={{ fontSize: 11, fontFamily: Typography.family.medium, color: palette.primary }}>Tap to view</Text>
          </View>
          <View style={styles.photoGrid}>
            {packagePhotos.map((photo, idx) => (
              <Pressable
                key={idx}
                onPress={() => setPreviewPhoto(photo)}
                style={({ pressed }) => [styles.photoThumbCard, { borderColor: palette.border }, pressed && { opacity: 0.8 }]}
              >
                <Image source={{ uri: photo.url }} style={styles.photoImg} />
                <View style={styles.expandOverlay}>
                  <Maximize2 size={14} color="#FFF" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Driver Profile */}
        {order.driver ? (
          <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Assigned Courier</Text>
            <View style={styles.driverRow}>
              <View style={[styles.driverAvatar, { backgroundColor: `${palette.primary}20` }]}>
                <User size={20} color={palette.primary} />
              </View>
              <View style={styles.driverMeta}>
                <Text style={[styles.driverName, { color: palette.text }]}>{order.driver.fullName}</Text>
                <Text style={[styles.driverSub, { color: palette.textSecondary }]}>
                  {order.driver.vehicleType ? `${order.driver.vehicleType} Courier` : 'Delivery Partner'}
                </Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Truck size={14} color="#10B981" />
                <Text style={{ fontSize: 11, fontFamily: Typography.family.bold, color: '#10B981' }}>Active</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Status History Timeline */}
        {order.statusHistory && order.statusHistory.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Tracking History</Text>
            <StatusTimeline items={order.statusHistory} orderStatus={order.status} />
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: palette.card, borderColor: palette.border }, pressed && { opacity: 0.8 }]}
          >
            {copied ? <CheckCircle2 size={18} color="#10B981" /> : <Copy size={18} color={palette.text} />}
            <Text style={[styles.actionBtnText, { color: copied ? '#10B981' : palette.text }]}>
              {copied ? 'Link Copied!' : 'Copy Tracking Link'}
            </Text>
          </Pressable>
        </View>

        {/* Footer info */}
        <View style={styles.footerWrap}>
          <Text style={[styles.footerText, { color: palette.textSecondary }]}>
            Powered by Percel Logistics • Live Web Dispatch
          </Text>
        </View>
      </ScrollView>

      {/* Enlarged Photo Lightbox Modal */}
      {previewPhoto ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
          <View style={styles.modalBg}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPreviewPhoto(null)} />
            <View style={[styles.lightboxCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.lightboxHeader}>
                <Text style={[styles.lightboxTitle, { color: palette.text }]}>Package Preview</Text>
                <Pressable onPress={() => setPreviewPhoto(null)} style={[styles.closeBtn, { backgroundColor: palette.bg }]}>
                  <X size={18} color={palette.text} />
                </Pressable>
              </View>
              <Image source={{ uri: previewPhoto.url }} style={styles.lightboxImage} resizeMode="contain" />
              {previewPhoto.desc ? (
                <Text style={[styles.lightboxDesc, { color: palette.textSecondary }]}>{previewPhoto.desc}</Text>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 14 },
  loadingBody: { fontSize: Typography.sm, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  errorIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, height: 48, borderRadius: 14, marginTop: 20 },
  primaryBtnText: { color: '#FFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
  scrollContent: { padding: Spacing.lg, gap: 16, maxWidth: 640, alignSelf: 'center', width: '100%' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: 16 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  waybillBadgeWrap: { gap: 2 },
  waybillLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  waybillCode: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  etaBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderRadius: 14, borderWidth: 1 },
  etaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etaLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase' },
  etaValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  etaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  sectionCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionTitle: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Typography.family.bold },
  routeContainer: { flexDirection: 'row', gap: 12 },
  routeConnectorCol: { alignItems: 'center', paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, flex: 1, marginVertical: 4 },
  routeDetailsCol: { flex: 1, gap: 14 },
  routeItem: { gap: 2 },
  routeLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  routeAddress: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  photoHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumbCard: { width: 80, height: 80, borderRadius: 14, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  expandOverlay: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 6 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  driverMeta: { flex: 1 },
  driverName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  driverSub: { fontSize: Typography.xs, marginTop: 2, fontFamily: Typography.family.medium },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  actionSection: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 16, borderWidth: 1 },
  actionBtnText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  footerWrap: { alignItems: 'center', marginTop: 12, marginBottom: 24 },
  footerText: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  lightboxCard: { width: '100%', maxWidth: 480, borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  lightboxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lightboxTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: 320, borderRadius: 16 },
  lightboxDesc: { fontSize: Typography.sm, textAlign: 'center', fontFamily: Typography.family.medium },
});
