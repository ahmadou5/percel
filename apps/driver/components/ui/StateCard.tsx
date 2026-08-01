import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type StateCardProps = {
  actionLabel?: string;
  description: string;
  icon: ReactNode;
  loading?: boolean;
  onActionPress?: () => void;
  title: string;
};

export function StateCard({ actionLabel, description, icon, loading = false, onActionPress, title }: StateCardProps) {
  const palette = useAppPalette();

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
        {loading ? <ActivityIndicator color={palette.primary} /> : icon}
      </View>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.description, { color: palette.textSecondary }]}>{description}</Text>
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [styles.action, { backgroundColor: palette.primary }, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 180,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
  description: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
});
