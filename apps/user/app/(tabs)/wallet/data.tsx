import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Globe, Smartphone } from 'lucide-react-native';
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
          leftElement={<Smartphone size={16} color={palette.textSecondary} />}
        />
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Choose network</Text>
        <View style={styles.chipRow}>
          {servicesQuery.isLoading ? (
            <ActivityIndicator color={palette.primary} />
          ) : services.length ? (
            services.map((service) => {
              const active = service.serviceID === selectedServiceID;
              return (
                <Pressable
                  key={service.serviceID}
                  onPress={() => {
                    setSelectedServiceID(service.serviceID);
                    setSelectedVariationCode('');
                  }}
                  style={[styles.chip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}
                >
                  <Text style={[styles.chipText, { color: active ? palette.card : palette.text }]}>{serviceLabel(service.serviceID, service.name)}</Text>
                </Pressable>
              );
            })
          ) : (
            <StateCard
              title="No data services"
              description="VTpass did not return any data bundles for this account."
              icon={<Globe size={24} color={palette.textSecondary} />}
            />
          )}
        </View>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
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
});
