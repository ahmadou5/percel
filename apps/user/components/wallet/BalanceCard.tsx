import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira, safeBalance, type WalletDetails } from '@/lib/wallet';
import { Button } from '@/components/ui/Button';
import { getBankLogoUrl } from '@percel/shared';

type Props = {
  wallet: WalletDetails;
  userName?: string;
  onTopUp?: () => void;
  onTransfer?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function BalanceCard({ wallet, userName, onTopUp, onTransfer, onRefresh, refreshing }: Props) {
  const [hidden, setHidden] = useState(false);
  const balance = safeBalance(wallet.balance);

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Wallet balance</Text>
          <Text style={styles.name}>{userName ?? 'Percel User'}</Text>
        </View>
        <Pressable onPress={() => setHidden((value) => !value)} hitSlop={10}>
          <Text style={styles.eye}>{hidden ? 'Show' : 'Hide'}</Text>
        </Pressable>
      </View>

      <Text style={styles.balance}>{hidden ? '••••••' : formatNaira(balance)}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>NUBAN</Text>
          <Text style={styles.metaValue}>{wallet.nuban}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Bank</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {wallet.bankName ? (
              <Image
                source={{ uri: getBankLogoUrl(wallet.bankCode || undefined, wallet.bankName) }}
                style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)' }}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.metaValue} numberOfLines={1}>{wallet.bankName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button title="Top up" onPress={onTopUp} />
        </View>
        <View style={styles.action}>
          <Button title="Transfer" variant="secondary" onPress={onTransfer} />
        </View>
      </View>

      <Pressable onPress={onRefresh} style={styles.footer}>
        <Text style={styles.footerText}>{refreshing ? 'Refreshing balance…' : 'Pull to refresh wallet'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 28,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { color: 'rgba(255,255,255,0.72)', fontSize: Typography.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { color: '#fff', fontSize: Typography.lg, fontWeight: Typography.semibold, marginTop: 4 },
  eye: { color: '#fff', fontWeight: Typography.semibold },
  balance: { color: '#fff', fontSize: 40, fontWeight: Typography.bold, letterSpacing: -1.2 },
  metaRow: { flexDirection: 'row', gap: Spacing.lg },
  metaItem: { flex: 1 },
  metaLabel: { color: 'rgba(255,255,255,0.65)', fontSize: Typography.xs, textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.semibold },
  actions: { flexDirection: 'row', gap: Spacing.md },
  action: { flex: 1 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: Spacing.md,
  },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.sm },
});
