import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronLeft, CreditCard, Search, ShieldCheck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { FlowProgressDots, useSlideStepTransition, useStepBackHandler } from '@/components/wallet/WalletFlowProgress';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useProfile, useUpdateProfile, useVerifyBvn } from '@/hooks/useProfile';
import { useBanks } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidIdInput(value: string, expectedLength: number) {
  return new RegExp(`^\\d{${expectedLength}}$`).test(value.trim());
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [firstName = '', ...rest] = parts;
  return {
    firstName,
    lastName: rest.join(' '),
  };
}

type KycStep = 1 | 2 | 3;

type BankItem = {
  name: string;
  code: string;
  slug?: string | null;
  longcode?: string | null;
};

export default function KycScreen() {
  const queryClient = useQueryClient();
  const palette = useAppPalette();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const verifyBvn = useVerifyBvn();
  const banksQuery = useBanks('PAYSTACK');
  const profile = profileQuery.data;
  const banks = (banksQuery.data ?? []) as BankItem[];
  const [step, setStep] = useState<KycStep>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bvn, setBvn] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { opacity, translateX } = useSlideStepTransition(step);
  const back = useSafeBack("/profile");
  useStepBackHandler(step, () => { if (step > 1) { setStep((current) => (current - 1) as typeof step); } });

  useEffect(() => {
    const name = splitFullName(profile?.fullName ?? '');
    setFirstName(name.firstName);
    setLastName(name.lastName);
    setAddress(profile?.address ?? '');
    setDateOfBirth(profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '');
    setBvn(profile?.bvnNumber ?? '');
  }, [profile]);

  useEffect(() => {
    if (!bankCode && banks.length) {
      setBankCode(banks[0].code);
    }
  }, [bankCode, banks]);

  const selectedBank = banks.find((item) => item.code === bankCode) ?? null;
  const filteredBanks = useMemo(() => {
    const term = bankSearch.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter((bank) => `${bank.name} ${bank.code} ${bank.slug ?? ''}`.toLowerCase().includes(term));
  }, [bankSearch, banks]);

  const kycComplete = Boolean(profile?.kycComplete);
  const verificationPending = profile?.status === 'PENDING_VERIFICATION' && !kycComplete;
  const personalInfoComplete =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    address.trim().length >= 8 &&
    isValidDateInput(dateOfBirth);
  const identityComplete =
    isValidIdInput(bvn, 11) &&
    isValidIdInput(accountNumber, 10) &&
    Boolean(bankCode) &&
    consent;
  const canSubmit =
    personalInfoComplete &&
    identityComplete &&
    !updateProfile.isPending &&
    !verifyBvn.isPending;

  const statusTitle = kycComplete
    ? 'Profile verified'
    : verificationPending || submitted
      ? 'Verification pending'
      : 'Verification required';
  const statusDescription = kycComplete
    ? 'Your KYC profile is ready for deposits and bank payouts.'
    : verificationPending || submitted
      ? 'Our verification partner is validating your BVN and bank account. Your dedicated account will be created when the webhook confirms success.'
      : 'Complete the staged form below to validate your identity and unlock dedicated account creation.';

  const headerBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as KycStep);
      return;
    }
    back();
  };

  const handleNext = () => {
    if (step === 1 && personalInfoComplete) {
      setStep(2);
    }
    if (step === 2 && identityComplete) {
      setStep(3);
    }
  };

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert('Complete the form', 'Add your name, address, date of birth, BVN, account number, bank, and consent before continuing.');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        address: address.trim(),
        dateOfBirth: dateOfBirth.trim(),
        kycMethod: 'BVN',
      });

      const result = await verifyBvn.mutateAsync({
        bvn: bvn.trim(),
        accountNumber: accountNumber.trim(),
        bankCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['banks'] });

      if (result.kycComplete) {
        back();
      }
    } catch (error) {
      Alert.alert('Could not save KYC', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={headerBack}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrowLabel, { color: palette.primary }]}>KYC Verification</Text>
        <Text style={[styles.pageTitle, { color: palette.text }]}>Validate BVN and bank account in a guided flow.</Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Identity check</Text>
            <Text style={styles.heroValue}>{kycComplete ? 'KYC already complete' : (verificationPending || submitted ? 'Verification pending' : `Step ${step} of 3`)}</Text>
          </View>
          <View style={styles.heroIcon}>
            <ShieldCheck size={20} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>Customer identity verification now uses secure identity verification for BVN-linked NUBAN setup, while driver verification stays in the driver app.</Text>
        <FlowProgressDots currentStep={step} totalSteps={3} onStepPress={(targetStep) => { if (targetStep < step) setStep(targetStep as typeof step); }} />
      </View>

      <Animated.View style={{ opacity, transform: [{ translateX }] }}>
        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <CreditCard size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Personal info</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Add the name and address that should be tied to your account.</Text>
              </View>
            </View>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Input label="First name" value={firstName} onChangeText={setFirstName} placeholder="Uchenna" />
              </View>
              <View style={styles.nameField}>
                <Input label="Last name" value={lastName} onChangeText={setLastName} placeholder="Okoro" />
              </View>
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

            <Pressable
              onPress={handleNext}
              disabled={!personalInfoComplete}
              style={[styles.primaryAction, { backgroundColor: personalInfoComplete ? palette.primary : palette.border }]}
            >
              <Text style={styles.primaryActionText}>Continue to identity details</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: palette.primary }]}>
                <ShieldCheck size={16} color={palette.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Identity & bank</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Enter your BVN, pick a bank, and confirm the NUBAN account number.</Text>
              </View>
            </View>

            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Profile</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>{`${firstName.trim()} ${lastName.trim()}`.trim() || 'Full name pending'}</Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{dateOfBirth || 'DOB pending'}</Text>
            </View>

             <Input
              label="BVN"
              value={bvn}
              onChangeText={setBvn}
              placeholder="11 digit BVN"
              keyboardType="number-pad"
              helperText="BVN is required for customer verification."
            />

            <Pressable onPress={() => setBankPickerOpen(true)} style={[styles.bankButton, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <View style={styles.bankButtonCopy}>
                <Text style={[styles.bankButtonLabel, { color: palette.textSecondary }]}>Bank</Text>
                <Text style={[styles.bankButtonValue, { color: palette.text }]}>{selectedBank?.name ?? 'Choose a bank'}</Text>
                <Text style={[styles.bankButtonMeta, { color: palette.textSecondary }]}>{selectedBank?.code ?? 'Search and pick your bank'}</Text>
              </View>
              <ChevronDown size={18} color={palette.textSecondary} />
            </Pressable>

            <Input
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="0111111111"
              keyboardType="number-pad"
              helperText="Use the 10-digit NUBAN account number linked to your BVN."
            />

            <Pressable onPress={() => setConsent((value) => !value)} style={[styles.consentRow, { borderColor: consent ? palette.primary : palette.border, backgroundColor: consent ? 'rgba(10,132,255,0.08)' : palette.bg }]}>
              <View style={[styles.checkbox, { borderColor: consent ? palette.primary : palette.border, backgroundColor: consent ? palette.primary : 'transparent' }]}>
                {consent ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <View style={styles.consentCopy}>
                <Text style={[styles.consentTitle, { color: palette.text }]}>I consent to identity verification</Text>
                <Text style={[styles.consentBody, { color: palette.textSecondary }]}>I agree that Percel can verify my identity and create my dedicated account.</Text>
              </View>
            </Pressable>

            <View style={styles.stepActions}>
              <Pressable onPress={headerBack} style={[styles.secondary, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.secondaryText, { color: palette.text }]}>Back</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                disabled={!identityComplete}
                style={[styles.primaryAction, styles.stepActionFlex, { backgroundColor: identityComplete ? palette.primary : palette.border }]}
              >
                <Text style={styles.primaryActionText}>Review & submit</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepPill, { backgroundColor: 'rgba(48,209,88,0.12)', borderColor: palette.success }]}>
                <CheckCircle2 size={16} color={palette.success} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Review & submit</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>Confirm everything before we send the BVN and bank account to Paystack.</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewGroupLabel, { color: palette.textSecondary }]}>Personal info</Text>
              <Row label="Name" value={`${firstName.trim()} ${lastName.trim()}`.trim()} palette={palette} />
              <Row label="Address" value={address.trim()} palette={palette} />
              <Row label="Date of birth" value={dateOfBirth.trim()} palette={palette} />
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewGroupLabel, { color: palette.textSecondary }]}>Identity</Text>
              <Row label="BVN" value={bvn.trim()} palette={palette} />
              <Row label="Bank" value={selectedBank?.name ?? 'Select a bank'} palette={palette} />
              <Row label="Account" value={accountNumber.trim()} palette={palette} />
              <Row label="Consent" value={consent ? 'Given' : 'Missing'} palette={palette} />
            </View>

            <StateCard
              title={statusTitle}
              description={statusDescription}
              icon={<CheckCircle2 size={24} color={kycComplete ? palette.success : palette.textSecondary} />}
            />

            <View style={styles.stepActions}>
              <Pressable onPress={headerBack} style={[styles.secondary, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.secondaryText, { color: palette.text }]}>Back</Text>
              </Pressable>
              <Pressable disabled={!canSubmit} onPress={() => void submit()} style={[styles.primaryAction, styles.stepActionFlex, { backgroundColor: canSubmit ? palette.primary : palette.border }]}>
                <Text style={styles.primaryActionText}>{updateProfile.isPending || verifyBvn.isPending ? 'Verifying…' : verificationPending || submitted ? 'Verification pending' : 'Save and continue'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <Modal visible={bankPickerOpen} transparent animationType="fade" onRequestClose={() => setBankPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBankPickerOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Choose a bank</Text>
                <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>Search the supported bank list.</Text>
              </View>
              <Pressable onPress={() => setBankPickerOpen(false)} style={[styles.modalClose, { backgroundColor: palette.bg }]}>
                <Text style={[styles.modalCloseText, { color: palette.text }]}>Close</Text>
              </Pressable>
            </View>

            <Input
              label="Search banks"
              value={bankSearch}
              onChangeText={setBankSearch}
              placeholder="Search by name or code"
              leftElement={<Search size={16} color={palette.textSecondary} />}
            />

            {banksQuery.isLoading ? (
              <View style={styles.bankLoading}>
                <Text style={{ color: palette.textSecondary }}>Loading bank list...</Text>
              </View>
            ) : filteredBanks.length ? (
              <FlatList
                data={filteredBanks}
                keyExtractor={(item) => item.code}
                style={styles.bankList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.code === bankCode;
                  return (
                    <Pressable
                      onPress={() => {
                        setBankCode(item.code);
                        setBankPickerOpen(false);
                      }}
                      style={[styles.bankRow, { backgroundColor: active ? 'rgba(10,132,255,0.08)' : palette.bg, borderColor: active ? palette.primary : palette.border }]}
                    >
                      <View>
                        <Text style={[styles.bankRowName, { color: palette.text }]}>{item.name}</Text>
                        <Text style={[styles.bankRowCode, { color: palette.textSecondary }]}>{item.code}</Text>
                      </View>
                      {active ? <CheckCircle2 size={16} color={palette.primary} /> : null}
                    </Pressable>
                  );
                }}
              />
            ) : (
              <View style={styles.bankLoading}>
                <Text style={{ color: palette.textSecondary }}>No banks match your search.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useAppPalette>;
}) {
  return (
    <View style={[styles.reviewRow, { borderBottomColor: palette.border }]}> 
      <Text style={[styles.reviewLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: palette.text }]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrowLabel: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  pageTitle: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  hero: { borderRadius: 28, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroBody: { color: 'rgba(255,255,255,0.82)', fontSize: Typography.sm, lineHeight: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepPill: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  sectionSubtitle: { fontSize: Typography.xs, lineHeight: 17 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  summaryMini: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  summaryMiniLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  summaryMiniValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  summaryMiniMeta: { fontSize: Typography.xs },
  bankButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, minHeight: 64 },
  bankButtonCopy: { flex: 1, gap: 4 },
  bankButtonLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  bankButtonValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  bankButtonMeta: { fontSize: Typography.xs },
  consentRow: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  consentCopy: { flex: 1, gap: 2 },
  consentTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  consentBody: { fontSize: Typography.xs, lineHeight: 16 },
  stepActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stepActionFlex: { flex: 1 },
  primaryAction: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
  secondary: { minHeight: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  reviewGroupLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold, marginBottom: 2 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  reviewLabel: { fontSize: Typography.sm, flexShrink: 0 },
  reviewValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textAlign: 'right', flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  modalSubtitle: { fontSize: Typography.sm, marginTop: 2 },
  modalClose: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modalCloseText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  bankLoading: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  bankList: { maxHeight: 320 },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 18, borderWidth: 1, padding: Spacing.md, marginBottom: 10 },
  bankRowName: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  bankRowCode: { fontSize: Typography.xs },
});
