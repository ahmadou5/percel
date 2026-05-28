import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type Props = {
  label: string;
  weightRange: string;
  basePriceHint: string;
  selected?: boolean;
  onPress: () => void;
};

export function SizeCard({ label, weightRange, basePriceHint, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected ? styles.selected : null]}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <FontAwesome name="cube" size={18} color={selected ? Colors.light.primary : Colors.light.textSecondary} />
        </View>
        {selected ? <FontAwesome name="check-circle" size={18} color={Colors.light.primary} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.weight}>{weightRange}</Text>
      <Text style={styles.hint}>{basePriceHint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    padding: Spacing.lg,
    gap: 6,
  },
  selected: { borderColor: Colors.light.primary, backgroundColor: 'rgba(10, 132, 255, 0.06)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(10,132,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  weight: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  hint: { color: Colors.light.primaryDark, fontSize: Typography.xs, fontWeight: Typography.semibold },
});
