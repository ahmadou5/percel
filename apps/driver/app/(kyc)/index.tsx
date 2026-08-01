import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { ShieldCheck, ArrowRight, CheckCircle2, ChevronRight, FileText, Camera, Bike, CreditCard, ShieldAlert } from 'lucide-react-native';

import { Text, View } from '@/components/Themed';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette, hexToRgba, isLight } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';

const steps = [
  { key: 'nin', label: 'NIN Verification', desc: 'Verify your identity securely', route: '/(kyc)/nin', icon: CreditCard },
  { key: 'bvn', label: 'BVN Verification', desc: 'Link your bank details', route: '/(kyc)/bvn', icon: ShieldCheck },
  { key: 'license', label: 'Driver License', desc: 'Upload a clear photo', route: '/(kyc)/documents', icon: FileText },
  { key: 'selfie', label: 'Selfie Verification', desc: 'Face match your ID', route: '/(kyc)/documents', icon: Camera },
  { key: 'vehicle', label: 'Vehicle Details', desc: 'Photos & plate number', route: '/(kyc)/documents', icon: Bike },
] as const;

export default function KycOverviewScreen() {
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const driver = useDriverStore((state) => state.driver);
  const status = driver?.status ?? 'PENDING_KYC';
  const activeCount = status === 'ACTIVE' ? steps.length : status === 'KYC_SUBMITTED' ? 3 : 0;
  
  const isComplete = status === 'ACTIVE';

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── Premium Hero ── */}
        <View style={[styles.hero, { backgroundColor: palette.primary }]}>
          <View style={styles.heroDecorA} />
          <View style={styles.heroDecorB} />
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <ShieldCheck size={26} color="#FFF" />
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {isComplete ? 'VERIFIED' : 'ACTION REQUIRED'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>
            {isComplete ? 'You are fully verified' : 'Complete verification\nto go live.'}
          </Text>
          <Text style={styles.subtitle}>
            {isComplete 
              ? 'Your driver account is active. You can now accept dispatch requests.'
              : 'We need your identity, license, and vehicle verification before dispatch can place you on the active board.'}
          </Text>
        </View>

        {/* ── Step Cards ── */}
        <View style={styles.stepsWrap}>
          <View style={styles.stepsHeader}>
            <Text style={[styles.stepsTitle, { color: palette.text }]}>Verification Steps</Text>
            <Text style={[styles.stepsProgress, { color: palette.primary }]}>{activeCount} of {steps.length}</Text>
          </View>
          
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {steps.map((step, index) => {
              const complete = index < activeCount;
              const Icon = step.icon;
              return (
                <Pressable 
                  key={step.key} 
                  onPress={() => !complete && router.push(step.route)} 
                  style={({ pressed }) => [
                    styles.stepRow,
                    index !== steps.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.border },
                    pressed && !complete ? { backgroundColor: hexToRgba(palette.text, 0.04) } : null,
                  ]}
                >
                  <View style={[styles.stepIconWrap, { backgroundColor: complete ? hexToRgba('#30D158', 0.12) : hexToRgba(palette.primary, 0.12) }]}>
                    {complete ? (
                      <CheckCircle2 size={20} color="#30D158" />
                    ) : (
                      <Icon size={20} color={palette.primary} />
                    )}
                  </View>
                  <View style={styles.stepCopy}>
                    <Text style={[styles.stepLabel, { color: palette.text }]}>{step.label}</Text>
                    <Text style={[styles.stepDesc, { color: palette.textSecondary }]}>{complete ? 'Verified' : step.desc}</Text>
                  </View>
                  {!complete && <ChevronRight size={20} color={palette.textSecondary} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Info Box ── */}
        {isComplete ? (
          <View style={[styles.infoBox, { backgroundColor: 'rgba(48,209,88,0.15)', borderColor: '#30D15840' }]}>
            <ShieldCheck size={22} color="#30D158" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: Typography.xs, fontWeight: Typography.bold }}>
                Virtual Account Activated! 🎉
              </Text>
              <Text style={[styles.infoText, { color: palette.textSecondary, marginTop: 2 }]}>
                Your dedicated bank account (NUBAN) is live. Go to the Wallet tab to transfer funds, pay bills, or receive bank payments.
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.infoBox, { backgroundColor: lightBg ? 'rgba(255,214,10,0.1)' : 'rgba(255,214,10,0.15)', borderColor: palette.border }]}>
            <ShieldAlert size={20} color="#FFD60A" />
            <Text style={[styles.infoText, { color: palette.textSecondary }]}>
              Once all documents are submitted, your profile will be reviewed by dispatch. Approval usually takes under 24 hours. Your dedicated Virtual Account will be generated automatically.
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Fixed Bottom Button ── */}
      {!isComplete && (
        <View style={[styles.bottomBar, { backgroundColor: palette.card, borderTopColor: palette.border }]}>
          <Pressable
            onPress={() => router.push('/(kyc)/nin')}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 }
            ]}
          >
            <Text style={styles.primaryBtnText}>Start Verification</Text>
            <ArrowRight size={20} color="#FFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: 120 },
  
  hero: {
    borderRadius: 32,
    padding: Spacing.xl,
    paddingVertical: 32,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  heroDecorA: { position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecorB: { position: 'absolute', bottom: -50, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  heroIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  heroBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  title: { color: '#FFF', fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 32, letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 22 },
  
  stepsWrap: { gap: Spacing.md },
  stepsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xs },
  stepsTitle: { fontSize: Typography.lg, fontFamily: 'SpaceGrotesk_700Bold' },
  stepsProgress: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_700Bold' },
  
  card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.lg },
  stepIconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepCopy: { flex: 1, gap: 2 },
  stepLabel: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  stepDesc: { fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_400Regular' },
  
  infoBox: { flexDirection: 'row', gap: 12, padding: Spacing.lg, borderRadius: 20, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: Typography.sm, fontFamily: 'SpaceGrotesk_500Medium', lineHeight: 20 },
  
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
});
