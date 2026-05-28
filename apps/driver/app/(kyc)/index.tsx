import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ActionButton, Card, Pill, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useDriverStore } from '@/store/driver.store';

const steps = [
  { key: 'nin', label: 'NIN verification', route: '/(kyc)/nin' },
  { key: 'bvn', label: 'BVN verification', route: '/(kyc)/bvn' },
  { key: 'license', label: 'License photo', route: '/(kyc)/documents' },
  { key: 'selfie', label: 'Selfie', route: '/(kyc)/documents' },
  { key: 'vehicle', label: 'Vehicle photo', route: '/(kyc)/documents' },
] as const;

export default function KycOverviewScreen() {
  const driver = useDriverStore((state) => state.driver);
  const status = driver?.status ?? 'PENDING_KYC';
  const activeCount = status === 'ACTIVE' ? steps.length : status === 'KYC_SUBMITTED' ? 3 : 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>KYC flow</Text>
          <Text style={styles.title}>Complete verification to go live.</Text>
          <Text style={styles.subtitle}>We need identity, license, and vehicle verification before dispatch can place you on the active driver board.</Text>
        </View>

        <Card>
          <SectionHeader title="Verification steps" caption={`${activeCount}/${steps.length} complete`} />
          {steps.map((step, index) => {
            const complete = index < activeCount;
            return (
              <Pressable key={step.key} onPress={() => router.push(step.route)} style={styles.stepRow}>
                <View style={[styles.stepBadge, complete ? styles.stepBadgeComplete : styles.stepBadgePending]}>
                  <Text style={styles.stepBadgeText}>{complete ? '✓' : String(index + 1)}</Text>
                </View>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text style={styles.stepMeta}>{complete ? 'Submitted' : 'Tap to start'}</Text>
                </View>
                {complete ? <Pill label="Done" tone="success" /> : <Pill label="Pending" tone="warning" />}
              </Pressable>
            );
          })}
        </Card>

        <Card tone="tint">
          <SectionHeader title="What happens next" caption="Dispatch review" />
          <Text style={styles.reviewCopy}>
            Once the documents are submitted, the profile moves to under review. After approval your driver tabs become available automatically.
          </Text>
        </Card>

        <ActionButton title="Start Verification" onPress={() => router.push('/(kyc)/nin')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 28 },
  hero: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  eyebrow: { color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgePending: { backgroundColor: '#334155' },
  stepBadgeComplete: { backgroundColor: '#14432C' },
  stepBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  stepCopy: { flex: 1 },
  stepLabel: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  stepMeta: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  reviewCopy: { color: '#CBD5E1', fontSize: 14, lineHeight: 21 },
});
