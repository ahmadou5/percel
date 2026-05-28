import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
        <Text style={styles.title}>Something broke.</Text>
        <Text style={styles.message}>
          Percel hit an unexpected error. Retry the screen or restart the app if the issue continues.
        </Text>

        <Pressable onPress={retry} style={styles.primary}>
          <Text style={styles.primaryText}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111F',
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  message: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
  primary: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
});
