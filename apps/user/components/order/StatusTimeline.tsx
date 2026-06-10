import { StyleSheet, Text, View } from 'react-native';

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
      {items.map((item, index) => {
        const isLatest = index === 0;
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.stepperCol}>
              <View style={[styles.dot, isLatest ? styles.latestDot : styles.pastDot]} />
              {index < items.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.content}> 
              <Text style={[styles.status, { color: isLatest ? '#FFFFFF' : '#8888AA' }]}>{titleize(item.status)}</Text>
              <Text style={[styles.note, { color: isLatest ? '#8888AA' : '#666688' }]}>{item.note ?? 'Status updated'}</Text>
              <Text style={[styles.time, { color: '#666688' }]}>{new Date(item.createdAt).toLocaleString('en-NG')}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingLeft: 8 },
  row: { flexDirection: 'row', gap: Spacing.md },
  stepperCol: { alignItems: 'center', width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  latestDot: { backgroundColor: '#8B5CF6', borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.4)', width: 12, height: 12, borderRadius: 6 },
  pastDot: { backgroundColor: '#444466' },
  line: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  content: { flex: 1, paddingBottom: Spacing.lg },
  status: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  note: { fontSize: Typography.sm, fontFamily: Typography.family.regular, marginTop: 2 },
  time: { fontSize: Typography.xs, marginTop: 4, fontFamily: Typography.family.regular },
});
