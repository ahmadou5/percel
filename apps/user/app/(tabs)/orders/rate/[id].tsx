import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, Text, View } from 'react-native';

import { DriverCard } from '@/components/order/DriverCard';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrderDetail, useRateOrder } from '@/hooks/useOrder';
import { useAppPalette } from '@/lib/theme';

function RatingStar({ filled, onPress, index, scale, colors }: { filled: boolean; onPress: () => void; index: number; scale: Animated.Value; colors: any }) {
  return (
    <Pressable onPress={onPress} style={styles.starPressable} accessibilityRole="button" accessibilityLabel={`Rate ${index + 1} star${index === 0 ? '' : 's'}`}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <FontAwesome name="star" size={28} color={filled ? colors.warning : colors.border} />
      </Animated.View>
    </Pressable>
  );
}

export default function OrderRatingScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOrderDetail(id);
  const rateOrder = useRateOrder();
  const order = query.data;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const scaleValues = useRef(Array.from({ length: 5 }, () => new Animated.Value(1))).current;

  useEffect(() => {
    scaleValues.forEach((scale, index) => {
      Animated.spring(scale, {
        toValue: index < rating ? 1.08 : 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 160,
      }).start();
    });
  }, [rating, scaleValues]);

  const driver = useMemo(() => order?.driver ?? null, [order?.driver]);
  const alreadyRated = Boolean(order?.rating?.userRating);

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.text }]}>Loading rating…</Text>
      </View>
    );
  }

  if (order.status !== 'COMPLETED') {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.text }]}>Confirm delivery first</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary, textAlign: 'center' }]}>
          You can only rate after confirming the delivery is complete.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.heroBackButton, { backgroundColor: palette.primary, borderColor: palette.primary, marginTop: 12, paddingHorizontal: 24, width: 'auto', height: 46, borderRadius: 14 }]}
        >
          <Text style={{ color: '#fff', fontFamily: Typography.family.bold, fontSize: Typography.md }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: `${palette.primary}0D`, borderColor: `${palette.primary}26`, borderWidth: 1 }]}>
        <View style={styles.heroHeader}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.heroBackButton,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ChevronLeft size={16} color={palette.text} />
          </Pressable>
          <View style={styles.heroMeta}>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>Delivery complete</Text>
            <Text style={[styles.title, { color: palette.text }]}>{order.trackingCode}</Text>
          </View>
          
        </View>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{alreadyRated ? 'You already left feedback for this delivery.' : 'Tell us how the driver performed.'}</Text>
      </View>

      <DriverCard driver={driver} onCall={undefined} />

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Your rating</Text>
        <View style={styles.starsRow}>
          {scaleValues.map((scale, index) => (
            <RatingStar key={index} index={index} filled={index < rating} scale={scale} onPress={() => setRating(index + 1)} colors={palette} />
          ))}
        </View>
        <Text style={[styles.helper, { color: palette.textSecondary }]}>{rating >= 4 ? 'Great delivery' : rating >= 3 ? 'Good delivery' : 'Needs improvement'}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Comment</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Add a short note for the driver (optional)"
          placeholderTextColor={palette.textSecondary}
          multiline
          style={[styles.commentInput, { borderColor: palette.border, backgroundColor: palette.bg, color: palette.text }]}
        />
      </View>

      {order.rating ? (
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(10,132,255,0.08)' }]}>
          <Text style={[styles.summaryTitle, { color: palette.text }]}>{`Submitted ${order.rating.userRating}/5`}</Text>
          <Text style={[styles.summaryBody, { color: palette.textSecondary }]}>{order.rating.userComment ?? 'No comment left'}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable onPress={() => router.replace('/(tabs)/orders')} style={[styles.secondaryButton, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Text style={[styles.secondaryText, { color: palette.text }]}>Skip</Text>
        </Pressable>
        <Pressable
          disabled={rateOrder.isPending || alreadyRated}
          onPress={async () => {
            await rateOrder.mutateAsync({ id: order.id, userRating: rating, userComment: comment.trim() || undefined });
            router.replace('/(tabs)/orders');
          }}
          style={[styles.primaryButton, { backgroundColor: palette.primary }, (rateOrder.isPending || alreadyRated) ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.primaryText}>{alreadyRated ? 'Rated' : 'Submit Rating'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  hero: { gap: 6, borderRadius: 28, padding: Spacing.lg },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.4, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 26, fontFamily: Typography.family.bold },
  subtitle: { fontSize: Typography.sm, lineHeight: 21, fontFamily: Typography.family.regular, textAlign: 'center' },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  starPressable: { padding: 4 },
  helper: { textAlign: 'center', fontSize: Typography.sm, fontFamily: Typography.family.medium },
  commentInput: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.md,
    fontFamily: Typography.family.regular,
    textAlignVertical: 'top',
  },
  summaryCard: { borderRadius: 20, padding: Spacing.lg, gap: 4 },
  summaryTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  secondaryButton: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  heroMeta: { flex: 1, gap: 4, alignItems: 'flex-end' },
  heroBackButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
