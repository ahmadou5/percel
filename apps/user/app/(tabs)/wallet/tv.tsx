import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Tv2, Radio } from 'lucide-react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useColorScheme } from '@/components/useColorScheme';
import { StateCard } from '@/components/ui/StateCard';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'expo-router';

const services = [
  { key: 'dstv', label: 'DSTV' },
  { key: 'gotv', label: 'GOtv' },
  { key: 'showmax', label: 'Showmax' },
] as const;

const plans = {
  dstv: [
    { name: 'Compact', price: 15000 },
    { name: 'Compact Plus', price: 24000 },
    { name: 'Premium', price: 44000 },
  ],
  gotv: [
    { name: 'Jinja', price: 3300 },
    { name: 'Jolli', price: 5600 },
    { name: 'Max', price: 8500 },
  ],
  showmax: [
    { name: 'Mobile', price: 2500 },
    { name: 'Standard', price: 4500 },
  ],
} as const;

export default function TvScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const [service, setService] = useState<(typeof services)[number]['key']>('dstv');
  const [cardNumber, setCardNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('Compact');
  const [recentSubscriptions, setRecentSubscriptions] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);

  const servicePlans = plans[service];
  const currentPlan = servicePlans.find((plan) => plan.name === selectedPlan) ?? servicePlans[0];
  const ready = cardNumber.trim().length >= 10 && Boolean(currentPlan);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={[styles.serviceIcon, { backgroundColor: 'rgba(255, 149, 0, 0.14)' }]}>
          <Tv2 color={palette.primary} size={22} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>TV Subscription</Text>
          <Text style={[styles.title, { color: palette.text }]}>Pick a provider and pay in a clean, guided flow.</Text>
        </View>
      </View>

      <View style={styles.serviceRow}>
        {services.map((item) => {
          const active = item.key === service;
          return (
            <Pressable key={item.key} onPress={() => { setService(item.key); setSelectedPlan(plans[item.key][0].name); }} style={[styles.serviceChip, { backgroundColor: palette.card, borderColor: active ? palette.primary : palette.border, opacity: active ? 1 : 0.78 }]}>
              <Text style={[styles.serviceChipText, { color: palette.text }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Input
          label="Smartcard number"
          value={cardNumber}
          onChangeText={setCardNumber}
          keyboardType="number-pad"
          placeholder="10-digit smartcard number"
          rightElement={<Pressable style={[styles.inlineButton, { backgroundColor: palette.primary }]} onPress={() => Alert.alert('Verify', 'Smartcard verification is not connected yet.') }><Text style={styles.inlineButtonText}>Verify</Text></Pressable>}
          helperText="Enter the smartcard number exactly as shown on your decoder."
        />
      </View>

      <View style={[styles.planCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Available plans</Text>
        <View style={styles.planList}>
          {servicePlans.map((plan) => {
            const active = plan.name === selectedPlan;
            return (
              <Pressable key={plan.name} onPress={() => setSelectedPlan(plan.name)} style={[styles.planRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? 'rgba(10,132,255,0.08)' : 'transparent' }]}>
                <View>
                  <Text style={[styles.planName, { color: palette.text }]}>{plan.name}</Text>
                  <Text style={[styles.planMeta, { color: palette.textSecondary }]}>{service.toUpperCase()} • monthly access</Text>
                </View>
                <Text style={[styles.planPrice, { color: palette.text }]}>{`₦${plan.price.toLocaleString('en-NG')}`}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.recentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent subscriptions</Text>
        {recentSubscriptions.length ? (
          <View style={styles.recentList}>
            {recentSubscriptions.map((item) => (
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
            title="No recent subscriptions"
            description="Your TV renewals will appear here once you make a payment."
            icon={<Radio size={24} color={palette.textSecondary} />}
          />
        )}
      </View>

      <Pressable
        disabled={!ready}
        onPress={() => {
          setRecentSubscriptions((items) => [
            { id: `${Date.now()}`, title: `${service.toUpperCase()} ${currentPlan.name}`, meta: 'TV subscription', amount: `₦${currentPlan.price.toLocaleString('en-NG')}` },
            ...items,
          ].slice(0, 5));
          Alert.alert('TV subscription', `Renew ${currentPlan.name} for ₦${currentPlan.price.toLocaleString('en-NG')}.`);
        }}
        style={[styles.cta, { backgroundColor: ready ? palette.primary : palette.border }]}
      >
        <Text style={styles.ctaText}>{ready ? `Renew ${currentPlan.name} for ₦${currentPlan.price.toLocaleString('en-NG')}` : 'Enter details to continue'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  serviceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1, gap: 4 },
  eyebrow: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  serviceRow: { flexDirection: 'row', gap: 10 },
  serviceChip: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: 16, borderWidth: 1 },
  serviceChipText: { fontFamily: Typography.family.semibold },
  card: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, marginBottom: Spacing.md },
  inlineButton: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  inlineButtonText: { color: '#fff', fontFamily: Typography.family.bold },
  planCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg },
  planList: { gap: 10 },
  planRow: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontFamily: Typography.family.bold, fontSize: Typography.md },
  planMeta: { marginTop: 2, fontSize: Typography.xs },
  planPrice: { fontFamily: Typography.family.bold, fontSize: Typography.md },
  recentCard: { borderRadius: 22, borderWidth: 1, padding: Spacing.lg, gap: 12 },
  recentList: { gap: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  recentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  recentMeta: { marginTop: 2, fontSize: Typography.xs },
  recentAmount: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  cta: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: Typography.family.bold, fontSize: Typography.md, textAlign: 'center', paddingHorizontal: 16 },
});
