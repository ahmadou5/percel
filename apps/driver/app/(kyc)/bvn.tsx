import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, ChevronDown, Copy, Landmark, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useVerifyDriverBvn, useDriverProfile } from '@/hooks/useDriverProfile';
import { useBanks, useWallet } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { BankPickerModal, BankLogo, type BankItem } from '@/components/wallet/BankPickerModal';

type Step = 1 | 2 | 3;

export default function DriverBvnKycScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const modal = useAppModal();

  const profileQuery = useDriverProfile();
  const walletQuery = useWallet();
  const banksQuery = useBanks();
  const verifyBvn = useVerifyDriverBvn();

  const profile = profileQuery.data;
  const wallet = walletQuery.data;
  const banks = (banksQuery.data ?? []) as BankItem[];

  const [step, setStep] = useState<Step>(1);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bvn, setBvn] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);

  // Generated virtual account details
  const [generatedAccount, setGeneratedAccount] = useState<{ accountNumber: string; bankName: string; accountName: string } | null>(null);

  const selectedBank = banks.find((b) => b.code === bankCode);

  const handleStep1Next = () => {
    if (!firstName.trim() || !lastName.trim()) {
      modal.alert('Missing details', 'Please enter your first name and last name as shown on your bank account.', 'warning');
      return;
    }
    if (!dateOfBirth.trim()) {
      modal.alert('Date of birth required', 'Please enter your date of birth (YYYY-MM-DD).', 'warning');
      return;
    }
    setStep(2);
  };

  const handleVerify = async () => {
    if (bvn.trim().length !== 11) {
      modal.alert('Invalid BVN', 'Please enter a valid 11-digit Bank Verification Number.', 'warning');
      return;
    }

    try {
      const res = await verifyBvn.mutateAsync({
        bvn: bvn.trim(),
        accountNumber: accountNumber.trim(),
        bankCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (res.verified || res.virtualAccount) {
        if (res.virtualAccount) {
          setGeneratedAccount(res.virtualAccount);
        } else if (wallet?.nuban && wallet?.bankName) {
          setGeneratedAccount({
            accountNumber: wallet.nuban,
            bankName: wallet.bankName,
            accountName: profile?.fullName ?? `${firstName} ${lastName}`,
          });
        }
        setStep(3);
      } else {
        modal.alert('Verification Failed', res.message || 'BVN verification failed. Please check your BVN and name details.', 'error');
      }
    } catch (err) {
      modal.alert('Error', err instanceof Error ? err.message : 'BVN verification failed.', 'error');
    }
  };

  const copyNuban = async () => {
    const num = generatedAccount?.accountNumber || wallet?.nuban;
    if (num) {
      await Clipboard.setStringAsync(num);
      modal.alert('Copied!', `Account number ${num} copied to clipboard.`, 'info');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Identity KYC Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Step Indicator */}
        <View style={styles.stepIndicatorRow}>
          {[1, 2, 3].map((s) => {
            const active = step === s;
            const done = step > s;
            return (
              <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: done || active ? palette.primary : palette.border }} />
            );
          })}
        </View>

        {/* STEP 1: Personal Details */}
        {step === 1 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, { color: palette.text }]}>Step 1: Personal Information</Text>
              <Text style={[styles.stepSub, { color: palette.textSecondary }]}>Enter your legal name and date of birth as on your bank records.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>First Name *</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="e.g. Ahmadou"
                placeholderTextColor={palette.textSecondary}
                style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Last Name *</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="e.g. Bello"
                placeholderTextColor={palette.textSecondary}
                style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Date of Birth (YYYY-MM-DD) *</Text>
              <TextInput
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="1995-08-20"
                placeholderTextColor={palette.textSecondary}
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Residential Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 14 Ikeja Way, Lagos"
                placeholderTextColor={palette.textSecondary}
                style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
              />
            </View>

            <Pressable
              onPress={handleStep1Next}
              style={({ pressed }) => [styles.actionButton, { backgroundColor: palette.primary, opacity: pressed ? 0.88 : 1 }]}
            >
              <Text style={styles.actionText}>Continue to BVN Check</Text>
            </Pressable>
          </View>
        ) : null}

        {/* STEP 2: BVN & Bank Details */}
        {step === 2 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, { color: palette.text }]}>Step 2: BVN & Bank Verification</Text>
              <Text style={[styles.stepSub, { color: palette.textSecondary }]}>Enter your 11-digit BVN and linked bank account for identity matching.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Bank Verification Number (BVN) *</Text>
              <TextInput
                value={bvn}
                onChangeText={setBvn}
                placeholder="11-digit BVN"
                placeholderTextColor={palette.textSecondary}
                keyboardType="number-pad"
                maxLength={11}
                style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
              />
              <Text style={[styles.helper, { color: palette.textSecondary }]}>Dial *565*0# on your registered SIM to check your BVN.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Select Your Settlement Bank</Text>
              <Pressable
                onPress={() => setBankPickerOpen(true)}
                style={[styles.input, styles.bankPickerBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                {selectedBank ? (
                  <View style={styles.bankSelectedRow}>
                    <BankLogo name={selectedBank.name} bankCode={selectedBank.code} size={22} />
                    <Text style={[styles.bankSelectedText, { color: palette.text }]}>{selectedBank.name}</Text>
                  </View>
                ) : (
                  <Text style={{ color: palette.textSecondary, fontSize: Typography.sm }}>Choose your bank...</Text>
                )}
                <ChevronDown size={18} color={palette.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Bank Account Number</Text>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="10-digit NUBAN account number"
                placeholderTextColor={palette.textSecondary}
                keyboardType="number-pad"
                maxLength={10}
                style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
              />
            </View>

            <Pressable
              onPress={handleVerify}
              disabled={verifyBvn.isPending}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: palette.primary, opacity: verifyBvn.isPending ? 0.6 : pressed ? 0.88 : 1 },
              ]}
            >
              {verifyBvn.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionText}>Verify & Create Driver Virtual Account</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* STEP 3: Verification Completed & Virtual NUBAN Account */}
        {step === 3 ? (
          <View style={styles.stepContainer}>
            <View style={[styles.successBanner, { backgroundColor: 'rgba(48, 209, 88, 0.12)', borderColor: '#30D158' }]}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={36} color="#30D158" />
              </View>
              <Text style={[styles.successTitle, { color: palette.text }]}>Identity Verified & Account Active!</Text>
              <Text style={[styles.successSub, { color: palette.textSecondary }]}>
                Your Driver BVN verification is complete. Below is your dedicated driver virtual account for deposits & wallet top-ups.
              </Text>
            </View>

            {/* Virtual Dedicated Bank Account Card */}
            <View style={[styles.virtualCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.virtualHeader}>
                <View style={[styles.virtualBadge, { backgroundColor: 'rgba(10,132,255,0.1)' }]}>
                  <Landmark size={18} color={palette.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.virtualTag, { color: palette.textSecondary }]}>DRIVER DEDICATED NUBAN</Text>
                  <Text style={[styles.virtualBankName, { color: palette.text }]}>
                    {generatedAccount?.bankName || wallet?.bankName || 'Wema Bank / Monnify'}
                  </Text>
                </View>
              </View>

              <View style={[styles.virtualNumRow, { backgroundColor: palette.bg }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.virtualLabel, { color: palette.textSecondary }]}>Account Number</Text>
                  <Text style={[styles.virtualNum, { color: palette.text }]}>
                    {generatedAccount?.accountNumber || wallet?.nuban || 'Pending Generation...'}
                  </Text>
                </View>
                <Pressable onPress={copyNuban} style={[styles.copyBtn, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <Copy size={16} color={palette.primary} />
                  <Text style={[styles.copyText, { color: palette.primary }]}>Copy</Text>
                </Pressable>
              </View>

              <View style={styles.accountHolderRow}>
                <Text style={[styles.virtualLabel, { color: palette.textSecondary }]}>Account Name: </Text>
                <Text style={[styles.holderName, { color: palette.text }]}>
                  {generatedAccount?.accountName || profile?.fullName || `${firstName} ${lastName}`}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.replace('/(tabs)/profile')}
              style={({ pressed }) => [styles.actionButton, { backgroundColor: palette.primary, opacity: pressed ? 0.88 : 1 }]}
            >
              <Text style={styles.actionText}>Go to Driver Profile</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <BankPickerModal
        visible={bankPickerOpen}
        banks={banks}
        onClose={() => setBankPickerOpen(false)}
        onSelect={(b: BankItem) => setBankCode(b.code)}
      />
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  stepContainer: { gap: Spacing.md },
  stepHeader: { gap: 4 },
  stepTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  stepSub: { fontSize: Typography.xs },
  inputGroup: { gap: 6 },
  label: { fontSize: Typography.xs, fontFamily: Typography.family.semibold },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: Typography.sm,
  },
  helper: { fontSize: 11 },
  bankPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bankSelectedText: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },
  actionButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  actionText: { color: '#FFF', fontSize: Typography.md, fontFamily: Typography.family.bold },
  successBanner: {
    padding: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  successIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(48,209,88,0.18)', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
  successSub: { fontSize: Typography.xs, textAlign: 'center', lineHeight: 18 },
  virtualCard: {
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  virtualHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  virtualBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  virtualTag: { fontSize: 10, fontFamily: Typography.family.bold, letterSpacing: 0.8 },
  virtualBankName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  virtualNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 14,
  },
  virtualLabel: { fontSize: Typography.xs },
  virtualNum: { fontSize: Typography.lg, fontFamily: Typography.family.bold, letterSpacing: 1.5, marginTop: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  copyText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  accountHolderRow: { flexDirection: 'row', alignItems: 'center' },
  holderName: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
});
