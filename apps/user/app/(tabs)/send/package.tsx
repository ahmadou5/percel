import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { orderSizes } from '@/lib/order';

export default function PackageDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pickup?: string; delivery?: string }>();
  const [size, setSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('SMALL');
  const [fragile, setFragile] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: 'Documents', quantity: 1 }]);

  const addItem = () => setItems((current) => [...current, { description: '', quantity: 1 }]);
  const updateItem = (index: number, key: 'description' | 'quantity', value: string) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: key === 'quantity' ? Number(value || 1) : value } : item)));
  };
  const removeItem = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Package</Text>
        <Text style={styles.title}>Choose the package size and add the item list.</Text>
      </View>

      <View style={styles.grid}>
        {orderSizes.map((option) => {
          const selected = option.size === size;
          return (
            <Pressable key={option.size} onPress={() => setSize(option.size)} style={[styles.sizeCard, selected ? styles.sizeCardActive : null]}>
              <Text style={styles.sizeLabel}>{option.label}</Text>
              <Text style={styles.sizeWeight}>{option.weightRange}</Text>
              <Text style={styles.sizeHint}>{option.basePriceHint}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleTitle}>Fragile item</Text>
          <Text style={styles.toggleBody}>Mark this if the parcel needs extra handling.</Text>
        </View>
        <Switch value={fragile} onValueChange={setFragile} />
      </View>

      <View style={styles.itemsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Pressable onPress={addItem}>
            <Text style={styles.link}>Add item</Text>
          </Pressable>
        </View>
        {items.map((item, index) => (
          <View key={`${index}-${item.description}`} style={styles.itemRow}>
            <TextInput
              value={item.description}
              onChangeText={(value) => updateItem(index, 'description', value)}
              placeholder="Description"
              placeholderTextColor={Colors.light.textSecondary}
              style={styles.itemInput}
            />
            <TextInput
              value={String(item.quantity)}
              onChangeText={(value) => updateItem(index, 'quantity', value)}
              keyboardType="number-pad"
              placeholder="Qty"
              placeholderTextColor={Colors.light.textSecondary}
              style={[styles.itemInput, styles.qtyInput]}
            />
            <Pressable onPress={() => removeItem(index)} style={styles.removeButton}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.notesCard}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional delivery notes"
          placeholderTextColor={Colors.light.textSecondary}
          style={styles.notesInput}
          multiline
        />
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/send/quote', params: { pickup: params.pickup ?? '', delivery: params.delivery ?? '', size, fragile: String(fragile), notes } })}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { gap: Spacing.sm },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.sm, fontWeight: Typography.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  sizeCard: { width: '48%', backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: 6 },
  sizeCardActive: { borderColor: Colors.light.primary, backgroundColor: 'rgba(10,132,255,0.06)' },
  sizeLabel: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  sizeWeight: { color: Colors.light.textSecondary, fontSize: Typography.sm },
  sizeHint: { color: Colors.light.primaryDark, fontSize: Typography.xs, fontWeight: Typography.semibold },
  toggleRow: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  toggleTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  toggleBody: { color: Colors.light.textSecondary, fontSize: Typography.sm, maxWidth: '85%' },
  itemsCard: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: Colors.light.text, fontSize: Typography.md, fontWeight: Typography.bold },
  link: { color: Colors.light.primary, fontWeight: Typography.semibold },
  itemRow: { gap: Spacing.sm, paddingBottom: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border },
  itemInput: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.bg, paddingHorizontal: Spacing.md, color: Colors.light.text },
  qtyInput: { width: 90 },
  removeButton: { alignSelf: 'flex-start' },
  removeText: { color: Colors.light.error, fontSize: Typography.sm, fontWeight: Typography.semibold },
  notesCard: { backgroundColor: Colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, padding: Spacing.lg, gap: Spacing.sm },
  notesInput: { minHeight: 100, borderRadius: 14, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.bg, padding: Spacing.md, color: Colors.light.text, textAlignVertical: 'top' },
  primary: { minHeight: 52, borderRadius: 16, backgroundColor: Colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
});
