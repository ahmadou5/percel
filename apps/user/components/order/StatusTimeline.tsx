import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { titleize } from '@/lib/wallet';
import { useColorScheme } from '@/components/useColorScheme';

type TimelineItem = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
};

type Props = {
  items: TimelineItem[];
};

export function StatusTimeline({ items }: Props) {
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];

  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: palette.primary }]} />
          <View style={[styles.content, { borderBottomColor: palette.border }]}> 
            <Text style={[styles.status, { color: palette.text }]}>{titleize(item.status)}</Text>
            <Text style={[styles.note, { color: palette.textSecondary }]}>{item.note ?? 'Status updated'}</Text>
            <Text style={[styles.time, { color: palette.textSecondary }]}>{new Date(item.createdAt).toLocaleString('en-NG')}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 6 },
  content: { flex: 1, paddingBottom: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  status: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  note: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  time: { fontSize: Typography.xs, marginTop: 2, fontFamily: Typography.family.regular },
});
