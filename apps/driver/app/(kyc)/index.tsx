import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ActionButton, Card, Pill, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { hexToRgba } from '@/lib/theme';
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
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: {
    borderRadius: 24,
    padding: Spacing.xl,
    backgroundColor: Colors.light.primary,
    gap: 8,
  },
  eyebrow: { color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase', letterSpacing: 0, fontSize: Typography.xs, fontWeight: Typography.bold, fontFamily: Typography.family.bold },
  title: { color: '#FFFFFF', fontSize: Typography.xxl, lineHeight: 36, fontWeight: Typography.bold, fontFamily: Typography.family.bold },
  subtitle: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 21, fontFamily: Typography.family.regular },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgePending: { backgroundColor: hexToRgba(Colors.light.textSecondary, 0.18) },
  stepBadgeComplete: { backgroundColor: Colors.light.success },
  stepBadgeText: { color: '#FFFFFF', fontSize: Typography.xs, fontWeight: Typography.bold, fontFamily: Typography.family.bold },
  stepCopy: { flex: 1 },
  stepLabel: { color: Colors.light.text, fontSize: Typography.sm, fontWeight: Typography.semibold, fontFamily: Typography.family.semibold },
  stepMeta: { color: Colors.light.textSecondary, fontSize: Typography.xs, marginTop: 2, fontFamily: Typography.family.regular },
  reviewCopy: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 21, fontFamily: Typography.family.regular },
});
