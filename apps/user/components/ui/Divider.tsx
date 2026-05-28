import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/palette';

export function Divider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>or</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: Colors.light.border },
  text: { color: Colors.light.textSecondary },
});
