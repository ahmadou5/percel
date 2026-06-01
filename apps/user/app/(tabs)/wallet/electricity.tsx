import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Smartphone, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useBuyElectricity, useProviderServices, useValidateProviderAccount } from '@/hooks/useWallet';
import { formatNaira } from '@/lib/wallet';

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

function ProviderIcon({ serviceID, name, size = 32 }: { serviceID: string; name: string; size?: number }) {
  const id = serviceID.toLowerCase();
  let backgroundColor = '#475569';
  let label = '';
  let labelColor = '#ffffff';

  if (id.includes('ikeja')) {
    backgroundColor = '#E31C24';
    label = 'IKEDC';
    labelColor = '#ffffff';
  } else if (id.includes('eko')) {
    backgroundColor = '#0066B2';
    label = 'EKEDP';
    labelColor = '#ffffff';
  } else if (id.includes('abuja') || id.includes('aedc')) {
    backgroundColor = '#009639';
    label = 'AEDC';
    labelColor = '#ffffff';
  } else if (id.includes('phed')) {
    backgroundColor = '#FF8C00';
    label = 'PHED';
    labelColor = '#ffffff';
  } else if (id.includes('jos')) {
    backgroundColor = '#008080';
    label = 'JEDC';
    labelColor = '#ffffff';
  } else if (id.includes('kano')) {
    backgroundColor = '#D21F3C';
    label = 'KEDCO';
    labelColor = '#ffffff';
  } else if (id.includes('kaduna')) {
    backgroundColor = '#004F9F';
    label = 'KAEDCO';
    labelColor = '#ffffff';
  } else {
    label = name.split(' ').map(p => p[0]).join('').slice(0, 3).toUpperCase();
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
    }}>
      <Text style={{
        fontSize: size * 0.28,
        fontFamily: Typography.family.bold,
        color: labelColor,
        textAlign: 'center'
      }}>
        {label}
      </Text>
    </View>
  );
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
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);

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

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Electricity Biller</Text>
        <Pressable onPress={() => setProviderPickerOpen(true)} style={[styles.dropdownSelect, { backgroundColor: palette.bg, borderColor: palette.border, marginBottom: 14 }]}>
          <View style={styles.dropdownSelectCopy}>
            {selectedService ? (
              <View style={styles.dropdownValueRow}>
                <ProviderIcon serviceID={selectedService.serviceID} name={selectedService.name} size={28} />
                <View style={{ gap: 2 }}>
                  <Text style={[styles.dropdownValueName, { color: palette.text }]}>{serviceLabel(selectedService.serviceID, selectedService.name)}</Text>
                  <Text style={[styles.dropdownValueMeta, { color: palette.textSecondary }]}>{selectedService.name}</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.dropdownPlaceholder, { color: palette.textSecondary }]}>Choose electricity provider</Text>
            )}
          </View>
          <ChevronDown size={18} color={palette.textSecondary} />
        </Pressable>
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
        ) : null}
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

      <Modal visible={providerPickerOpen} transparent animationType="fade" onRequestClose={() => setProviderPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a provider</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select your electricity disco below.</Text>
              </View>
              <Pressable onPress={() => setProviderPickerOpen(false)} style={[styles.modalClose, { backgroundColor: palette.bg }]}>
                <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
              </Pressable>
            </View>

            {servicesQuery.isLoading ? (
              <ActivityIndicator color={palette.primary} style={{ marginVertical: 20 }} />
            ) : services.length ? (
              <FlatList
                data={services}
                keyExtractor={(item) => item.serviceID}
                renderItem={({ item }) => {
                  const active = item.serviceID === selectedServiceID;
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedServiceID(item.serviceID);
                        setValidation(null);
                        setProviderPickerOpen(false);
                      }}
                      style={[styles.providerRowItem, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg }]}
                    >
                      <View style={styles.providerRowLeft}>
                        <ProviderIcon serviceID={item.serviceID} name={item.name} size={36} />
                        <Text style={[styles.providerRowName, { color: palette.text }]}>{serviceLabel(item.serviceID, item.name)}</Text>
                      </View>
                      <ChevronRight size={16} color={palette.textSecondary} />
                    </Pressable>
                  );
                }}
              />
            ) : (
              <StateCard title="No electricity providers" description="VTpass did not return any electricity providers." icon={<Zap size={24} color={palette.textSecondary} />} />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrow: { color: Colors.light.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  heroCard: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  inputLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  dropdownSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, minHeight: 64 },
  dropdownSelectCopy: { flex: 1 },
  dropdownValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropdownValueName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  dropdownValueMeta: { fontSize: Typography.xs },
  dropdownPlaceholder: { fontSize: Typography.md, fontFamily: Typography.family.medium },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, color: '#64748b', marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  providerRowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  providerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
