import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { ShieldCheck, ArrowRight, CheckCircle2, ChevronRight, FileText, Camera, Bike, CreditCard, ShieldAlert, Clock, AlertTriangle } from 'lucide-react-native';

import { Text, View } from '@/components/Themed';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette, hexToRgba, isLight } from '@/lib/theme';
import { useDriverStore } from '@/store/driver.store';
import { useDriverProfile } from '@/hooks/useDriverProfile';

export default function KycOverviewScreen() {
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const driver = useDriverStore((state) => state.driver);
  const profileQuery = useDriverProfile();
  const profile = profileQuery.data;

  const driverStatus = profile?.status ?? driver?.status ?? 'PENDING_KYC';
  const identityVerified = Boolean(profile?.kyc?.ninVerified || profile?.kyc?.bvnVerified || profile?.kycStatus === 'APPROVED');
  const vehicleStatus = profile?.vehicleStatus ?? profile?.kyc?.vehicleStatus ?? 'PENDING';
  const vehicleRejectionReason = profile?.kyc?.vehicleRejectionReason ?? null;

  const isFullyVerified = driverStatus === 'ACTIVE' && identityVerified && vehicleStatus === 'APPROVED';

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
                {isFullyVerified ? 'VERIFIED & ACTIVE' : 'VERIFICATION REQUIRED'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>
            {isFullyVerified ? 'You are fully verified' : 'Driver Verification'}
          </Text>
          <Text style={styles.subtitle}>
            {isFullyVerified 
              ? 'Your driver profile & vehicle are active. You are eligible to receive dispatch requests.'
              : 'Complete your identity check and submit your vehicle details for admin approval.'}
          </Text>
        </View>

        {/* ── SECTION 1: IDENTITY KYC (Automated NIN/BVN like User App) ── */}
        <View style={styles.stepsWrap}>
          <View style={styles.stepsHeader}>
            <Text style={[styles.stepsTitle, { color: palette.text }]}>1. Identity & NUBAN KYC</Text>
            <Text style={[styles.stepsProgress, { color: identityVerified ? '#30D158' : palette.primary }]}>
              {identityVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
          
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Pressable 
              onPress={() => router.push('/(kyc)/bvn' as any)} 
              style={({ pressed }) => [
                styles.stepRow,
                pressed && !identityVerified ? { backgroundColor: hexToRgba(palette.text, 0.04) } : null,
              ]}
            >
              <View style={[styles.stepIconWrap, { backgroundColor: identityVerified ? hexToRgba('#30D158', 0.12) : hexToRgba(palette.primary, 0.12) }]}>
                {identityVerified ? <CheckCircle2 size={20} color="#30D158" /> : <ShieldCheck size={20} color={palette.primary} />}
              </View>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepLabel, { color: palette.text }]}>BVN & Dedicated Account</Text>
                <Text style={[styles.stepDesc, { color: palette.textSecondary }]}>
                  {identityVerified ? 'Identity verified & Driver Virtual NUBAN generated' : 'Verify BVN to create your driver NUBAN virtual account'}
                </Text>
              </View>
              <ChevronRight size={20} color={palette.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ── SECTION 2: VEHICLE VERIFICATION (Submitted to Admin) ── */}
        <View style={styles.stepsWrap}>
          <View style={styles.stepsHeader}>
            <Text style={[styles.stepsTitle, { color: palette.text }]}>2. Vehicle Verification (Bike, Keke, Car)</Text>
            <Text style={[styles.stepsProgress, { color: vehicleStatus === 'APPROVED' ? '#30D158' : vehicleStatus === 'SUBMITTED' ? '#FFD60A' : palette.error }]}>
              {vehicleStatus === 'APPROVED' ? 'Approved' : vehicleStatus === 'SUBMITTED' ? 'Under Review' : vehicleStatus === 'REJECTED' ? 'Declined' : 'Required'}
            </Text>
          </View>
          
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Pressable 
              onPress={() => router.push('/vehicle-verification' as any)} 
              style={({ pressed }) => [
                styles.stepRow,
                pressed ? { backgroundColor: hexToRgba(palette.text, 0.04) } : null,
              ]}
            >
              <View style={[
                styles.stepIconWrap, 
                { 
                  backgroundColor: vehicleStatus === 'APPROVED'
                    ? hexToRgba('#30D158', 0.12) 
                    : vehicleStatus === 'SUBMITTED' 
                    ? hexToRgba('#FFD60A', 0.14) 
                    : vehicleStatus === 'REJECTED' 
                    ? hexToRgba(palette.error, 0.14) 
                    : hexToRgba(palette.primary, 0.12) 
                }
              ]}>
                {vehicleStatus === 'APPROVED' ? (
                  <CheckCircle2 size={20} color="#30D158" />
                ) : vehicleStatus === 'SUBMITTED' ? (
                  <Clock size={20} color="#FFD60A" />
                ) : vehicleStatus === 'REJECTED' ? (
                  <AlertTriangle size={20} color={palette.error} />
                ) : (
                  <Bike size={20} color={palette.primary} />
                )}
              </View>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepLabel, { color: palette.text }]}>Vehicle Profile & License</Text>
                <Text style={[styles.stepDesc, { color: vehicleStatus === 'REJECTED' ? palette.error : palette.textSecondary }]}>
                  {vehicleStatus === 'APPROVED'
                    ? 'Vehicle & license verified for order dispatching' 
                    : vehicleStatus === 'SUBMITTED' 
                    ? 'Submitted — Pending Admin Review' 
                    : vehicleStatus === 'REJECTED' 
                    ? `Declined: ${vehicleRejectionReason || 'Tap to review and resubmit'}` 
                    : 'Register your vehicle type (Bike, Tricycle, or Car) & license plate'}
                </Text>
              </View>
              <ChevronRight size={20} color={palette.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ── Status Banner ── */}
        {isFullyVerified ? (
          <View style={[styles.infoBox, { backgroundColor: 'rgba(48,209,88,0.15)', borderColor: '#30D15840' }]}>
            <ShieldCheck size={22} color="#30D158" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: Typography.xs, fontWeight: Typography.bold }}>
                Account & Vehicle Fully Verified! 🎉
              </Text>
              <Text style={[styles.infoText, { color: palette.textSecondary, marginTop: 2 }]}>
                You are ready to receive delivery jobs based on your vehicle category.
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.infoBox, { backgroundColor: lightBg ? 'rgba(255,214,10,0.1)' : 'rgba(255,214,10,0.15)', borderColor: palette.border }]}>
            <ShieldAlert size={20} color="#FFD60A" />
            <Text style={[styles.infoText, { color: palette.textSecondary }]}>
              Vehicle documents are reviewed by Administration through the Admin Dashboard. Approval usually takes under 24 hours.
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Fixed Bottom Action Button ── */}
      {!isFullyVerified && (
        <View style={[styles.bottomBar, { backgroundColor: palette.card, borderTopColor: palette.border }]}>
          {!identityVerified ? (
            <Pressable
              onPress={() => router.push('/(kyc)/bvn' as any)}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>Verify Identity (BVN & Account)</Text>
              <ArrowRight size={20} color="#FFF" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/vehicle-verification' as any)}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>{vehicleStatus === 'REJECTED' ? 'Resubmit Vehicle Details' : 'Submit Vehicle Verification'}</Text>
              <ArrowRight size={20} color="#FFF" />
            </Pressable>
          )}
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
  
  stepsWrap: { gap: Spacing.sm },
  stepsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xs },
  stepsTitle: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  stepsProgress: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_700Bold' },
  
  card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.lg },
  stepIconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepCopy: { flex: 1, gap: 2 },
  stepLabel: { fontSize: Typography.md, fontFamily: 'SpaceGrotesk_700Bold' },
  stepDesc: { fontSize: Typography.xs, fontFamily: 'SpaceGrotesk_400Regular' },
  
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
