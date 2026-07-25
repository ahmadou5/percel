import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import {
  AlertCircle,
  ArrowRight,
  BadgeInfo,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Copy,
  CreditCard,
  Landmark,
  RefreshCw,
  Send,
  ShieldCheck,
  Zap,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Input } from '@/components/ui/Input';
import { StateCard } from '@/components/ui/StateCard';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { FlowProgressDots, useSlideStepTransition, useStepBackHandler } from '@/components/wallet/WalletFlowProgress';
import { BankPickerModal, BankLogo } from '@/components/wallet/BankPickerModal';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useProfile, useUpdateProfile, useVerifyBvn, useVerifyNin } from '@/hooks/useProfile';
import { useBanks, useWallet } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { DobDatePickerModal } from '@/components/ui/DobDatePickerModal';

function isOfAge(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const palette = useAppPalette();
  const profileQuery = useProfile();
  const walletQuery = useWallet();
  const updateProfile = useUpdateProfile();
  const verifyBvn = useVerifyBvn();
  const verifyNin = useVerifyNin();
  const banksQuery = useBanks();

  const profile = profileQuery.data;
  const wallet = walletQuery.data;
  const banks = (banksQuery.data ?? []) as BankItem[];

  const modal = useAppModal();
  const [step, setStep] = useState<KycStep>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bvn, setBvn] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nin, setNin] = useState('');
  const [ninSubmitting, setNinSubmitting] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);

  const { opacity, translateX } = useSlideStepTransition(step);
  const back = useSafeBack('/profile');
  useStepBackHandler(step, () => {
    if (step > 1) {
      setStep((current) => (current - 1) as typeof step);
    }
  });

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const kycComplete = Boolean(
    profile?.kycComplete || profile?.bvnVerified || profile?.ninVerified || profile?.status === 'ACTIVE',
  );
  const verificationPending =
    (profile?.status === 'PENDING_VERIFICATION' || submitted) && !kycComplete;
  const verificationRejected = profile?.status === 'SUSPENDED';

  // Polling when verification is pending
  useEffect(() => {
    if (!verificationPending) return;

    const interval = setInterval(() => {
      void profileQuery.refetch();
      void walletQuery.refetch();
    }, 4000);

    return () => clearInterval(interval);
  }, [verificationPending, profileQuery, walletQuery]);

  // Fix: Reset submitted state when status resolves
  useEffect(() => {
    if (profile?.status === 'SUSPENDED' || profile?.status === 'ACTIVE') {
      setSubmitted(false);
    }
  }, [profile?.status]);

  // Verified card animation
  useEffect(() => {
    if (kycComplete) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [kycComplete, scaleAnim]);

  // Pending pulse animation
  useEffect(() => {
    if (verificationPending) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      );

      const rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      pulseLoop.start();
      rotateLoop.start();

      return () => {
        pulseLoop.stop();
        rotateLoop.stop();
      };
    }
  }, [verificationPending, pulseAnim, rotateAnim]);

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

  const personalInfoComplete =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    address.trim().length >= 8 &&
    isOfAge(dateOfBirth);
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(text);
      modal.alert(`${label} Copied!`, `${text} has been copied to your clipboard.`, 'success');
    } catch {
      modal.alert(label, text, 'info');
    }
  };

  const isInitialLoading = profileQuery.isLoading || walletQuery.isLoading;

  if (isInitialLoading) {
    return <KycSkeleton />;
  }

  // 1. VERIFIED STATE VIEW
  if (kycComplete) {
    const nuban = wallet?.nuban;
    const bankName = wallet?.bankName ?? 'Percel Dedicated Account';

    const isTier3 = profile?.bvnVerified && profile?.ninVerified;
    const isTier2 = profile?.bvnVerified || profile?.ninVerified;
    const currentTier = isTier3 ? 3 : (isTier2 ? 2 : 1);
    const tierLabel = `Tier ${currentTier}`;
    const tierLimit = isTier3 ? '₦5,000,000' : (isTier2 ? '₦200,000' : '₦50,000');
    const tierColor = isTier3 ? palette.success : (isTier2 ? palette.primary : palette.textSecondary);

    const handleNinSubmit = async () => {
      if (!/^\d{11}$/.test(nin.trim())) {
        modal.alert('Invalid NIN', 'Please enter your valid 11-digit National Identification Number.', 'warning');
        return;
      }
      setNinSubmitting(true);
      try {
        await verifyNin.mutateAsync({ nin: nin.trim() });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
          queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        ]);
        setUpgradeModalVisible(false);
        modal.alert('NIN Verified!', 'Your limit has been upgraded to ₦5,000,000 daily. Welcome to Tier 3!', 'success');
        setNin('');
      } catch (error) {
        modal.alert('NIN Verification Failed', error instanceof Error ? error.message : 'Please check your NIN and try again.', 'error');
      } finally {
        setNinSubmitting(false);
      }
    };

    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: palette.bg }]}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
            onPress={() => back()}
          >
            <ChevronLeft size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>KYC Status</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Verified badge card */}
        <Animated.View style={[styles.verifiedCard, { backgroundColor: palette.card, borderColor: palette.border, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.verifiedBadgeGlow, { backgroundColor: 'rgba(48,209,88,0.14)', borderColor: palette.success }]}>
            <ShieldCheck size={48} color={palette.success} />
          </View>
          <Text style={[styles.verifiedTitle, { color: palette.text }]}>Identity Verified</Text>
          <Text style={[styles.verifiedSub, { color: palette.textSecondary }]}>
            Your dedicated bank account is active for transfers, deposits, and bill payments.
          </Text>

          {/* Tier badge */}
          <View style={[styles.tierBadgeRow, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierBadgeLabel, { color: palette.textSecondary }]}>Current tier</Text>
              <Text style={[styles.tierBadgeValue, { color: palette.text }]}>{tierLabel} — {tierLimit} daily limit</Text>
            </View>
            <View style={[styles.tierBadgePill, { backgroundColor: tierColor + '22', borderColor: tierColor }]}>
              <Text style={[styles.tierBadgePillText, { color: tierColor }]}>{tierLabel}</Text>
            </View>
          </View>

          {/* Action buttons */}
          {!isTier3 && (
            <Pressable
              onPress={() => setUpgradeModalVisible(true)}
              style={({ pressed }) => [
                styles.primaryAction,
                { width: '100%', backgroundColor: palette.primary, marginBottom: 2 },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Zap size={18} color="#FFF" />
              <Text style={styles.primaryActionText}>Unlock Tier 3 (₦5,000,000/day)</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => back()}
            style={({ pressed }) => [
              styles.secondaryAction,
              { width: '100%', backgroundColor: palette.bg, borderColor: palette.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.secondaryActionText, { color: palette.text }]}>Back to Profile</Text>
          </Pressable>
        </Animated.View>

        {/* Bottom Sheet Modal for NIN Upgrade */}
        {!isTier3 && (
          <Modal
            visible={upgradeModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setUpgradeModalVisible(false)}
          >
            <View style={styles.bottomSheetBackdrop}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setUpgradeModalVisible(false)} />
              <View style={[styles.bottomSheetContainer, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={styles.dragHandle} />

                <View style={styles.sheetHeaderRow}>
                  <View style={[styles.upgradeIconWrap, { backgroundColor: 'rgba(10,132,255,0.14)' }]}>
                    <Zap size={22} color={palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.upgradeTitle, { color: palette.text }]}>Unlock Tier 3 — ₦5,000,000</Text>
                    <Text style={[styles.upgradeSub, { color: palette.textSecondary }]}>
                      Add your NIN to double-verify your identity and unlock maximum daily transfer limits.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setUpgradeModalVisible(false)}
                    style={[styles.closeIconButton, { backgroundColor: palette.bg, borderColor: palette.border }]}
                  >
                    <X size={16} color={palette.text} />
                  </Pressable>
                </View>

                <Input
                  label="National ID Number (NIN)"
                  value={nin}
                  onChangeText={setNin}
                  placeholder="11-digit NIN"
                  keyboardType="number-pad"
                  maxLength={11}
                  helperText="Your NIN is 11 digits found on your National ID card or slip."
                />

                <Pressable
                  onPress={() => void handleNinSubmit()}
                  disabled={ninSubmitting || nin.trim().length !== 11}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    {
                      width: '100%',
                      backgroundColor: nin.trim().length === 11 ? palette.primary : palette.border,
                      marginTop: 4,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.primaryActionText}>{ninSubmitting ? 'Verifying…' : 'Verify NIN & Upgrade'}</Text>
                </Pressable>

                <Pressable
                  onPress={() => setUpgradeModalVisible(false)}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    { width: '100%', backgroundColor: palette.bg, borderColor: palette.border, marginTop: 4 },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.secondaryActionText, { color: palette.text }]}>Back</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}

        <AppModal config={modal.config} onClose={modal.hide} />
      </ScrollView>
    );
  }

  // 2. PENDING VERIFICATION STATE VIEW
  if (verificationPending) {
    const spin = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: palette.bg }]}
        contentContainerStyle={{ flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
            onPress={() => back()}
          >
            <ChevronLeft size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Verification Pending</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={[styles.verifiedCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Animated.View
              style={[
                styles.pendingBadgeWrap,
                { backgroundColor: 'rgba(255,159,10,0.12)', borderColor: '#FF9F0A', transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Animated.View >
                <BadgeInfo size={44} color="#FF9F0A" />
              </Animated.View>
            </Animated.View>

            <Text style={[styles.verifiedTitle, { color: palette.text }]}>Verification in Progress</Text>
            <Text style={[styles.verifiedSub, { color: palette.textSecondary }]}>
              Our identity partner is validating your BVN and bank account details. Your dedicated NUBAN will be assigned automatically.
            </Text>

            <Pressable
              onPress={() => back()}
              style={({ pressed }) => [styles.secondaryAction, { width: '100%', backgroundColor: palette.bg, borderColor: palette.border }, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>Back to Profile</Text>
            </Pressable>
          </View>
        </View>
        <AppModal config={modal.config} onClose={modal.hide} />
      </ScrollView>
    );
  }

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
      modal.alert(
        'Complete all required fields',
        'Please enter your full name, residential address, date of birth, BVN, account number, bank, and consent before continuing.',
        'warning',
      );
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['banks'] }),
      ]);

      if (result.kycComplete || result.status === 'ACTIVE') {
        modal.alert('Verification Approved!', 'Your identity is verified and your dedicated account is ready.', 'success');
      }
    } catch (error) {
      modal.alert('Verification Failed', error instanceof Error ? error.message : 'Please check your details and try again.', 'error');
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable
          style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          onPress={headerBack}
        >
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Identity Verification</Text>
        <View style={styles.headerSpacer} />
      </View>

      {verificationRejected && (
        <View style={[styles.errorCard, { backgroundColor: 'rgba(255,69,58,0.12)', borderColor: palette.error }]}>
          <AlertCircle size={20} color={palette.error} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.errorTitle, { color: palette.error }]}>Previous verification issue</Text>
            <Text style={[styles.errorSub, { color: palette.text }]}>
              Please double check your BVN and bank account details below and resubmit.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrowLabel, { color: palette.primary }]}>Customer KYC</Text>
        <Text style={[styles.pageTitle, { color: palette.text }]}>
          Verify your BVN & bank to unlock dedicated account numbers.
        </Text>
      </View>

      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Identity check</Text>
            <Text style={styles.heroValue}>{`Step ${step} of 3`}</Text>
          </View>
          <View style={styles.heroIcon}>
            <ShieldCheck size={22} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroBody}>
          Verification creates a dedicated NUBAN account in your name, allowing instantaneous deposits and high transfer limits.
        </Text>
        <FlowProgressDots
          currentStep={step}
          totalSteps={3}
          onStepPress={(targetStep) => {
            if (targetStep < step) setStep(targetStep as typeof step);
          }}
        />
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
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                  Add the legal name and address associated with your bank account.
                </Text>
              </View>
            </View>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Input label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
              </View>
              <View style={styles.nameField}>
                <Input label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
              </View>
            </View>

            <Input
              label="Residential address"
              value={address}
              onChangeText={setAddress}
              placeholder="Full residential street address"
              helperText="Must match official residential address."
            />

            <Pressable onPress={() => setDatePickerOpen(true)}>
              <View pointerEvents="none">
                <Input
                  label="Date of birth"
                  value={dateOfBirth}
                  placeholder="Select date of birth"
                  editable={false}
                  helperText="Date of birth (Must be at least 18 years old)."
                />
              </View>
            </Pressable>

            <Pressable
              onPress={handleNext}
              disabled={!personalInfoComplete}
              style={({ pressed }) => [
                styles.primaryAction,
                { backgroundColor: personalInfoComplete ? palette.primary : palette.border },
                pressed && personalInfoComplete ? { opacity: 0.9 } : null,
              ]}
            >
              <Text style={styles.primaryActionText}>Continue to Bank & BVN</Text>
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
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Bank & BVN details</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                  Enter your BVN, select your bank, and enter your NUBAN account number.
                </Text>
              </View>
            </View>

            <View style={[styles.summaryMini, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.summaryMiniLabel, { color: palette.textSecondary }]}>Verified name</Text>
              <Text style={[styles.summaryMiniValue, { color: palette.text }]}>
                {`${firstName.trim()} ${lastName.trim()}`.trim() || 'Full name pending'}
              </Text>
              <Text style={[styles.summaryMiniMeta, { color: palette.textSecondary }]}>{dateOfBirth || 'DOB pending'}</Text>
            </View>

            <Input
              label="BVN (Bank Verification Number)"
              value={bvn}
              onChangeText={setBvn}
              placeholder="11 digit BVN"
              keyboardType="number-pad"
              helperText="Used strictly for identity validation via NIBSS."
            />

            <Pressable
              onPress={() => setBankPickerOpen(true)}
              style={[styles.bankButton, { backgroundColor: palette.bg, borderColor: palette.border }]}
            >
              <BankLogo name={selectedBank?.name ?? 'Bank'} slug={selectedBank?.slug} size={40} />
              <View style={styles.bankButtonCopy}>
                <Text style={[styles.bankButtonLabel, { color: palette.textSecondary }]}>Bank</Text>
                <Text style={[styles.bankButtonValue, { color: palette.text }]}>
                  {selectedBank?.name ?? 'Choose your bank'}
                </Text>
              </View>
              <ChevronDown size={18} color={palette.textSecondary} />
            </Pressable>

            <Input
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="10 digit NUBAN account number"
              keyboardType="number-pad"
              helperText="10-digit NUBAN linked to your BVN."
            />

            <Pressable
              onPress={() => setConsent((value) => !value)}
              style={[
                styles.consentRow,
                {
                  borderColor: consent ? palette.primary : palette.border,
                  backgroundColor: consent ? 'rgba(10,132,255,0.08)' : palette.bg,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: consent ? palette.primary : palette.border,
                    backgroundColor: consent ? palette.primary : 'transparent',
                  },
                ]}
              >
                {consent ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <View style={styles.consentCopy}>
                <Text style={[styles.consentTitle, { color: palette.text }]}>I consent to identity verification</Text>
                <Text style={[styles.consentBody, { color: palette.textSecondary }]}>
                  I authorize Percel and its partners to verify my details and issue a dedicated NUBAN.
                </Text>
              </View>
            </Pressable>

            <View style={styles.stepActions}>
              <Pressable
                onPress={headerBack}
                style={[styles.secondary, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <Text style={[styles.secondaryText, { color: palette.text }]}>Back</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                disabled={!identityComplete}
                style={({ pressed }) => [
                  styles.primaryAction,
                  styles.stepActionFlex,
                  { backgroundColor: identityComplete ? palette.primary : palette.border },
                  pressed && identityComplete ? { opacity: 0.9 } : null,
                ]}
              >
                <Text style={styles.primaryActionText}>Review Details</Text>
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
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Confirm & Submit</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
                  Review your information carefully before submitting.
                </Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewGroupLabel, { color: palette.textSecondary }]}>Personal info</Text>
              <Row label="Full Name" value={`${firstName.trim()} ${lastName.trim()}`.trim()} palette={palette} />
              <Row label="Address" value={address.trim()} palette={palette} />
              <Row label="Date of Birth" value={dateOfBirth.trim()} palette={palette} />
            </View>

            <View style={[styles.reviewCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Text style={[styles.reviewGroupLabel, { color: palette.textSecondary }]}>Identity & Bank</Text>
              <Row label="BVN" value={bvn.trim()} palette={palette} />
              <Row label="Bank" value={selectedBank?.name ?? '—'} palette={palette} />
              <Row label="Account Number" value={accountNumber.trim()} palette={palette} />
              <Row label="Consent" value={consent ? 'Authorized' : 'Missing'} palette={palette} />
            </View>

            <View style={styles.stepActions}>
              <Pressable
                onPress={headerBack}
                style={[styles.secondary, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <Text style={[styles.secondaryText, { color: palette.text }]}>Back</Text>
              </Pressable>
              <Pressable
                disabled={!canSubmit}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.primaryAction,
                  styles.stepActionFlex,
                  { backgroundColor: canSubmit ? palette.primary : palette.border },
                  pressed && canSubmit ? { opacity: 0.9 } : null,
                ]}
              >
                <Text style={styles.primaryActionText}>
                  {updateProfile.isPending || verifyBvn.isPending ? 'Verifying Identity…' : 'Submit Verification'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <BankPickerModal
        visible={bankPickerOpen}
        onClose={() => setBankPickerOpen(false)}
        selectedBankCode={bankCode}
        banks={banks}
        banksLoading={banksQuery.isLoading}
        onSelect={(bank) => setBankCode(bank.code)}
      />

      <DobDatePickerModal
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelect={setDateOfBirth}
        initialValue={dateOfBirth}
      />

      <AppModal config={modal.config} onClose={modal.hide} />
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

function KycSkeleton() {
  const palette = useAppPalette();

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl }]}>
      <SkeletonGroup style={{ gap: Spacing.lg }}>
        {/* Header Skeleton */}
        <View style={styles.headerRow}>
          <View style={[styles.backButton, { backgroundColor: palette.border, borderColor: 'transparent' }]} />
          <View style={{ width: 150, height: 24, borderRadius: 12, backgroundColor: palette.border }} />
          <View style={styles.headerSpacer} />
        </View>

        {/* Copy Skeleton */}
        <View style={styles.headerCopy}>
          <View style={{ width: 100, height: 16, borderRadius: 8, backgroundColor: palette.border, marginBottom: 4 }} />
          <View style={{ width: '90%', height: 32, borderRadius: 16, backgroundColor: palette.border }} />
          <View style={{ width: '70%', height: 32, borderRadius: 16, backgroundColor: palette.border }} />
        </View>

        {/* Hero Skeleton */}
        <View style={[styles.hero, { backgroundColor: palette.border, height: 160 }]} />

        {/* Card Skeleton */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepPill, { backgroundColor: palette.border, borderColor: 'transparent' }]} />
            <View style={styles.sectionCopy}>
              <View style={{ width: 120, height: 20, borderRadius: 10, backgroundColor: palette.border, marginBottom: 6 }} />
              <View style={{ width: '100%', height: 14, borderRadius: 7, backgroundColor: palette.border, marginBottom: 4 }} />
              <View style={{ width: '80%', height: 14, borderRadius: 7, backgroundColor: palette.border }} />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: palette.border }} />
            <View style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: palette.border }} />
          </View>
          <View style={{ height: 56, borderRadius: 16, backgroundColor: palette.border }} />
          <View style={{ height: 56, borderRadius: 16, backgroundColor: palette.border }} />
          
          <View style={{ height: 56, borderRadius: 16, backgroundColor: palette.border, marginTop: 10 }} />
        </View>
      </SkeletonGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  centerContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.huge, gap: Spacing.lg, alignItems: 'center' },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  headerCopy: { gap: 8 },
  eyebrowLabel: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: Typography.xs, fontFamily: Typography.family.bold },
  pageTitle: { fontSize: 26, lineHeight: 32, fontFamily: Typography.family.bold },
  hero: { borderRadius: 24, padding: Spacing.lg, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.68)', fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: Typography.lg, fontFamily: Typography.family.bold, marginTop: 2 },
  heroIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  heroBody: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sm, lineHeight: 20 },
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
  bankButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, minHeight: 64, gap: 10 },
  bankButtonCopy: { flex: 1, gap: 4 },
  bankButtonLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold },
  bankButtonValue: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  consentRow: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  consentCopy: { flex: 1, gap: 2 },
  consentTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  consentBody: { fontSize: Typography.xs, lineHeight: 16 },
  stepActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stepActionFlex: { flex: 1 },
  primaryAction: { minHeight: 56, borderRadius: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primaryActionText: { color: '#fff', fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
  secondaryAction: { minHeight: 54, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondaryActionText: { fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
  secondary: { minHeight: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 4 },
  reviewGroupLabel: { fontSize: Typography.xs, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: Typography.family.bold, marginBottom: 2 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  reviewLabel: { fontSize: Typography.sm, flexShrink: 0 },
  reviewValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold, textAlign: 'right', flex: 1 },

  // Verified & Pending specific UI
  verifiedCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.xl, gap: Spacing.lg, alignItems: 'center', width: '100%' },
  verifiedBadgeGlow: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pendingBadgeWrap: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  verifiedTitle: { fontSize: 24, fontFamily: Typography.family.bold, textAlign: 'center', letterSpacing: -0.5 },
  verifiedSub: { fontSize: Typography.sm, lineHeight: 22, textAlign: 'center', fontFamily: Typography.family.regular },
  nubanCard: { width: '100%', borderRadius: 20, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  nubanCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nubanHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nubanProviderLabel: { color: '#FFFFFF', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  activePill: { backgroundColor: 'rgba(48,209,88,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  activePillText: { color: '#30D158', fontSize: 10, fontFamily: Typography.family.bold, letterSpacing: 0.8 },
  nubanBody: { gap: 4 },
  nubanLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontFamily: Typography.family.bold, letterSpacing: 1 },
  nubanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nubanNumber: { color: '#FFFFFF', fontSize: 32, fontFamily: Typography.family.bold, letterSpacing: 2 },
  copyBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)' },
  accountNameLabel: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.xs, fontFamily: Typography.family.medium, marginTop: 4 },
  nubanPendingText: { color: '#FFFFFF', fontSize: Typography.sm, fontFamily: Typography.family.regular },
  refetchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  refetchText: { color: '#FFFFFF', fontSize: Typography.xs, fontFamily: Typography.family.bold },
  featuresCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: Typography.sm, fontFamily: Typography.family.medium },
  actionGroup: { width: '100%', gap: 10 },
  infoBanner: { width: '100%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, gap: 8 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0A84FF' },
  liveText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  infoSubtext: { fontSize: Typography.xs, lineHeight: 17 },
  errorCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  errorTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  errorSub: { fontSize: Typography.xs, lineHeight: 16, marginTop: 2 },

  // Tier badge styles
  tierBadgeRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12, borderRadius: 16, borderWidth: 1, padding: Spacing.md },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierBadgeLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium, textTransform: 'uppercase', letterSpacing: 0.6 },
  tierBadgeValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold, marginTop: 2 },
  tierBadgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  tierBadgePillText: { fontSize: Typography.xs, fontFamily: Typography.family.bold, letterSpacing: 0.4 },

  // NIN upgrade card styles
  upgradeCard: { borderRadius: 24, borderWidth: 1.5, padding: Spacing.lg, gap: 14 },
  upgradeCardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  upgradeIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  upgradeTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  upgradeSub: { fontSize: Typography.xs, lineHeight: 17, marginTop: 3 },

  // Bottom sheet modal styles
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
