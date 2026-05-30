import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { DriverCard } from '@/components/order/DriverCard';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useOrderDetail, useRateOrder } from '@/hooks/useOrder';
import { Text, View } from '@/components/Themed';

function RatingStar({ filled, onPress, index, scale }: { filled: boolean; onPress: () => void; index: number; scale: Animated.Value }) {
  return (
    <Pressable onPress={onPress} style={styles.starPressable} accessibilityRole="button" accessibilityLabel={`Rate ${index + 1} star${index === 0 ? '' : 's'}`}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <FontAwesome name="star" size={28} color={filled ? Colors.light.warning : Colors.light.border} />
      </Animated.View>
    </Pressable>
  );
}

export default function OrderRatingScreen() {
  const router = useRouter();
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
      <View style={styles.center}>
        <Text style={styles.loading}>Loading rating…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Delivery complete</Text>
        <Text style={styles.title}>{order.trackingCode}</Text>
        <Text style={styles.subtitle}>{alreadyRated ? 'You already left feedback for this delivery.' : 'Tell us how the driver performed.'}</Text>
      </View>

      <DriverCard driver={driver} onCall={undefined} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your rating</Text>
        <View style={styles.starsRow}>
          {scaleValues.map((scale, index) => (
            <RatingStar key={index} index={index} filled={index < rating} scale={scale} onPress={() => setRating(index + 1)} />
          ))}
        </View>
        <Text style={styles.helper}>{rating >= 4 ? 'Great delivery' : rating >= 3 ? 'Good delivery' : 'Needs improvement'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Comment</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Add a short note for the driver (optional)"
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          style={styles.commentInput}
        />
      </View>

      {order.rating ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{`Submitted ${order.rating.userRating}/5`}</Text>
          <Text style={styles.summaryBody}>{order.rating.userComment ?? 'No comment left'}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable onPress={() => router.replace('/(tabs)/orders')} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Skip</Text>
        </Pressable>
        <Pressable
          disabled={rateOrder.isPending || alreadyRated}
          onPress={async () => {
            await rateOrder.mutateAsync({ id: order.id, userRating: rating, userComment: comment.trim() || undefined });
            router.replace('/(tabs)/orders');
          }}
          style={[styles.primaryButton, (rateOrder.isPending || alreadyRated) ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.primaryText}>{alreadyRated ? 'Rated' : 'Submit Rating'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  hero: { gap: 6, borderRadius: 28, padding: Spacing.lg, backgroundColor: '#0F172A' },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.4, fontSize: Typography.xs, fontWeight: Typography.bold },
  title: { color: '#fff', fontSize: 26, fontWeight: Typography.bold },
  subtitle: { color: '#CBD5E1', fontSize: Typography.sm, lineHeight: 21 },
  card: { backgroundColor: Colors.light.card, borderRadius: 24, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  starPressable: { padding: 4 },
  helper: { color: Colors.light.textSecondary, textAlign: 'center', fontSize: Typography.sm },
  commentInput: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: '#fff',
    color: Colors.light.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.md,
    textAlignVertical: 'top',
  },
  summaryCard: { backgroundColor: 'rgba(10,132,255,0.08)', borderRadius: 20, padding: Spacing.lg, gap: 4 },
  summaryTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  summaryBody: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  secondaryButton: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.card },
  secondaryText: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.primary },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
