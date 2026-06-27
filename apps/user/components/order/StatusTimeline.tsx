import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';
import { titleize } from '@/lib/wallet';

type TimelineItem = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
};

type Props = {
  items: TimelineItem[];
  orderStatus?: string;
};

export function StatusTimeline({ items, orderStatus }: Props) {
  const palette = useAppPalette();
  // Reverse the array so the latest status (last in DB ascending order) is displayed at index 0.
  const reversedItems = [...items];
  const isDone = orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED';

  return (
    <View style={styles.wrap}>
      {reversedItems.map((item, index) => {
        const isLatest = index === 0;

        // Dot colors:
        // If order is delivered/completed, all dots are green.
        // If order is in progress, the active (latest) dot is primary, and past dots are green.
        const dotColor = isDone 
          ? '#10B981' 
          : (isLatest ? palette.primary : '#10B981');
          
        const dotBorderColor = isDone
          ? 'rgba(16, 185, 129, 0.25)'
          : (isLatest ? `${palette.primary}66` : 'rgba(16, 185, 129, 0.25)');

        // All lines are green as they connect completed / active steps
        const lineColor = '#10B981';

        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.stepperCol}>
              <View 
                style={[
                  styles.dot, 
                  isLatest ? styles.latestDot : styles.pastDot,
                  { backgroundColor: dotColor, borderColor: dotBorderColor }
                ]} 
              />
              {index < reversedItems.length - 1 ? (
                <View style={[styles.line, { backgroundColor: lineColor }]} />
              ) : null}
            </View>
            <View style={styles.content}> 
              <Text style={[styles.status, { color: isLatest ? palette.text : palette.textSecondary }]}>{titleize(item.status)}</Text>
              <Text style={[styles.note, { color: isLatest ? palette.textSecondary : `${palette.textSecondary}80` }]}>{item.note ?? 'Status updated'}</Text>
              <Text style={[styles.time, { color: `${palette.textSecondary}80` }]}>{new Date(item.createdAt).toLocaleString('en-NG')}</Text>
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
  latestDot: { borderWidth: 2, width: 12, height: 12, borderRadius: 6 },
  pastDot: {},
  line: { width: 1, flex: 1, marginVertical: 4 },
  content: { flex: 1, paddingBottom: Spacing.lg },
  status: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  note: { fontSize: Typography.sm, fontFamily: Typography.family.regular, marginTop: 2 },
  time: { fontSize: Typography.xs, marginTop: 4, fontFamily: Typography.family.regular },
});
