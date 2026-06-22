import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { Sentry } from '@/lib/sentry';

type ErrorBoundaryProps = {
  error: Error;
  retry: () => void;
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Dispatch view failed.</Text>
        <Text style={styles.message}>
          The driver workspace failed to load. Retry now, or reopen the app if the problem keeps returning.
        </Text>

        <Pressable onPress={retry} style={styles.primary}>
          <Text style={styles.primaryText}>Retry</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.bg,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    padding: Spacing.xl,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 14,
  },
  title: {
    color: Colors.light.text,
    fontSize: Typography.xl,
    lineHeight: 30,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
  message: {
    color: Colors.light.textSecondary,
    fontSize: Typography.sm,
    lineHeight: 22,
    fontFamily: Typography.family.regular,
  },
  primary: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
});
