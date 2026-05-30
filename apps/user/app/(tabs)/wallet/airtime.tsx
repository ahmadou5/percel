import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronDown, ContactRound } from 'lucide-react-native';

import { Input } from '@/components/ui/Input';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { StateCard } from '@/components/ui/StateCard';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira, telecomNetworks } from '@/lib/wallet';
import { useBuyAirtime } from '@/hooks/useWallet';

const presetAmounts = [100, 500, 1000, 2000, 5000, 10000] as const;

type Network = (typeof telecomNetworks)[number];

const networkPrefixes: Record<Network, RegExp[]> = {
  MTN: [/^0703/, /^0706/, /^0803/, /^0806/, /^0810/, /^0813/, /^0814/, /^0816/, /^0903/, /^0906/],
  Airtel: [/^0701/, /^0708/, /^0802/, /^0808/, /^0812/, /^0901/, /^0902/, /^0904/, /^0907/, /^0912/],
  Glo: [/^0705/, /^0805/, /^0811/, /^0815/, /^0905/],
  '9mobile': [/^0809/, /^0817/, /^0818/, /^0908/, /^0909/],
};

function detectNetwork(phone: string): Network | null {
  const normalized = phone.replace(/\D/g, '').replace(/^234/, '0').slice(0, 11);
  if (normalized.length < 4) return null;
  for (const [network, patterns] of Object.entries(networkPrefixes) as Array<[Network, RegExp[]]>) {
    if (patterns.some((pattern) => pattern.test(normalized))) return network;
  }
  return null;
}

export default function AirtimeScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const mutation = useBuyAirtime();
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<Network>('MTN');
  const [amountPreset, setAmountPreset] = useState<string>('500');
  const [customAmount, setCustomAmount] = useState('');
  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
  const [amountGridWidth, setAmountGridWidth] = useState(0);
  const [recentPurchases, setRecentPurchases] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);

  const detectedNetwork = useMemo(() => detectNetwork(phone), [phone]);
  const visibleNetwork = detectedNetwork ?? network;
  const selectedAmount = Number((customAmount || amountPreset || '0').replace(/,/g, ''));
  const canSubmit = phone.replace(/\D/g, '').length >= 10 && selectedAmount > 0 && !mutation.isPending;
  const buttonLabel = selectedAmount > 0 ? `Pay ${formatNaira(selectedAmount)}` : 'Select an amount';

  const pickPreset = (value: number) => {
    setAmountPreset(String(value));
    setCustomAmount('');
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Buy Airtime</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.phoneCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Input
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="08012345678"
          leftElement={
            <Pressable onPress={() => setNetworkPickerOpen(true)} style={styles.networkPill}>
              <Text style={[styles.networkText, { color: palette.text }]}>{visibleNetwork}</Text>
              <ChevronDown size={14} color={palette.textSecondary} />
            </Pressable>
          }
          rightElement={
            <View style={styles.contactButton}>
              <ContactRound size={18} color={palette.primary} />
            </View>
          }
        />
        <Text style={[styles.detectedText, { color: palette.success }]}>{detectedNetwork ? `${detectedNetwork} detected` : `${visibleNetwork} selected`}</Text>
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Select Amount</Text>
        <View onLayout={(event) => setAmountGridWidth(event.nativeEvent.layout.width)} style={styles.amountGrid}>
          {presetAmounts.map((value) => {
            const active = amountPreset === String(value) && !customAmount;
            const chipWidth = amountGridWidth ? (amountGridWidth - 20) / 3 : undefined;
            return (
              <Pressable
                key={value}
                onPress={() => pickPreset(value)}
                style={({ pressed }) => [
                  styles.amountChip,
                  {
                    width: chipWidth,
                    backgroundColor: active ? palette.text : palette.card,
                    borderColor: active ? palette.text : palette.border,
                    transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.amountChipText, { color: active ? palette.card : palette.text }]}>{formatNaira(value)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Or enter custom amount</Text>
        <Input
          label="Custom amount"
          value={customAmount}
          onChangeText={(value) => {
            setCustomAmount(value.replace(/[^0-9]/g, ''));
            if (value) setAmountPreset('');
          }}
          keyboardType="number-pad"
          placeholder="50 – 50,000"
          leftElement={<Text style={[styles.prefix, { color: palette.textSecondary }]}>₦</Text>}
          helperText="Selecting a preset clears this field, and typing here clears the preset."
        />
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={async () => {
          try {
            await mutation.mutateAsync({ phone, network: visibleNetwork, amount: selectedAmount });
            setRecentPurchases((items) => [
              { id: `${Date.now()}`, title: phone, meta: `${visibleNetwork} airtime`, amount: formatNaira(selectedAmount) },
              ...items,
            ].slice(0, 5));
            Alert.alert('Airtime bought', `You paid ${formatNaira(selectedAmount)} for ${phone}.`);
          } catch (error) {
            Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy airtime.');
          }
        }}
        style={[styles.cta, { backgroundColor: canSubmit ? palette.text : palette.border }]}
      >
        {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={[styles.ctaText, { color: palette.card }]}>{buttonLabel}</Text>}
      </Pressable>

      <View style={[styles.recentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent purchases</Text>
        {mutation.isPending && !recentPurchases.length ? (
          <StateCard
            loading
            title="Processing airtime"
            description="We’re saving the receipt and you’ll see it here when the payment completes."
            icon={<ContactRound size={22} color={palette.textSecondary} />}
          />
        ) : recentPurchases.length ? (
          <View style={styles.recentList}>
            {recentPurchases.map((item) => (
              <View key={item.id} style={styles.recentRow}>
                <View>
                  <Text style={[styles.recentTitle, { color: palette.text }]}>{item.title}</Text>
                  <Text style={[styles.recentMeta, { color: palette.textSecondary }]}>{item.meta}</Text>
                </View>
                <Text style={[styles.recentAmount, { color: palette.text }]}>{item.amount}</Text>
              </View>
            ))}
          </View>
        ) : (
          <StateCard
            title="No airtime purchases yet"
            description="Buy airtime to start building a receipt trail for this phone number."
            icon={<ContactRound size={22} color={palette.textSecondary} />}
          />
        )}
      </View>

      <Modal transparent visible={networkPickerOpen} animationType="fade" onRequestClose={() => setNetworkPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNetworkPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Choose network</Text>
            {telecomNetworks.map((item) => (
              <Pressable key={item} onPress={() => { setNetwork(item); setNetworkPickerOpen(false); }} style={styles.networkRow}>
                <Text style={[styles.networkRowLabel, { color: palette.text }]}>{item}</Text>
                {visibleNetwork === item ? <Text style={{ color: palette.primary }}>Selected</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  headerSpacer: { width: 42 },
  phoneCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg },
  networkPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  networkText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  contactButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,132,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  detectedText: { marginTop: 6, fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, marginBottom: 10 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: { borderRadius: 16, borderWidth: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  amountChipText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  prefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  cta: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 8 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, marginBottom: 4 },
  networkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  networkRowLabel: { fontSize: Typography.md, fontFamily: Typography.family.semibold },
  recentCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  recentList: { gap: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  recentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentMeta: { marginTop: 2, fontSize: Typography.xs },
  recentAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
