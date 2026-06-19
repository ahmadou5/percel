import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronRight, Download, Send } from 'lucide-react-native';
import { router } from 'expo-router';

import { useAppPalette, hexToRgba } from '@/lib/theme';

type Props = {
  balance: number;
  isLoading?: boolean;
  isOnline: boolean;
  onToggleOnline: () => void;
};

function formatNaira(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

export function DriverWalletCard({ balance, isLoading, isOnline, onToggleOnline }: Props) {
  const palette = useAppPalette();

  return (
    <View style={[styles.card, { backgroundColor: palette.primaryDark, borderColor: 'rgba(255,255,255,0.10)' }]}>
      <View style={styles.decorA} />
      <View style={styles.decorB} />
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>Wallet balance</Text>
          {isLoading ? <ActivityIndicator color="#fff" style={styles.loader} /> : <Text style={styles.amount}>{formatNaira(balance)}</Text>}
        </View>
        <Pressable onPress={() => router.push('/(tabs)/earnings')} style={styles.viewLink}>
          <Text style={styles.viewLinkText}>View all</Text>
          <ChevronRight size={14} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/(tabs)/earnings')} style={styles.actionButton}>
          <Send size={16} color="#fff" />
          <Text style={styles.actionText}>Transfer</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/earnings')} style={styles.actionButton}>
          <Download size={16} color="#fff" />
          <Text style={styles.actionText}>Deposit</Text>
        </Pressable>
      </View>

      <View style={[styles.statusRow, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
        <View style={styles.statusCopy}>
          <View style={[styles.dot, { backgroundColor: isOnline ? '#30D158' : '#A1A1AA' }]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={onToggleOnline}
          trackColor={{ false: 'rgba(255,255,255,0.22)', true: hexToRgba('#30D158', 0.42) }}
          thumbColor={isOnline ? '#30D158' : '#F4F4F5'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, borderWidth: 1, padding: 22, gap: 18, overflow: 'hidden' },
  decorA: { position: 'absolute', top: -44, right: -20, width: 142, height: 142, borderRadius: 71, backgroundColor: 'rgba(255,255,255,0.08)' },
  decorB: { position: 'absolute', bottom: -56, left: -34, width: 156, height: 156, borderRadius: 78, backgroundColor: 'rgba(255,255,255,0.05)' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, zIndex: 1 },
  label: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  amount: { color: '#fff', fontSize: 38, lineHeight: 44, fontWeight: '900', marginTop: 6 },
  loader: { marginTop: 12, alignSelf: 'flex-start' },
  viewLink: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 2 },
  viewLinkText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, zIndex: 1 },
  actionButton: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  statusRow: { minHeight: 52, borderRadius: 18, paddingLeft: 14, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  statusCopy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
