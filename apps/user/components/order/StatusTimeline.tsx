import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { titleize } from '@/lib/wallet';

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
  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.content}>
            <Text style={styles.status}>{titleize(item.status)}</Text>
            <Text style={styles.note}>{item.note ?? 'Status updated'}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('en-NG')}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: Colors.light.primary, marginTop: 6 },
  content: { flex: 1, paddingBottom: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border },
  status: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.bold },
  note: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  time: { color: Colors.light.textSecondary, fontSize: Typography.xs, marginTop: 2 },
});
