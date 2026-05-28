import FontAwesome from '@expo/vector-icons/FontAwesome';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

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

function DriverCardBase({ driver, onCall }: Props) {
  if (!driver) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>Driver not assigned yet</Text>
        <Text style={styles.emptyBody}>We’ll show driver details here once the order is accepted.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <FontAwesome name="user" color={Colors.light.primary} size={18} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>{driver.fullName}</Text>
          <Text style={styles.detail}>{driver.vehicleType} • {driver.vehicleModel}</Text>
          <Text style={styles.detail}>Plate {driver.vehiclePlate}</Text>
        </View>
        <View style={styles.rating}>
          <FontAwesome name="star" color={Colors.light.warning} size={14} />
          <Text style={styles.ratingText}>{driver.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Pressable onPress={onCall} style={styles.callButton}>
        <Text style={styles.callText}>Call driver</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(10,132,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 2 },
  name: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  detail: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.bold },
  callButton: { backgroundColor: Colors.light.primary, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  callText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
  emptyTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  emptyBody: { color: Colors.light.textSecondary, fontSize: Typography.sm },
});

export const DriverCard = memo(DriverCardBase);
