import FontAwesome from '@expo/vector-icons/FontAwesome';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
          <FontAwesome name='user' color="#8B5CF6" size={18} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>{driver.fullName}</Text>
          <Text style={styles.detail}>{driver.vehicleType} • {driver.vehicleModel}</Text>
          <Text style={styles.detail}>Plate {driver.vehiclePlate}</Text>
        </View>
        <View style={styles.rating}>
          <FontAwesome name='star' color="#F59E0B" size={14} />
          <Text style={styles.ratingText}>{driver.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Pressable onPress={onCall} style={({ pressed }) => [styles.callButton, pressed && { opacity: 0.9 }]}> 
        <Text style={styles.callText}>Call driver</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.15)', backgroundColor: '#13131A', padding: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  meta: { flex: 1, gap: 2 },
  name: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  detail: { fontSize: Typography.sm, fontFamily: Typography.family.regular, color: '#8888AA' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: Typography.sm, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  callButton: { borderRadius: 14, minHeight: 46, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  callText: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  emptyTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, color: '#FFFFFF' },
  emptyBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, color: '#8888AA' },
});

export const DriverCard = memo(DriverCardBase);
