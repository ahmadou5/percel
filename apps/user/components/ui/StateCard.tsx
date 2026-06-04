import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

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
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.card }]}>
        {loading ? <ActivityIndicator color={palette.primary} /> : icon}
      </View>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.description, { color: palette.textSecondary }]}>{description}</Text>
      {actionLabel && onActionPress ? (
        <Pressable
          onPressIn={() => void haptics.press()}
          onPress={onActionPress}
          style={({ pressed }) => [styles.action, { backgroundColor: palette.primary }, pressed ? styles.pressed : null]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
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
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
