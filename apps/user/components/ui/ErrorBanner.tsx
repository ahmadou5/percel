import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/palette';
import { useColorScheme } from '@/components/useColorScheme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  return (
    <View style={[styles.wrap, { backgroundColor: scheme === 'dark' ? '#2b1717' : '#fff1ef', borderColor: theme.error }]}>
      <Text style={[styles.title, { color: theme.error }]}>Error</Text>
      <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Text style={[styles.action, { color: theme.primary }]}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 6,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  title: { fontSize: 12, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1 },
  text: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: Typography.family.regular },
  action: { fontFamily: Typography.family.semibold, alignSelf: 'flex-start' },
});
