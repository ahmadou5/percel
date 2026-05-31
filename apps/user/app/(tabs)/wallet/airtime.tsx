import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronDown, ContactRound, Smartphone } from 'lucide-react-native';

import { Input } from '@/components/ui/Input';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { StateCard } from '@/components/ui/StateCard';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira } from '@/lib/wallet';
import { useBuyAirtime, useProviderServices } from '@/hooks/useWallet';

const presetAmounts = [100, 500, 1000, 2000, 5000, 10000] as const;

function networkLabel(serviceID: string, name: string) {
  if (serviceID.includes('mtn')) return 'MTN';
  if (serviceID.includes('airtel')) return 'Airtel';
  if (serviceID.includes('glo')) return 'Glo';
  return '9mobile';
}

export default function AirtimeScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const mutation = useBuyAirtime();
  const servicesQuery = useProviderServices('airtime');
  const [phone, setPhone] = useState('');
  const [selectedServiceID, setSelectedServiceID] = useState('');
  const [amountPreset, setAmountPreset] = useState<string>('500');
  const [customAmount, setCustomAmount] = useState('');
  const [recentPurchases, setRecentPurchases] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);

  const services = servicesQuery.data ?? [];
  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const visibleNetwork = selectedService ? networkLabel(selectedService.serviceID, selectedService.name) : 'Network';
  const selectedAmount = Number((customAmount || amountPreset || '0').replace(/,/g, ''));
  const canSubmit = phone.replace(/\D/g, '').length >= 10 && selectedAmount > 0 && Boolean(selectedService) && !mutation.isPending;

  useEffect(() => {
    if (!selectedServiceID && services.length) {
      setSelectedServiceID(services[0].serviceID);
    }
  }, [selectedServiceID, services]);

  const buttonLabel = selectedAmount > 0 ? `Pay ${formatNaira(selectedAmount)}` : 'Select an amount';

  const recentSummary = useMemo(() => recentPurchases.slice(0, 5), [recentPurchases]);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Buy Airtime</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.heroCard, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Live provider check</Text>
            <Text style={styles.heroValue}>{selectedService ? networkLabel(selectedService.serviceID, selectedService.name) : 'Choose a network'}</Text>
          </View>
          <View style={styles.heroIcon}><Smartphone size={20} color="#fff" /></View>
        </View>
        <Text style={styles.heroBody}>Airtime is amount-based, so we validate the network against the live provider list and keep the payment flow tight.</Text>
      </View>

      <View style={[styles.phoneCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Input
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="08012345678"
          leftElement={<View style={styles.networkPill}><Text style={[styles.networkText, { color: palette.text }]}>{visibleNetwork}</Text><ChevronDown size={14} color={palette.textSecondary} /></View>}
          rightElement={<View style={styles.contactButton}><ContactRound size={18} color={palette.primary} /></View>}
        />
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Choose network</Text>
        <View style={styles.providerRow}>
          {servicesQuery.isLoading ? (
            <ActivityIndicator color={palette.primary} />
          ) : services.length ? (
            services.map((service) => {
              const active = service.serviceID === selectedServiceID;
              return (
                <Pressable key={service.serviceID} onPress={() => setSelectedServiceID(service.serviceID)} style={[styles.providerChip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
                  <Text style={[styles.providerText, { color: active ? palette.card : palette.text }]}>{networkLabel(service.serviceID, service.name)}</Text>
                </Pressable>
              );
            })
          ) : (
            <StateCard title="No airtime providers" description="VTpass did not return any airtime providers for this account." icon={<Smartphone size={24} color={palette.textSecondary} />} />
          )}
        </View>
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Select Amount</Text>
        <View style={styles.amountGrid}>
          {presetAmounts.map((value) => {
            const active = amountPreset === String(value) && !customAmount;
            return (
              <Pressable key={value} onPress={() => { setAmountPreset(String(value)); setCustomAmount(''); }} style={({ pressed }) => [styles.amountChip, { backgroundColor: active ? palette.text : palette.card, borderColor: active ? palette.text : palette.border, transform: [{ scale: pressed ? 0.96 : active ? 1.03 : 1 }] }]}>
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
          helperText="Airtime uses the amount you enter, so you can top up exactly what the user needs."
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
        {mutation.isPending && !recentSummary.length ? (
          <StateCard loading title="Processing airtime" description="We’re saving the receipt and you’ll see it here when the payment completes." icon={<Smartphone size={22} color={palette.textSecondary} />} />
        ) : recentSummary.length ? (
          <View style={styles.recentList}>
            {recentSummary.map((item) => (
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
          <StateCard title="No airtime purchases yet" description="Buy airtime to start building a receipt trail for this phone number." icon={<Smartphone size={22} color={palette.textSecondary} />} />
        )}
      </View>
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
  heroCard: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  phoneCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg },
  networkPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  networkText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  contactButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(10,132,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, marginBottom: 10 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  providerChip: { minHeight: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  providerText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: { borderRadius: 16, borderWidth: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', width: '48%' },
  amountChipText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  prefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  cta: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  recentList: { gap: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  recentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentMeta: { marginTop: 2, fontSize: Typography.xs },
  recentAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
