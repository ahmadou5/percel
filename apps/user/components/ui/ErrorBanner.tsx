import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss}>
          <Text style={styles.action}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffe9e7',
    borderColor: Colors.light.error,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  text: { color: '#8a1f16', flex: 1 },
  action: { color: Colors.light.error, marginLeft: Spacing.md },
});
