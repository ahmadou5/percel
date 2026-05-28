import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type Props<T extends string> = {
  label: string;
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function NetworkSelector<T extends string>({ label, items, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {items.map((item) => {
          const active = item === value;
          return (
            <Pressable key={item} onPress={() => onChange(item)} style={[styles.chip, active ? styles.chipActive : null]}>
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  label: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    backgroundColor: Colors.light.bg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipText: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  chipTextActive: { color: '#fff' },
});
