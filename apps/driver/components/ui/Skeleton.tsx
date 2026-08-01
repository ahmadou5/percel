import { StyleSheet, View } from 'react-native';
import { useAppPalette } from '@/lib/theme';

type FormSkeletonProps = {
  count?: number;
};

export function FormSkeleton({ count = 2 }: FormSkeletonProps) {
  const palette = useAppPalette();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[styles.box, { backgroundColor: palette.card, borderColor: palette.border }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  box: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    opacity: 0.6,
  },
});
