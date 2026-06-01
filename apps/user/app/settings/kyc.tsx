import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ShieldCheck, ScanFace, BadgeCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useProfile, useUpdateProfile, useVerifyBvn, useVerifyNin } from '@/hooks/useProfile';

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidIdInput(value: string) {
  return /^\d{11}$/.test(value.trim());
}

type KycMethod = 'BVN' | 'NIN';

const methods: Array<{ key: KycMethod; title: string; description: string; recommended?: boolean }> = [
  { key: 'BVN', title: 'Use BVN', description: 'Best for NUBAN setup and bank-backed verification.', recommended: true },
  { key: 'NIN', title: 'Use NIN', description: 'Alternative path if you want NIN-based verification.' },
];

export default function KycScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const verifyNin = useVerifyNin();
  const verifyBvn = useVerifyBvn();
  const profile = profileQuery.data;

  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [method, setMethod] = useState<KycMethod>('BVN');
  const [nin, setNin] = useState('');
  const [bvn, setBvn] = useState('');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    setAddress(profile?.address ?? '');
    setDateOfBirth(profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '');
    setMethod((profile?.kycMethod ?? 'BVN') as KycMethod);
    setNin(profile?.ninNumber ?? '');
    setBvn(profile?.bvnNumber ?? '');
  }, [profile]);

  const selectedValue = method === 'BVN' ? bvn : nin;
  const selectedVerified = method === 'BVN' ? Boolean(profile?.bvnVerified) : Boolean(profile?.ninVerified);
  const kycComplete = Boolean(profile?.kycComplete);
  const canSubmit =
    address.trim().length >= 8 &&
    isValidDateInput(dateOfBirth) &&
    isValidIdInput(selectedValue) &&
    consent &&
    !updateProfile.isPending &&
    !verifyNin.isPending &&
    !verifyBvn.isPending;

  const selectedMethodLabel = useMemo(() => methods.find((item) => item.key === method)?.title ?? 'Use BVN', [method]);

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert('Complete the form', 'Add your address, date of birth, choose BVN or NIN, and consent before continuing.');
      return;
    }

    try {
      const updatedProfile = await updateProfile.mutateAsync({
        address: address.trim(),
        dateOfBirth: dateOfBirth.trim(),
        kycMethod: method,
      });

      let nextProfile = updatedProfile;

      if (method === 'BVN') {
        if (!updatedProfile.bvnVerified || updatedProfile.bvnNumber !== bvn.trim()) {
          nextProfile = await verifyBvn.mutateAsync({ bvn: bvn.trim() });
        }
      } else if (!updatedProfile.ninVerified || updatedProfile.ninNumber !== nin.trim()) {
        nextProfile = await verifyNin.mutateAsync({ nin: nin.trim() });
      }

      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      Alert.alert(
        'KYC verified',
        nextProfile.kycComplete
          ? 'Your account is ready for deposits and bank transfers.'
          : 'Your details were saved. Finish the selected verification path to unlock wallet features.',
      );
      router.back();
    } catch (error) {
      Alert.alert('Could not save KYC', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => router.back()}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrowLabel, { color: palette.primary }]}>KYC Verification</Text>
        <Text style={[styles.pageTitle, { color: palette.text }]}>Unlock deposits and bank payouts with identity verification.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Identity check</Text>
            <Text style={styles.heroValue}>{kycComplete ? 'KYC already complete' : 'Complete your KYC'}</Text>
          </View>
          <View style={styles.heroIcon}>
            <ShieldCheck size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>Choose one verification path. BVN is the recommended route for NUBAN setup, while NIN stays available as an alternative.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <StateCard
          title={kycComplete ? 'Profile verified' : 'Verification required'}
          description={kycComplete ? 'Your KYC profile is ready for deposits and bank payouts.' : 'Fill in the details below and choose BVN or NIN to unlock dedicated account creation.'}
          icon={<ScanFace size={24} color={palette.textSecondary} />}
        />

        <View style={styles.statusGrid}>
          <View style={[styles.statusChip, { backgroundColor: profile?.address ? 'rgba(48,209,88,0.12)' : 'rgba(255,214,10,0.12)', borderColor: profile?.address ? palette.success : palette.warning }]}>
            <Text style={[styles.statusChipLabel, { color: profile?.address ? palette.success : palette.warning }]}>Address</Text>
            <Text style={[styles.statusChipValue, { color: palette.text }]}>{profile?.address ? 'Saved' : 'Missing'}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: profile?.dateOfBirth ? 'rgba(48,209,88,0.12)' : 'rgba(255,214,10,0.12)', borderColor: profile?.dateOfBirth ? palette.success : palette.warning }]}>
            <Text style={[styles.statusChipLabel, { color: profile?.dateOfBirth ? palette.success : palette.warning }]}>DOB</Text>
            <Text style={[styles.statusChipValue, { color: palette.text }]}>{profile?.dateOfBirth ? 'Saved' : 'Missing'}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: selectedVerified ? 'rgba(48,209,88,0.12)' : 'rgba(255,214,10,0.12)', borderColor: selectedVerified ? palette.success : palette.warning }]}>
            <Text style={[styles.statusChipLabel, { color: selectedVerified ? palette.success : palette.warning }]}>{selectedMethodLabel}</Text>
            <Text style={[styles.statusChipValue, { color: palette.text }]}>{selectedVerified ? 'Verified' : 'Pending'}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: kycComplete ? 'rgba(48,209,88,0.12)' : 'rgba(255,214,10,0.12)', borderColor: kycComplete ? palette.success : palette.warning }]}>
            <Text style={[styles.statusChipLabel, { color: kycComplete ? palette.success : palette.warning }]}>NUBAN</Text>
            <Text style={[styles.statusChipValue, { color: palette.text }]}>{kycComplete ? 'Ready' : 'Locked'}</Text>
          </View>
        </View>

        <View style={styles.methodRow}>
          {methods.map((item) => {
            const active = item.key === method;
            return (
              <Pressable
                key={item.key}
                onPress={() => setMethod(item.key)}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: active ? palette.primary : palette.bg,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <View style={styles.methodHeading}>
                  <Text style={[styles.methodTitle, { color: active ? palette.card : palette.text }]}>{item.title}</Text>
                  {item.recommended ? <Text style={[styles.recommended, { color: active ? palette.card : palette.primary }]}>Recommended</Text> : null}
                </View>
                <Text style={[styles.methodDescription, { color: active ? 'rgba(255,255,255,0.76)' : palette.textSecondary }]}>{item.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Residential address"
          value={address}
          onChangeText={setAddress}
          placeholder="12 Broad Street, Lagos"
          helperText="Use the address that matches your identity documents."
        />

        <Input
          label="Date of birth"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          helperText="Enter your date of birth in ISO format, for example 1998-04-18."
        />

        {method === 'BVN' ? (
          <Input
            label="BVN"
            value={bvn}
            onChangeText={setBvn}
            placeholder="11 digit BVN"
            keyboardType="number-pad"
            helperText="BVN is the recommended option for NUBAN setup."
          />
        ) : (
          <Input
            label="NIN"
            value={nin}
            onChangeText={setNin}
            placeholder="11 digit NIN"
            keyboardType="number-pad"
            helperText="Use NIN if you prefer the alternative identity path."
          />
        )}

        <Pressable onPress={() => setConsent((value) => !value)} style={[styles.consentRow, { borderColor: consent ? palette.primary : palette.border, backgroundColor: consent ? 'rgba(10,132,255,0.08)' : palette.bg }]}>
          <View style={[styles.checkbox, { borderColor: consent ? palette.primary : palette.border, backgroundColor: consent ? palette.primary : 'transparent' }]}>
            {consent ? <Text style={styles.checkboxMark}>✓</Text> : null}
          </View>
          <View style={styles.consentCopy}>
            <Text style={[styles.consentTitle, { color: palette.text }]}>I consent to identity verification</Text>
            <Text style={[styles.consentBody, { color: palette.textSecondary }]}>I agree that Percel can use these details to verify me and create my dedicated account.</Text>
          </View>
        </Pressable>
      </View>

      <Pressable disabled={!canSubmit} onPress={() => void submit()} style={[styles.primary, { backgroundColor: canSubmit ? palette.primary : palette.border }]}>
        <Text style={styles.primaryText}>{updateProfile.isPending || verifyNin.isPending || verifyBvn.isPending ? 'Verifying…' : 'Save and continue'}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={[styles.secondary, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.secondaryText, { color: palette.text }]}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { gap: 8 },
  eyebrowLabel: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  pageTitle: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  hero: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusChip: { flexBasis: '48%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  statusChipLabel: { fontSize: Typography.xs, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 1 },
  statusChipValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: Spacing.md, gap: 4 },
  methodHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  methodTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  recommended: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  methodDescription: { fontSize: Typography.xs, lineHeight: 16 },
  consentRow: { flexDirection: 'row', gap: 12, padding: Spacing.md, borderWidth: 1, borderRadius: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxMark: { color: '#fff', fontSize: 13, fontFamily: Typography.family.bold },
  consentCopy: { flex: 1, gap: 2 },
  consentTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  consentBody: { fontSize: Typography.sm, lineHeight: 20 },
  primary: { borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold },
  secondary: { borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
