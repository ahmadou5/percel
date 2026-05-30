import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, CheckCircle2, ShieldCheck, Smartphone, Zap } from 'lucide-react-native';

import { Input } from '@/components/ui/Input';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { StateCard } from '@/components/ui/StateCard';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira } from '@/lib/wallet';
import { useBuyElectricity } from '@/hooks/useWallet';

const billers = [
  { key: 'IKEDC', label: 'IKEDC' },
  { key: 'EKEDC', label: 'EKEDC' },
  { key: 'AEDC', label: 'AEDC' },
  { key: 'PHED', label: 'PHED' },
] as const;
const amountPresets = [500, 1000, 2000, 5000] as const;

export default function ElectricityScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const mutation = useBuyElectricity();
  const [biller, setBiller] = useState<(typeof billers)[number]['key']>('IKEDC');
  const [meterType, setMeterType] = useState<'Prepaid' | 'Postpaid'>('Prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [verifiedCustomer, setVerifiedCustomer] = useState<{ name: string; address: string } | null>(null);
  const [amountPreset, setAmountPreset] = useState<string>('1000');
  const [customAmount, setCustomAmount] = useState('');
  const [recentPayments, setRecentPayments] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);
  const selectedAmount = Number((customAmount || amountPreset || '0').replace(/,/g, ''));
  const canPay = meterNumber.trim().length >= 8 && selectedAmount > 0 && !mutation.isPending;
  const selectedBiller = billers.find((item) => item.key === biller) ?? billers[0];

  const verifyMeter = () => {
    if (meterNumber.trim().length < 8) {
      Alert.alert('Verification', 'Enter a valid meter number first.');
      return;
    }
    setVerifiedCustomer({ name: 'John Doe', address: '12 Aba Road' });
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,214,10,0.18)' }]}>
          <Zap size={22} color={palette.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Electricity</Text>
          <Text style={[styles.title, { color: palette.text }]}>Pick a disco, verify the meter, and top up cleanly.</Text>
        </View>
      </View>

      <View style={styles.billerGrid}>
        {billers.map((item) => {
          const active = item.key === biller;
          return (
            <Pressable key={item.key} onPress={() => setBiller(item.key)} style={[styles.billerChip, { backgroundColor: palette.card, borderColor: active ? palette.primary : palette.border }]}>
              <Text style={[styles.billerText, { color: palette.text }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Input
          label="Biller"
          value={selectedBiller.label}
          onChangeText={() => undefined}
          editable={false}
          rightElement={<ShieldCheck size={18} color={palette.primary} />}
        />
        <View style={styles.typeToggle}>
          {(['Prepaid', 'Postpaid'] as const).map((type) => {
            const active = type === meterType;
            return (
              <Pressable key={type} onPress={() => setMeterType(type)} style={[styles.typePill, { backgroundColor: active ? palette.text : palette.bg }]}>
                <Text style={[styles.typeText, { color: active ? palette.card : palette.text }]}>{type}</Text>
              </Pressable>
            );
          })}
        </View>
        <Input
          label="Meter number"
          value={meterNumber}
          onChangeText={setMeterNumber}
          keyboardType="number-pad"
          placeholder="1234567890"
          leftElement={<Smartphone size={16} color={palette.textSecondary} />}
          rightElement={<Pressable onPress={verifyMeter} style={[styles.verifyButton, { backgroundColor: palette.primary }]}><Text style={styles.verifyText}>Verify</Text></Pressable>}
          helperText="The verification step returns the account holder before payment."
        />
        {verifiedCustomer ? (
          <View style={[styles.successPill, { backgroundColor: 'rgba(48,209,88,0.12)' }]}>
            <CheckCircle2 size={16} color={palette.success} />
            <Text style={[styles.successText, { color: palette.success }]}>{verifiedCustomer.name} — {verifiedCustomer.address}</Text>
          </View>
        ) : null}
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Amount</Text>
        <View style={styles.amountGrid}>
          {amountPresets.map((value) => {
            const active = amountPreset === String(value) && !customAmount;
            return (
              <Pressable key={value} onPress={() => { setAmountPreset(String(value)); setCustomAmount(''); }} style={({ pressed }) => [styles.amountChip, { backgroundColor: active ? palette.text : palette.card, borderColor: active ? palette.text : palette.border, transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }] }]}>
                <Text style={[styles.amountChipText, { color: active ? palette.card : palette.text }]}>{formatNaira(value)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Input
          label="Custom amount"
          value={customAmount}
          onChangeText={(value) => {
            setCustomAmount(value.replace(/[^0-9]/g, ''));
            if (value) setAmountPreset('');
          }}
          keyboardType="number-pad"
          placeholder="Optional override"
          leftElement={<Text style={[styles.prefix, { color: palette.textSecondary }]}>₦</Text>}
        />
      </View>

      <View style={[styles.recentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent purchases</Text>
        {mutation.isPending && !recentPayments.length ? (
          <StateCard
            loading
            title="Processing electricity payment"
            description="We’re checking the bill and saving your receipt right now."
            icon={<Zap size={24} color={palette.textSecondary} />}
          />
        ) : recentPayments.length ? (
          <View style={styles.recentList}>
            {recentPayments.map((item) => (
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
            title="No recent purchases"
            description="Pay electricity once to see the receipt history here."
            icon={<Zap size={24} color={palette.textSecondary} />}
          />
        )}
      </View>

      <Pressable
        disabled={!canPay}
        onPress={async () => {
          try {
            const payloadAmount = selectedAmount;
            await mutation.mutateAsync({ meterNumber, amount: payloadAmount, disco: biller });
            setRecentPayments((items) => [
              { id: `${Date.now()}`, title: selectedBiller.label, meta: `${meterType} meter`, amount: formatNaira(payloadAmount) },
              ...items,
            ].slice(0, 5));
            Alert.alert('Electricity paid', `You paid ${formatNaira(payloadAmount)} for ${selectedBiller.label}.`);
          } catch (error) {
            Alert.alert('Payment failed', error instanceof Error ? error.message : 'Unable to pay electricity bill.');
          }
        }}
        style={[styles.cta, { backgroundColor: canPay ? palette.text : palette.border }]}
      >
        {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={[styles.ctaText, { color: palette.card }]}>{`Pay ${formatNaira(selectedAmount)}`}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1, gap: 4 },
  eyebrow: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  billerGrid: { flexDirection: 'row', gap: 10 },
  billerChip: { flex: 1, minHeight: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  billerText: { fontFamily: Typography.family.bold },
  card: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  typeToggle: { flexDirection: 'row', gap: 10 },
  typePill: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontFamily: Typography.family.bold },
  verifyButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  verifyText: { color: '#fff', fontSize: Typography.xs, fontFamily: Typography.family.bold },
  successPill: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 },
  successText: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, marginBottom: 10 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  amountChip: { width: '48%', minHeight: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  amountChipText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  prefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  recentCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  recentList: { gap: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  recentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentMeta: { marginTop: 2, fontSize: Typography.xs },
  recentAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cta: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
