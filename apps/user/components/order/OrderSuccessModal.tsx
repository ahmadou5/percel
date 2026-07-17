import { CheckCircle, Copy, Package, Truck } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Clipboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

type OrderSuccessModalProps = {
  visible: boolean;
  trackingCode: string;
  totalPrice: number;
  deliveryType: 'INTRASTATE' | 'INTERSTATE';
  estimatedPickup?: string;  // for intrastate: "8 mins"
  estimatedHubArrival?: string; // for interstate: "1-2 days"
  onClose: () => void;
  onTrackOrder: () => void;
};

function formatMoney(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function OrderSuccessModal({
  visible,
  trackingCode,
  totalPrice,
  deliveryType,
  estimatedPickup,
  estimatedHubArrival,
  onClose,
  onTrackOrder,
}: OrderSuccessModalProps) {
  const palette = useAppPalette();
  const isIntrastate = deliveryType === 'INTRASTATE';

  // Pulse animation for the check icon ring
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (visible) {
      ringScale.value = withRepeat(
        withSequence(
          withDelay(600, withTiming(1.35, { duration: 900, easing: Easing.out(Easing.ease) })),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withDelay(600, withTiming(0, { duration: 900 })),
          withTiming(0.4, { duration: 700 }),
        ),
        -1,
        false,
      );
    }
  }, [visible]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const copyTracking = () => {
    Clipboard.setString(trackingCode);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Animated backdrop blur layer */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.overlay]}
        />

        {/* Bottom sheet */}
        <Animated.View
          entering={SlideInUp.springify().damping(22).stiffness(180)}
          style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          {/* Gradient accent bar */}
          <View style={styles.accentBar}>
            <View style={[styles.accentSegment, { backgroundColor: palette.primary, opacity: 0.9 }]} />
            <View style={[styles.accentSegment, { backgroundColor: '#10B981', opacity: 0.8 }]} />
            <View style={[styles.accentSegment, { backgroundColor: '#8B5CF6', opacity: 0.7 }]} />
          </View>

          {/* Check icon with pulsing ring */}
          <View style={styles.iconCenter}>
            <Animated.View
              style={[
                styles.iconRing,
                { borderColor: palette.primary },
                ringStyle,
              ]}
            />
            <Animated.View
              entering={FadeIn.delay(200).springify().damping(14)}
              style={[styles.iconBadge, { backgroundColor: `${palette.primary}18` }]}
            >
              <CheckCircle size={52} color={palette.primary} strokeWidth={1.5} />
            </Animated.View>
          </View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.headingWrap}>
            <Text style={[styles.successTitle, { color: palette.text }]}>Order Confirmed!</Text>
            <Text style={[styles.successSubtitle, { color: palette.textSecondary }]}>
              {isIntrastate
                ? 'A driver is being matched to pick up your parcel shortly.'
                : 'Your parcel is queued for interstate hub routing.'}
            </Text>
          </Animated.View>

          {/* Tracking ID chip */}
          <Animated.View entering={FadeInDown.delay(420).duration(400)}>
            <Pressable
              onPress={copyTracking}
              style={({ pressed }) => [
                styles.trackingChip,
                {
                  backgroundColor: `${palette.primary}12`,
                  borderColor: `${palette.primary}30`,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.trackingChipLeft}>
                <Text style={[styles.trackingLabel, { color: palette.textSecondary }]}>
                  Tracking ID
                </Text>
                <Text style={[styles.trackingCode, { color: palette.primary }]}>
                  {trackingCode}
                </Text>
              </View>
              <View style={[styles.copyBtn, { backgroundColor: `${palette.primary}18` }]}>
                <Copy size={14} color={palette.primary} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Info grid */}
          <Animated.View
            entering={FadeInDown.delay(520).duration(400)}
            style={[styles.infoGrid, { borderColor: palette.border }]}
          >
            {/* Price paid */}
            <View style={styles.infoCell}>
              <Text style={[styles.infoCellLabel, { color: palette.textSecondary }]}>
                Amount Paid
              </Text>
              <Text style={[styles.infoCellValue, { color: palette.text }]}>
                {formatMoney(totalPrice)}
              </Text>
            </View>

            <View style={[styles.infoDivider, { backgroundColor: palette.border }]} />

            {/* Estimated time */}
            <View style={styles.infoCell}>
              <Text style={[styles.infoCellLabel, { color: palette.textSecondary }]}>
                {isIntrastate ? 'Estimated Pickup' : 'Est. Hub Arrival'}
              </Text>
              <Text style={[styles.infoCellValue, { color: palette.text }]}>
                {isIntrastate
                  ? (estimatedPickup ?? '8–15 mins')
                  : (estimatedHubArrival ?? '1–2 days')}
              </Text>
            </View>

            <View style={[styles.infoDivider, { backgroundColor: palette.border }]} />

            {/* Delivery type badge */}
            <View style={styles.infoCell}>
              <Text style={[styles.infoCellLabel, { color: palette.textSecondary }]}>
                Delivery Type
              </Text>
              <View style={styles.typeBadgeRow}>
                {isIntrastate ? (
                  <Package size={13} color={palette.primary} />
                ) : (
                  <Truck size={13} color='#8B5CF6' />
                )}
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: isIntrastate ? palette.primary : '#8B5CF6' },
                  ]}
                >
                  {isIntrastate ? 'Local' : 'Interstate'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(620).duration(400)} style={styles.actionsRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: palette.border, backgroundColor: palette.bg },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                Back to Home
              </Text>
            </Pressable>

            <Pressable
              onPress={onTrackOrder}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: palette.primary },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Track Order</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    paddingTop: 0,
    gap: Spacing.lg,
    overflow: 'hidden',
  },

  // Accent
  accentBar: { flexDirection: 'row', height: 4, marginHorizontal: -Spacing.lg, marginBottom: 4 },
  accentSegment: { flex: 1 },

  // Icon
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  iconRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  iconBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Heading
  headingWrap: { alignItems: 'center', gap: 6 },
  successTitle: { fontSize: 26, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  successSubtitle: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },

  // Tracking chip
  trackingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  trackingChipLeft: { flex: 1, gap: 3 },
  trackingLabel: { fontSize: 11, fontFamily: Typography.family.medium, letterSpacing: 0.4 },
  trackingCode: { fontSize: Typography.lg, fontFamily: Typography.family.bold, letterSpacing: 1.5 },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info grid
  infoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
  },
  infoCell: { flex: 1, alignItems: 'center', gap: 5 },
  infoCellLabel: { fontSize: 11, fontFamily: Typography.family.medium, textAlign: 'center' },
  infoCellValue: { fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
  infoDivider: { width: 1, height: 44 },
  typeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeBadgeText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },

  // Actions
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  secondaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  primaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: Typography.sm, fontFamily: Typography.family.bold, color: '#fff' },
});
