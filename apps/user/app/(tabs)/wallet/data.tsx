import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronDown, ContactRound } from 'lucide-react-native';

import { Input } from '@/components/ui/Input';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { StateCard } from '@/components/ui/StateCard';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNaira, telecomNetworks } from '@/lib/wallet';
import { useBuyData } from '@/hooks/useWallet';

type Network = (typeof telecomNetworks)[number];

type Plan = {
  id: string;
  tab: 'popular' | 'daily' | 'weekly' | 'monthly';
  size: string;
  price: number;
  validity: string;
  badge?: 'Popular' | 'Best Value';
};

const tabs = [
  { key: 'popular', label: 'Popular' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
] as const;

const plans: Plan[] = [
  { id: 'pop-1', tab: 'popular', size: '1.5GB', price: 500, validity: '1 day', badge: 'Popular' },
  { id: 'pop-2', tab: 'popular', size: '3GB', price: 1000, validity: '3 days', badge: 'Best Value' },
  { id: 'pop-3', tab: 'popular', size: '7GB', price: 2000, validity: '7 days' },
  { id: 'day-1', tab: 'daily', size: '250MB', price: 100, validity: '24 hrs' },
  { id: 'day-2', tab: 'daily', size: '1GB', price: 300, validity: '24 hrs', badge: 'Popular' },
  { id: 'day-3', tab: 'daily', size: '1.5GB', price: 500, validity: '24 hrs', badge: 'Best Value' },
  { id: 'week-1', tab: 'weekly', size: '2GB', price: 700, validity: '7 days' },
  { id: 'week-2', tab: 'weekly', size: '5GB', price: 1500, validity: '7 days', badge: 'Popular' },
  { id: 'week-3', tab: 'weekly', size: '10GB', price: 2500, validity: '7 days', badge: 'Best Value' },
  { id: 'month-1', tab: 'monthly', size: '10GB', price: 5000, validity: '30 days', badge: 'Popular' },
  { id: 'month-2', tab: 'monthly', size: '20GB', price: 8500, validity: '30 days', badge: 'Best Value' },
  { id: 'month-3', tab: 'monthly', size: '30GB', price: 12000, validity: '30 days' },
];

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

export default function DataScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const mutation = useBuyData();
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<Network>('MTN');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('popular');
  const [selectedPlanId, setSelectedPlanId] = useState('pop-2');
  const [customAmount, setCustomAmount] = useState('');
  const [networkPickerOpen, setNetworkPickerOpen] = useState(false);
  const [tabsWidth, setTabsWidth] = useState(0);
  const [planGridWidth, setPlanGridWidth] = useState(0);
  const [recentPurchases, setRecentPurchases] = useState<Array<{ id: string; title: string; meta: string; amount: string }>>([]);
  const indicatorX = useRef(new Animated.Value(0)).current;

  const detectedNetwork = useMemo(() => detectNetwork(phone), [phone]);
  const visibleNetwork = detectedNetwork ?? network;
  const filteredPlans = useMemo(() => plans.filter((plan) => plan.tab === activeTab), [activeTab]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? filteredPlans[0];
  const selectedPrice = Number(customAmount || selectedPlan?.price || 0);
  const canSubmit = phone.replace(/\D/g, '').length >= 10 && Boolean(selectedPlan) && !mutation.isPending;

  const setTab = (tab: (typeof tabs)[number]['key']) => {
    setActiveTab(tab);
    const first = plans.find((plan) => plan.tab === tab);
    if (first) setSelectedPlanId(first.id);
  };

  useEffect(() => {
    if (!tabsWidth) return;
    const index = tabs.findIndex((tab) => tab.key === activeTab);
    Animated.spring(indicatorX, {
      toValue: index * ((tabsWidth - 8) / tabs.length),
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [activeTab, indicatorX, tabsWidth]);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Buy Data</Text>
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

      <View style={styles.tabsShell}>
        <View
          onLayout={(event) => setTabsWidth(event.nativeEvent.layout.width)}
          style={[styles.tabs, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: tabsWidth ? (tabsWidth - 8) / tabs.length : 0,
                backgroundColor: palette.text,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
          {tabs.map((tab, index) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setTab(tab.key);
                  if (tabsWidth > 0) {
                    Animated.spring(indicatorX, {
                      toValue: index * ((tabsWidth - 8) / tabs.length),
                      useNativeDriver: true,
                      damping: 16,
                      stiffness: 180,
                      mass: 0.9,
                    }).start();
                  }
                }}
                style={styles.tabButton}
              >
                <Text style={[styles.tabText, { color: active ? palette.card : palette.textSecondary, fontFamily: active ? Typography.family.bold : Typography.family.medium }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View onLayout={(event) => setPlanGridWidth(event.nativeEvent.layout.width)} style={styles.planGrid}>
        {filteredPlans.map((plan) => {
          const active = plan.id === selectedPlanId;
          const cardWidth = planGridWidth ? (planGridWidth - 20) / 3 : undefined;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlanId(plan.id)}
              style={({ pressed }) => [
                styles.planCard,
                {
                  width: cardWidth,
                  backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.card,
                  borderColor: active ? palette.primary : palette.border,
                  transform: [{ scale: pressed ? 0.97 : active ? 1.03 : 1 }],
                },
              ]}
            >
              {plan.badge ? (
                <View style={[styles.badge, { backgroundColor: plan.badge === 'Best Value' ? 'rgba(48,209,88,0.15)' : 'rgba(255,149,0,0.14)' }]}>
                  <Text style={[styles.badgeText, { color: palette.text }]}>{plan.badge}</Text>
                </View>
              ) : null}
              <Text style={[styles.planSize, { color: palette.text }]}>{plan.size}</Text>
              <Text style={[styles.planPrice, { color: palette.text }]}>{formatNaira(plan.price)}</Text>
              <Text style={[styles.planValidity, { color: palette.primary }]}>{plan.validity}</Text>
            </Pressable>
          );
        })}
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Custom amount</Text>
        <Input
          label="Optional override"
          value={customAmount}
          onChangeText={(value) => {
            setCustomAmount(value.replace(/[^0-9]/g, ''));
          }}
          keyboardType="number-pad"
          placeholder="Leave blank to use the selected plan"
          leftElement={<Text style={[styles.prefix, { color: palette.textSecondary }]}>₦</Text>}
        />
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={async () => {
          try {
            const payloadAmount = selectedPrice || selectedPlan.price;
            await mutation.mutateAsync({ phone, network: visibleNetwork, amount: payloadAmount, plan: selectedPlan?.size ?? activeTab });
            setRecentPurchases((items) => [
              { id: `${Date.now()}`, title: selectedPlan.size, meta: `${visibleNetwork} data`, amount: formatNaira(payloadAmount) },
              ...items,
            ].slice(0, 5));
            Alert.alert('Data purchased', `You bought ${selectedPlan.size} for ${formatNaira(payloadAmount)}.`);
          } catch (error) {
            Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unable to buy data.');
          }
        }}
        style={[styles.cta, { backgroundColor: canSubmit ? palette.text : palette.border }]}
      >
        {mutation.isPending ? <ActivityIndicator color={palette.card} /> : <Text style={[styles.ctaText, { color: palette.card }]}>{`Buy ${selectedPlan?.size ?? 'data'} for ${formatNaira(selectedPrice || selectedPlan.price)}`}</Text>}
      </Pressable>

      <View style={[styles.recentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent purchases</Text>
        {mutation.isPending && !recentPurchases.length ? (
          <StateCard
            loading
            title="Processing data purchase"
            description="We’re preparing the receipt and saving the bundle purchase."
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
            title="No data purchases yet"
            description="Buy a plan to see your recent data purchases here."
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
  tabsShell: { marginTop: 2 },
  tabs: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, padding: 4, position: 'relative' },
  indicator: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 14 },
  tabButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText: { fontSize: Typography.sm },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  planCard: { borderRadius: 16, borderWidth: 1, padding: 12, minHeight: 132, gap: 6, justifyContent: 'space-between' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  planSize: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  planPrice: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  planValidity: { fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, marginBottom: 10 },
  prefix: { fontSize: Typography.xl, fontFamily: Typography.family.bold },
  cta: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center', paddingHorizontal: 16 },
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
