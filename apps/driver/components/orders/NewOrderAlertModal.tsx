import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
} from 'react-native';
import { MapPin, Navigation, Package, DollarSign, Clock, X, Zap } from 'lucide-react-native';
import { useAppPalette, hexToRgba } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { subscribeDriverSocket } from '@/lib/socket';
import { useDriverStore } from '@/store/driver.store';
import { useAcceptOrder } from '@/hooks/useDriverOrders';
import { haptics } from '@/lib/haptics';

type BroadcastOrder = {
  id: string;
  trackingCode: string;
  price: number;
  distanceKm: number;
  estimatedDurationMin: number;
  pickupFormattedAddress: string;
  deliveryFormattedAddress: string;
  size: string;
};

function formatNaira(value: number) {
  return `₦${Math.max(0, value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function NewOrderAlertModal() {
  const palette = useAppPalette();
  const isOnline = useDriverStore((s) => s.isOnline);
  const acceptOrder = useAcceptOrder();

  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastOrder | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Listen for socket events
  useEffect(() => {
    if (!isOnline) return;

    const unsub = subscribeDriverSocket('new_order_available', (data: any) => {
      if (!data || !data.id) return;
      const orderPayload: BroadcastOrder = {
        id: data.id,
        trackingCode: data.trackingCode ?? 'ORD-NEW',
        price: Number(data.price ?? 2500),
        distanceKm: Number(data.distanceKm ?? 3.5),
        estimatedDurationMin: Number(data.estimatedDurationMin ?? 15),
        pickupFormattedAddress: data.pickupFormattedAddress ?? 'Pickup Address',
        deliveryFormattedAddress: data.deliveryFormattedAddress ?? 'Delivery Address',
        size: data.size ?? 'MEDIUM',
      };
      
      setActiveBroadcast(orderPayload);
      setSecondsLeft(30);
      progressAnim.setValue(1);

      // Trigger notification haptics
      void haptics.impact();

      // Start 30s linear animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    });

    return () => unsub();
  }, [isOnline, progressAnim]);

  // Countdown timer interval
  useEffect(() => {
    if (!activeBroadcast) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveBroadcast(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeBroadcast]);

  if (!activeBroadcast) return null;

  const handleAccept = async () => {
    try {
      void haptics.impact();
      await acceptOrder.mutateAsync(activeBroadcast.id);
      setActiveBroadcast(null);
    } catch {
      setActiveBroadcast(null);
    }
  };

  const handleDecline = () => {
    void haptics.tap();
    setActiveBroadcast(null);
  };

  const widthInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={Boolean(activeBroadcast)} transparent animationType="slide" onRequestClose={handleDecline}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.badgeIcon, { backgroundColor: hexToRgba(palette.primary, 0.14) }]}>
              <Zap size={20} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: palette.primary }]}>NEW DELIVERY JOB</Text>
              <Text style={[styles.title, { color: palette.text }]}>{activeBroadcast.trackingCode}</Text>
            </View>
            <Pressable onPress={handleDecline} style={[styles.closeBtn, { backgroundColor: palette.bg }]}>
              <X size={18} color={palette.textSecondary} />
            </Pressable>
          </View>

          {/* Earnings callout */}
          <View style={[styles.payoutCard, { backgroundColor: hexToRgba('#30D158', 0.12), borderColor: hexToRgba('#30D158', 0.25) }]}>
            <Text style={[styles.payoutLabel, { color: palette.textSecondary }]}>ESTIMATED PAYOUT</Text>
            <Text style={[styles.payoutValue, { color: '#30D158' }]}>{formatNaira(activeBroadcast.price)}</Text>
          </View>

          {/* Route details */}
          <View style={[styles.routeBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={styles.routeRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: '#30D158' }]} />
                <View style={[styles.line, { backgroundColor: palette.border }]} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>PICKUP</Text>
                <Text style={[styles.routeAddr, { color: palette.text }]} numberOfLines={2}>
                  {activeBroadcast.pickupFormattedAddress}
                </Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: '#FF453A' }]} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.routeLabel, { color: palette.textSecondary }]}>DROPOFF</Text>
                <Text style={[styles.routeAddr, { color: palette.text }]} numberOfLines={2}>
                  {activeBroadcast.deliveryFormattedAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* Meta specs */}
          <View style={styles.metaRow}>
            <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <MapPin size={12} color={palette.primary} />
              <Text style={[styles.chipText, { color: palette.text }]}>{activeBroadcast.distanceKm.toFixed(1)} km</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Clock size={12} color="#FFD60A" />
              <Text style={[styles.chipText, { color: palette.text }]}>{activeBroadcast.estimatedDurationMin} min</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Package size={12} color={palette.textSecondary} />
              <Text style={[styles.chipText, { color: palette.text }]}>{activeBroadcast.size}</Text>
            </View>
          </View>

          {/* Countdown Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
              <Animated.View style={[styles.progressFill, { width: widthInterpolate, backgroundColor: palette.primary }]} />
            </View>
            <Text style={[styles.timerText, { color: palette.textSecondary }]}>
              Expires in <Text style={{ color: palette.primary, fontWeight: '700' }}>{secondsLeft}s</Text>
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleDecline}
              style={[styles.declineBtn, { backgroundColor: palette.bg, borderColor: palette.border }]}
            >
              <Text style={[styles.declineText, { color: palette.text }]}>Decline</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleAccept()}
              disabled={acceptOrder.isPending}
              style={({ pressed }) => [
                styles.acceptBtn,
                { backgroundColor: palette.primary, opacity: pressed || acceptOrder.isPending ? 0.85 : 1 },
              ]}
            >
              <Zap size={18} color="#fff" />
              <Text style={styles.acceptText}>
                {acceptOrder.isPending ? 'Accepting…' : 'Accept Job'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 1,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  payoutLabel: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.8,
  },
  payoutValue: {
    fontSize: 28,
    fontFamily: Typography.family.bold,
    letterSpacing: -0.5,
  },
  routeBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  dotCol: {
    alignItems: 'center',
    paddingTop: 4,
    width: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 1.5,
    flex: 1,
    minHeight: 18,
    marginTop: 3,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.5,
  },
  routeAddr: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  progressContainer: {
    gap: 6,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 4,
  },
  declineBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  acceptBtn: {
    flex: 2,
    minHeight: 52,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
