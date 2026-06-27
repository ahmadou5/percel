import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

type Props = {
  driver?: {
    fullName: string;
    rating: number;
    vehicleType: string;
    vehicleModel: string;
    vehiclePlate: string;
    isOnline: boolean;
  } | null;
  onCall?: () => void;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function DriverCardBase({ driver, onCall }: Props) {
  const palette = useAppPalette();

  if (!driver) {
    return (
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.emptyTitle, { color: palette.text }]}>Driver not assigned yet</Text>
        <Text style={[styles.emptyBody, { color: palette.textSecondary }]}>We'll show driver details here once the order is accepted.</Text>
      </View>
    );
  }

  const initials = getInitials(driver.fullName);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: `${palette.primary}1A` }]}>
          <Text style={[styles.initials, { color: palette.primary }]}>{initials}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.name, { color: palette.text }]}>{driver.fullName}</Text>
          <Text style={[styles.detail, { color: palette.textSecondary }]}>{driver.vehicleType} • {driver.vehicleModel}</Text>
          <Text style={[styles.detail, { color: palette.textSecondary }]}>Plate {driver.vehiclePlate}</Text>
        </View>
        <View style={styles.rating}>
          <FontAwesome name='star' color="#F59E0B" size={14} />
          <Text style={[styles.ratingText, { color: palette.text }]}>{driver.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Pressable onPress={onCall} style={({ pressed }) => [styles.callButton, { backgroundColor: palette.primary }, pressed && { opacity: 0.9 }]}> 
        <Text style={styles.callText}>Call driver</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: Typography.md, fontFamily: Typography.family.bold, letterSpacing: 0.5 },
  meta: { flex: 1, gap: 2 },
  name: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  detail: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  callButton: { borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  callText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  emptyTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  emptyBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
});

export const DriverCard = memo(DriverCardBase);

