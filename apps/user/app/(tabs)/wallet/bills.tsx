import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { billTypes } from '@/lib/wallet';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

export default function BillsScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Bills hub</Text>
        <Text style={styles.title}>Pay utilities without leaving the wallet section.</Text>
      </View>

      <View style={styles.grid}>
        {billTypes.map((item) => (
          <Pressable key={item.key} onPress={() => router.push(item.href)} style={styles.card}>
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardBody}>{item.description}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.disabledCard}>
        <Text style={styles.disabledTitle}>Cable TV</Text>
        <Text style={styles.disabledBody}>Coming soon. Disabled for now while the payment rails are finalized.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg, padding: Spacing.lg, gap: Spacing.lg },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  grid: { gap: Spacing.md },
  card: { backgroundColor: Colors.light.card, borderRadius: 20, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border, gap: 6 },
  cardTitle: { color: Colors.light.text, fontSize: Typography.lg, fontWeight: Typography.bold },
  cardBody: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  disabledCard: { backgroundColor: 'rgba(255, 214, 10, 0.12)', borderRadius: 20, padding: Spacing.lg, gap: 6 },
  disabledTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  disabledBody: { color: Colors.light.textSecondary, fontSize: Typography.sm },
});
