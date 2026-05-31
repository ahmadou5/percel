import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, CheckCircle2, Smartphone, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira } from '@/lib/wallet';
import { useBuyElectricity, useProviderServices, useValidateProviderAccount } from '@/hooks/useWallet';

const amountPresets = [500, 1000, 2000, 5000] as const;

function serviceLabel(serviceID: string, name: string) {
  if (serviceID.includes('ikeja')) return 'Ikeja';
  if (serviceID.includes('eko')) return 'Eko';
  if (serviceID.includes('abuja')) return 'Abuja';
  if (serviceID.includes('phed')) return 'PHED';
  if (serviceID.includes('jos')) return 'Jos';
  if (serviceID.includes('kano')) return 'Kano';
  if (serviceID.includes('kaduna')) return 'Kaduna';
  return name.replace(/\s+electric/i, '');
}

export default function ElectricityScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const mutation = useBuyElectricity();
  const validateMutation = useValidateProviderAccount();
  const servicesQuery = useProviderServices('electricity-bill');
  const [selectedServiceID, setSelectedServiceID] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<string>('1000');
  const [customAmount, setCustomAmount] = useState('');
  const [validation, setValidation] = useState<{ name: string; address?: string } | null>(null);
  const [recentPayments, setRecentPayments] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);

  const services = servicesQuery.data ?? [];
  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const amountValue = Number((customAmount || selectedAmount || '0').replace(/,/g, ''));
  const canPay = meterNumber.trim().length >= 8 && amountValue > 0 && Boolean(selectedService) && !mutation.isPending;
  const displayService = selectedService ? serviceLabel(selectedService.serviceID, selectedService.name) : 'Provider';

  useEffect(() => {
    if (!selectedServiceID && services.length) {
      setSelectedServiceID(services[0].serviceID);
    }
  }, [selectedServiceID, services]);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
              <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
                <ArrowLeft size={18} color={palette.text} />
              </Pressable>
              <View style={styles.headerSpacer} />
            </View>
      
      
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Electricity</Text>
          <Text style={[styles.title, { color: palette.text }]}>Pay live meter bills with real provider validation.</Text>
        </View>
      

      <View style={[styles.heroCard, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Selected provider</Text>
            <Text style={styles.heroValue}>{displayService}</Text>
          </View>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <Zap size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>Pick a disco, validate the meter, and pay a live amount from the wallet. Meter validation comes directly from VTpass.</Text>
      </View>

      <View style={styles.providerRow}>
        {servicesQuery.isLoading ? (
          <ActivityIndicator color={palette.primary} />
        ) : services.length ? (
          services.map((service) => {
            const active = service.serviceID === selectedServiceID;
            return (
              <Pressable key={service.serviceID} onPress={() => { setSelectedServiceID(service.serviceID); setValidation(null); }} style={[styles.providerChip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
                <Text style={[styles.providerText, { color: active ? palette.card : palette.text }]}>{serviceLabel(service.serviceID, service.name)}</Text>
              </Pressable>
            );
          })
        ) : (
          <StateCard title="No electricity providers" description="VTpass did not return any electricity providers for this account." icon={<Zap size={24} color={palette.textSecondary} />} />
        )}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.typeToggle}>
          {(['prepaid', 'postpaid'] as const).map((type) => {
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
          rightElement={<Pressable onPress={async () => {
            if (!selectedService || meterNumber.trim().length < 8) return;
            try {
              const result = await validateMutation.mutateAsync({ serviceID: selectedService.serviceID, billersCode: meterNumber.trim(), type: meterType });
              setValidation({
                name: String(result.Customer_Name ?? result.Meter_Number ?? 'Verified customer'),
                address: result.Address ? String(result.Address) : undefined,
              });
            } catch (error) {
              Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please check the meter number and provider.');
            }
          }} style={[styles.verifyButton, { backgroundColor: palette.primary }]}><Text style={styles.verifyText}>{validateMutation.isPending ? 'Checking…' : 'Verify'}</Text></Pressable>}
          helperText="Validate the meter before payment so the beneficiary name shows up before you continue."
        />
        {validation ? (
          <View style={[styles.successPill, { backgroundColor: 'rgba(48,209,88,0.12)' }]}>
            <CheckCircle2 size={16} color={palette.success} />
            <Text style={[styles.successText, { color: palette.success }]}>{validation.name}{validation.address ? ` • ${validation.address}` : ''}</Text>
          </View>
        ) : null}
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Amount</Text>
        <View style={styles.amountGrid}>
          {amountPresets.map((value) => {
            const active = selectedAmount === String(value) && !customAmount;
            return (
              <Pressable key={value} onPress={() => { setSelectedAmount(String(value)); setCustomAmount(''); }} style={({ pressed }) => [styles.amountChip, { backgroundColor: active ? palette.text : palette.card, borderColor: active ? palette.text : palette.border, transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }] }]}>
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
            if (value) setSelectedAmount('');
          }}
          keyboardType="number-pad"
          placeholder="Optional override"
          leftElement={<Text style={[styles.prefix, { color: palette.textSecondary }]}>₦</Text>}
        />
      </View>

      <View style={[styles.recentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent payments</Text>
        {mutation.isPending && !recentPayments.length ? (
          <StateCard loading title="Processing electricity payment" description="We’re checking the bill and saving your receipt right now." icon={<Zap size={24} color={palette.textSecondary} />} />
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
          <StateCard title="No recent payments" description="Pay electricity once to see the receipt history here." icon={<Zap size={24} color={palette.textSecondary} />} />
        )}
      </View>

      <Pressable
        disabled={!canPay}
        onPress={async () => {
          if (!selectedService) return;
          try {
            await mutation.mutateAsync({ meterNumber: meterNumber.trim(), amount: amountValue, disco: selectedService.serviceID, type: meterType });
            setRecentPayments((items) => [
              { id: `${Date.now()}`, title: displayService, meta: `${meterType} meter`, amount: formatNaira(amountValue) },
              ...items,
            ].slice(0, 5));
            Alert.alert('Electricity paid', `You paid ${formatNaira(amountValue)} for ${displayService}.`);
          } catch (error) {
            Alert.alert('Payment failed', error instanceof Error ? error.message : 'Unable to pay electricity bill.');
          }
        }}
        style={[styles.cta, { backgroundColor: canPay ? palette.primary : palette.border }]}
      >
        {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={[styles.ctaText, { color: palette.card }]}>{`Pay ${formatNaira(amountValue)}`}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.huge },
 headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  headerSpacer: { width: 42 },
  backText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  headerCopy: { gap: 8 },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  providerChip: { minHeight: 40, borderRadius: 999, paddingHorizontal: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  providerText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
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
  recentCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  recentList: { gap: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  recentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentMeta: { marginTop: 2, fontSize: Typography.xs },
  recentAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cta: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
