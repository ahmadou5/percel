import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronDown, ChevronRight, Globe, Smartphone } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira } from '@/lib/wallet';
import { useBuyData, useProviderServices, useProviderVariations } from '@/hooks/useWallet';

function serviceLabel(serviceID: string, name: string) {
  if (serviceID.includes('mtn')) return 'MTN';
  if (serviceID.includes('airtel')) return 'Airtel';
  if (serviceID.includes('glo')) return 'Glo';
  return '9mobile';
}

function ProviderIcon({ serviceID, name, size = 32 }: { serviceID: string; name: string; size?: number }) {
  const id = serviceID.toLowerCase();
  let backgroundColor = '#475569';
  let label = '';
  let labelColor = '#ffffff';

  if (id.includes('mtn')) {
    backgroundColor = '#FFD200';
    label = 'MTN';
    labelColor = '#000000';
  } else if (id.includes('airtel')) {
    backgroundColor = '#E10000';
    label = 'Airtel';
    labelColor = '#ffffff';
  } else if (id.includes('glo')) {
    backgroundColor = '#2E7D32';
    label = 'Glo';
    labelColor = '#ffffff';
  } else if (id.includes('9mobile') || id.includes('etisalat')) {
    backgroundColor = '#005A36';
    label = '9mobile';
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
        fontSize: size * 0.32,
        fontFamily: Typography.family.bold,
        color: labelColor,
        textAlign: 'center'
      }}>
        {label}
      </Text>
    </View>
  );
}

export default function DataScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const mutation = useBuyData();
  const servicesQuery = useProviderServices('data');
  const [phone, setPhone] = useState('');
  const [selectedServiceID, setSelectedServiceID] = useState('');
  const [selectedVariationCode, setSelectedVariationCode] = useState('');
  const [recentPurchases, setRecentPurchases] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);

  const services = servicesQuery.data ?? [];
  const selectedService = services.find((service) => service.serviceID === selectedServiceID) ?? services[0];
  const variationsQuery = useProviderVariations(selectedService?.serviceID);
  const variations = variationsQuery.data ?? [];
  const selectedVariation = variations.find((variation) => variation.variation_code === selectedVariationCode) ?? variations[0];
  const selectedPrice = Number(selectedVariation?.variation_amount ?? 0);
  const displayNetwork = selectedService ? serviceLabel(selectedService.serviceID, selectedService.name) : 'Network';
  const canSubmit = phone.replace(/\D/g, '').length >= 10 && Boolean(selectedService) && Boolean(selectedVariation) && !mutation.isPending;

  useEffect(() => {
    if (!selectedServiceID && services.length) {
      setSelectedServiceID(services[0].serviceID);
    }
  }, [selectedServiceID, services]);

  useEffect(() => {
    if (!selectedVariationCode && variations.length) {
      setSelectedVariationCode(variations[0].variation_code);
    }
  }, [selectedVariationCode, variations]);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Data</Text>
        <Text style={[styles.title, { color: palette.text }]}>Buy live data bundles with real pricing from the provider.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>Live pricing</Text>
          <View style={styles.heroIcon}><Globe size={20} color="#fff" /></View>
        </View>
        <Text style={styles.heroValue}>{displayNetwork}</Text>
        <Text style={styles.heroBody}>Choose a live bundle from VTpass. The amount is pulled from the selected variation, so pricing stays current.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Input
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="08012345678"
          leftElement={
            <Pressable onPress={() => setProviderPickerOpen(true)} style={styles.networkPill}>
              {selectedService ? (
                <ProviderIcon serviceID={selectedService.serviceID} name={selectedService.name} size={22} />
              ) : null}
              <Text style={[styles.networkText, { color: palette.text }]}>{displayNetwork}</Text>
              <ChevronDown size={14} color={palette.textSecondary} />
            </Pressable>
          }
        />
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Live bundles</Text>
        {variationsQuery.isLoading ? (
          <StateCard loading title="Loading live bundles" description="Fetching the current bundle list from VTpass." icon={<Globe size={24} color={palette.textSecondary} />} />
        ) : variations.length ? (
          <View style={styles.planGrid}>
            {variations.map((variation) => {
              const active = variation.variation_code === selectedVariationCode;
              return (
                <Pressable
                  key={variation.variation_code}
                  onPress={() => setSelectedVariationCode(variation.variation_code)}
                  style={({ pressed }) => [
                    styles.planCard,
                    {
                      backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.card,
                      borderColor: active ? palette.primary : palette.border,
                      transform: [{ scale: pressed ? 0.97 : active ? 1.02 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.planSize, { color: palette.text }]}>{variation.name}</Text>
                  <Text style={[styles.planPrice, { color: palette.text }]}>{formatNaira(Number(variation.variation_amount))}</Text>
                  <Text style={[styles.planValidity, { color: palette.textSecondary }]}>{variation.fixedPrice === 'Yes' ? 'Fixed price' : 'Variable price'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <StateCard
            title="No live bundles"
            description="VTpass did not return any variations for the selected network."
            icon={<Globe size={24} color={palette.textSecondary} />}
          />
        )}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Selected bundle</Text>
        <Text style={[styles.summaryTitle, { color: palette.text }]}>{selectedVariation?.name ?? 'Pick a bundle'}</Text>
        <Text style={[styles.summaryMeta, { color: palette.textSecondary }]}>{selectedService ? serviceLabel(selectedService.serviceID, selectedService.name) : 'No network selected'}</Text>
        <Text style={[styles.summaryAmount, { color: palette.text }]}>{selectedPrice ? formatNaira(selectedPrice) : '₦0'}</Text>
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={async () => {
          if (!selectedService || !selectedVariation) return;
          try {
            const payloadAmount = selectedPrice;
            await mutation.mutateAsync({
              phone,
              network: displayNetwork,
              amount: payloadAmount,
              plan: selectedVariation.name,
              variationCode: selectedVariation.variation_code,
              serviceID: selectedService.serviceID,
            });
            setRecentPurchases((items) => [
              { id: `${Date.now()}`, title: selectedVariation.name, meta: `${displayNetwork} data`, amount: formatNaira(payloadAmount) },
              ...items,
            ].slice(0, 5));
            Alert.alert('Data purchased', `You bought ${selectedVariation.name} for ${formatNaira(payloadAmount)}.`);
          } catch (error) {
            Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy data.');
          }
        }}
        style={[styles.cta, { backgroundColor: canSubmit ? palette.text : palette.border }]}
      >
        {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={[styles.ctaText, { color: palette.card }]}>{selectedVariation ? `Buy for ${formatNaira(selectedPrice)}` : 'Select a bundle'}</Text>}
      </Pressable>

      <View style={[styles.recentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent purchases</Text>
        {mutation.isPending && !recentPurchases.length ? (
          <StateCard loading title="Processing data purchase" description="We’re preparing the receipt and saving the bundle purchase." icon={<Globe size={22} color={palette.textSecondary} />} />
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
          <StateCard title="No data purchases yet" description="Buy a plan to see your recent data purchases here." icon={<Globe size={22} color={palette.textSecondary} />} />
        )}
      </View>

      <Modal visible={providerPickerOpen} transparent animationType="fade" onRequestClose={() => setProviderPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProviderPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a provider</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Select your mobile network operator below.</Text>
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
                        setSelectedVariationCode('');
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
              <StateCard title="No data providers" description="VTpass did not return any data providers." icon={<Globe size={24} color={palette.textSecondary} />} />
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
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  hero: { borderRadius: 28, padding: Spacing.lg, gap: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroValue: { color: '#fff', fontSize: 24, fontFamily: Typography.family.bold },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, marginBottom: 10 },
  networkPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  networkText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  planCard: { width: '48%', minHeight: 128, borderRadius: 18, borderWidth: 1, padding: 14, justifyContent: 'space-between', gap: 6 },
  planSize: { fontSize: Typography.sm, fontFamily: Typography.family.bold, lineHeight: 20 },
  planPrice: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  planValidity: { fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  summaryCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 6 },
  summaryTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  summaryMeta: { fontSize: Typography.xs },
  summaryAmount: { fontSize: 28, fontFamily: Typography.family.bold, marginTop: 2 },
  cta: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  recentList: { gap: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  recentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentMeta: { marginTop: 2, fontSize: Typography.xs },
  recentAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
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
