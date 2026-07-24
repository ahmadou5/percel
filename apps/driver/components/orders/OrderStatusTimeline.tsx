import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useAppPalette, hexToRgba } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import type { DriverOrderStatus } from '@/lib/types';

type TimelineStep = {
  status: DriverOrderStatus;
  label: string;
  description: string;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'MATCHED',    label: 'Order accepted',       description: 'You accepted this delivery job' },
  { status: 'ACCEPTED',   label: 'Confirmed',            description: 'Heading to pickup location' },
  { status: 'IN_TRANSIT', label: 'Package picked up',    description: 'In transit to destination' },
  { status: 'DELIVERED',  label: 'Package delivered',    description: 'Delivered to recipient' },
  { status: 'COMPLETED',  label: 'Order completed',      description: 'Customer confirmed delivery' },
];

const STATUS_ORDER: DriverOrderStatus[] = [
  'CREATED', 'PENDING_MATCH', 'MATCHED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED',
];

function getStepIndex(status: DriverOrderStatus) {
  return STATUS_ORDER.indexOf(status);
}

export function OrderStatusTimeline({ currentStatus }: { currentStatus: DriverOrderStatus }) {
  const palette = useAppPalette();
  const currentIndex = getStepIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'DISPUTED';

  return (
    <View style={styles.container}>
      {TIMELINE_STEPS.map((step, i) => {
        const stepIndex = getStepIndex(step.status);
        const isDone = currentIndex >= stepIndex && !isCancelled;
        const isCurrent = currentIndex === stepIndex && !isCancelled;
        const isLast = i === TIMELINE_STEPS.length - 1;

        const dotColor = isDone ? palette.primary : isCancelled ? '#FF453A' : palette.border;

        return (
          <View key={step.status} style={styles.stepRow}>
            {/* Left column: dot + connector line */}
            <View style={styles.stepIndicator}>
              <View style={[
                styles.dot,
                { backgroundColor: isDone ? hexToRgba(palette.primary, 0.15) : hexToRgba(palette.border, 0.5) },
                isCurrent && { backgroundColor: hexToRgba(palette.primary, 0.2) },
              ]}>
                {isDone ? (
                  <CheckCircle2 size={14} color={palette.primary} />
                ) : (
                  <Circle size={14} color={palette.border} />
                )}
              </View>
              {!isLast && (
                <View style={[
                  styles.connector,
                  { backgroundColor: isDone ? hexToRgba(palette.primary, 0.3) : palette.border },
                ]} />
              )}
            </View>

            {/* Right column: label + description */}
            <View style={[styles.stepContent, !isLast && styles.stepContentSpaced]}>
              <Text style={[
                styles.stepLabel,
                { color: isDone ? palette.text : palette.textSecondary },
                isCurrent && { color: palette.primary },
              ]}>
                {step.label}
              </Text>
              <Text style={[styles.stepDesc, { color: palette.textSecondary }]}>
                {step.description}
              </Text>
            </View>
          </View>
        );
      })}

      {isCancelled && (
        <View style={styles.stepRow}>
          <View style={styles.stepIndicator}>
            <View style={[styles.dot, { backgroundColor: hexToRgba('#FF453A', 0.15) }]}>
              <Circle size={14} color="#FF453A" />
            </View>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepLabel, { color: '#FF453A' }]}>
              {currentStatus === 'DISPUTED' ? 'Disputed' : 'Cancelled'}
            </Text>
            <Text style={[styles.stepDesc, { color: palette.textSecondary }]}>
              {currentStatus === 'DISPUTED' ? 'This order is under review' : 'This order was cancelled'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepIndicator: { alignItems: 'center', width: 28 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 1.5, flex: 1, minHeight: 20, marginVertical: 4 },
  stepContent: { flex: 1, paddingTop: 4, gap: 2 },
  stepContentSpaced: { paddingBottom: 20 },
  stepLabel: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold' },
  stepDesc: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 18 },
});
