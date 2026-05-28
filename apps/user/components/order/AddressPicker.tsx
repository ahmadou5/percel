import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  onPress?: () => void;
  helperText?: string;
};

export function AddressPicker({ label, value, placeholder, onChangeText, onPress, helperText }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={onPress} style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textSecondary}
          style={styles.input}
        />
        <Text style={styles.action}>Search</Text>
      </Pressable>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold },
  field: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: { flex: 1, color: Colors.light.text, fontSize: Typography.md },
  action: { color: Colors.light.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },
  helper: { color: Colors.light.textSecondary, fontSize: Typography.xs },
});
