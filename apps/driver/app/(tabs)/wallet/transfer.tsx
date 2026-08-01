import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronDown,
  Landmark,
  Smartphone,
  User,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BankPickerModal, BankLogo, type BankItem } from '@/components/wallet/BankPickerModal';
import { PaymentPinModal } from '@/components/wallet/PaymentPinModal';
import { TransactionResultModal } from '@/components/TransactionResultModal';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import {
  useAccountLookup,
  useBankTransfer,
  useBanks,
  useResolveTransferRecipient,
  useTransfer,
  useWallet,
} from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';
import { formatNaira } from '@/lib/wallet';

type TransferMode = 'BANK' | 'TAG';

export default function DriverTransferScreen() {
  const modal = useAppModal();
  const router = useRouter();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const walletQuery = useWallet();

  const [mode, setMode] = useState<TransferMode>('BANK');
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [resultModal, setResultModal] = useState<{
    visible: boolean;
    type: 'success' | 'failed';
    title: string;
    message: string;
    amount?: string;
    reference?: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Bank transfer state
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [bankNote, setBankNote] = useState('');

  // Tag/Phone transfer state
  const [recipientPhone, setRecipientPhone] = useState('');
  const [tagAmount, setTagAmount] = useState('');
  const [tagNote, setTagNote] = useState('');
  const [resolvedRecipient, setResolvedRecipient] = useState<{ fullName: string; phone: string } | null>(null);

  // Hooks
  const banksQuery = useBanks();
  const accountLookup = useAccountLookup(accountNumber, selectedBank?.code ?? '');
  const bankTransferMutation = useBankTransfer();
  const p2pTransferMutation = useTransfer();
  const resolveRecipientMutation = useResolveTransferRecipient();

  const handleResolvePhone = async () => {
    if (!recipientPhone.trim()) return;
    try {
      const res = await resolveRecipientMutation.mutateAsync({ phone: recipientPhone.trim() });
      if (res.data) {
        setResolvedRecipient(res.data);
      }
    } catch (err: any) {
      modal.alert('Recipient Not Found', err?.message || 'No user registered with this phone number.', 'error');
      setResolvedRecipient(null);
    }
  };

  const handleInitiate = () => {
    if (mode === 'BANK') {
      if (!selectedBank) {
        modal.alert('Error', 'Please select a bank', 'warning');
        return;
      }
      if (!accountNumber || accountNumber.length < 10) {
        modal.alert('Error', 'Please enter a valid 10-digit account number', 'warning');
        return;
      }
      if (!accountLookup.data?.accountName) {
        modal.alert('Error', 'Bank account could not be verified. Check account number.', 'warning');
        return;
      }
      const amt = Number(bankAmount);
      if (isNaN(amt) || amt <= 0) {
        modal.alert('Error', 'Please enter a valid transfer amount', 'warning');
        return;
      }
      if (amt > (walletQuery.data?.balance ?? 0)) {
        modal.alert('Insufficient Balance', 'Your wallet balance is lower than this transfer amount.', 'warning');
        return;
      }
    } else {
      if (!resolvedRecipient) {
        modal.alert('Error', 'Please look up recipient phone number first', 'warning');
        return;
      }
      const amt = Number(tagAmount);
      if (isNaN(amt) || amt <= 0) {
        modal.alert('Error', 'Please enter a valid transfer amount', 'warning');
        return;
      }
      if (amt > (walletQuery.data?.balance ?? 0)) {
        modal.alert('Insufficient Balance', 'Your wallet balance is lower than this transfer amount.', 'warning');
        return;
      }
    }

    setPinModalVisible(true);
  };

  const handleConfirmPin = async (pin: string) => {
    try {
      if (mode === 'BANK') {
        const res = await bankTransferMutation.mutateAsync({
          bankCode: selectedBank!.code,
          accountNumber: accountNumber.trim(),
          amount: Number(bankAmount),
          description: bankNote || 'Bank Transfer from Driver Wallet',
          pin,
        });
        setPinModalVisible(false);
        setResultModal({
          visible: true,
          type: 'success',
          title: 'Transfer Successful',
          message: `Transferred successfully to ${accountLookup.data?.accountName} (${selectedBank?.name})`,
          amount: formatNaira(Number(bankAmount)),
          reference: res.data?.reference,
        });
      } else {
        const res = await p2pTransferMutation.mutateAsync({
          toPhone: recipientPhone.trim(),
          amount: Number(tagAmount),
          description: tagNote || 'P2P Transfer from Driver Wallet',
          pin,
        });
        setPinModalVisible(false);
        setResultModal({
          visible: true,
          type: 'success',
          title: 'Transfer Successful',
          message: `Transferred successfully to ${resolvedRecipient?.fullName}`,
          amount: formatNaira(Number(tagAmount)),
          reference: res.data?.reference,
        });
      }
    } catch (err: any) {
      setPinModalVisible(false);
      setResultModal({
        visible: true,
        type: 'failed',
        title: 'Transfer Failed',
        message: err?.message || 'Could not complete transfer. Please verify your PIN and try again.',
      });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Navigation */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Transfer Money</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Balance Bar */}
        <View style={[styles.balanceBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.balanceLabel, { color: palette.textSecondary }]}>Wallet Balance</Text>
          <Text style={[styles.balanceVal, { color: palette.primary }]}>
            {formatNaira(walletQuery.data?.balance ?? 0)}
          </Text>
        </View>

        {/* Mode Selector */}
        <View style={[styles.tabSegment, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Pressable
            style={[
              styles.segmentBtn,
              mode === 'BANK' && { backgroundColor: palette.primary },
            ]}
            onPress={() => setMode('BANK')}
          >
            <Landmark size={16} color={mode === 'BANK' ? '#FFF' : palette.textSecondary} />
            <Text style={[styles.segmentText, { color: mode === 'BANK' ? '#FFF' : palette.textSecondary }]}>
              To Bank Account
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentBtn,
              mode === 'TAG' && { backgroundColor: palette.primary },
            ]}
            onPress={() => setMode('TAG')}
          >
            <Smartphone size={16} color={mode === 'TAG' ? '#FFF' : palette.textSecondary} />
            <Text style={[styles.segmentText, { color: mode === 'TAG' ? '#FFF' : palette.textSecondary }]}>
              Inter-App Transfer
            </Text>
          </Pressable>
        </View>

        {mode === 'BANK' ? (
          /* BANK TRANSFER FORM */
          <View style={styles.formGroup}>
            {/* Select Bank */}
            <Text style={[styles.label, { color: palette.text }]}>Select Bank</Text>
            <Pressable
              style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}
              onPress={() => setBankModalVisible(true)}
            >
              {selectedBank ? (
                <View style={styles.bankSelectedRow}>
                  <BankLogo name={selectedBank.name} slug={selectedBank.slug} bankCode={selectedBank.code} size={28} />
                  <Text style={[styles.inputText, { color: palette.text }]}>{selectedBank.name}</Text>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: palette.textSecondary }]}>Choose recipient bank…</Text>
              )}
              <ChevronDown size={18} color={palette.textSecondary} />
            </Pressable>

            {/* Account Number */}
            <Text style={[styles.label, { color: palette.text }]}>Account Number</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="10-digit NUBAN number"
                placeholderTextColor={palette.textSecondary}
                keyboardType="number-pad"
                maxLength={10}
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
              {accountLookup.isLoading ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : null}
            </View>

            {/* Account Name Lookup Result */}
            {accountLookup.data?.accountName ? (
              <View style={[styles.lookupSuccess, { backgroundColor: '#30D15815', borderColor: '#30D15840' }]}>
                <Text style={styles.lookupNameText}>{accountLookup.data.accountName}</Text>
              </View>
            ) : accountLookup.isError ? (
              <Text style={styles.errorText}>Invalid account number or bank combination</Text>
            ) : null}

            {/* Amount */}
            <Text style={[styles.label, { color: palette.text }]}>Amount (₦)</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.currencyPrefix, { color: palette.primary }]}>₦</Text>
              <TextInput
                style={[styles.input, { color: palette.text, fontSize: 18, fontWeight: 'bold' }]}
                placeholder="0.00"
                placeholderTextColor={palette.textSecondary}
                keyboardType="numeric"
                value={bankAmount}
                onChangeText={setBankAmount}
              />
            </View>

            {/* Note */}
            <Text style={[styles.label, { color: palette.text }]}>Description (Optional)</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="e.g. Courier withdrawal"
                placeholderTextColor={palette.textSecondary}
                value={bankNote}
                onChangeText={setBankNote}
              />
            </View>
          </View>
        ) : (
          /* P2P / PHONE TRANSFER FORM */
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: palette.text }]}>Recipient Phone Number</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="08012345678"
                placeholderTextColor={palette.textSecondary}
                keyboardType="phone-pad"
                value={recipientPhone}
                onChangeText={(val) => {
                  setRecipientPhone(val);
                  setResolvedRecipient(null);
                }}
              />
              <Pressable
                style={[styles.verifyPhoneBtn, { backgroundColor: palette.primary }]}
                onPress={handleResolvePhone}
              >
                {resolveRecipientMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.verifyPhoneBtnText}>Verify</Text>
                )}
              </Pressable>
            </View>

            {/* Resolved Recipient Result */}
            {resolvedRecipient ? (
              <View style={[styles.lookupSuccess, { backgroundColor: '#30D15815', borderColor: '#30D15840' }]}>
                <User size={16} color="#30D158" />
                <Text style={styles.lookupNameText}>{resolvedRecipient.fullName}</Text>
              </View>
            ) : null}

            {/* Amount */}
            <Text style={[styles.label, { color: palette.text }]}>Amount (₦)</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.currencyPrefix, { color: palette.primary }]}>₦</Text>
              <TextInput
                style={[styles.input, { color: palette.text, fontSize: 18, fontWeight: 'bold' }]}
                placeholder="0.00"
                placeholderTextColor={palette.textSecondary}
                keyboardType="numeric"
                value={tagAmount}
                onChangeText={setTagAmount}
              />
            </View>

            {/* Note */}
            <Text style={[styles.label, { color: palette.text }]}>Description (Optional)</Text>
            <View style={[styles.inputBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="e.g. Money transfer"
                placeholderTextColor={palette.textSecondary}
                value={tagNote}
                onChangeText={setTagNote}
              />
            </View>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: palette.primary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleInitiate}
        >
          <Text style={styles.submitBtnText}>Proceed to Transfer</Text>
        </Pressable>
      </ScrollView>

      {/* Bank Picker Modal */}
      <BankPickerModal
        visible={bankModalVisible}
        onClose={() => setBankModalVisible(false)}
        onSelect={(b) => setSelectedBank(b)}
        selectedBankCode={selectedBank?.code}
        banks={banksQuery.data ?? []}
        banksLoading={banksQuery.isLoading}
      />

      {/* PIN Confirmation Modal */}
      <PaymentPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onConfirm={handleConfirmPin}
        loading={bankTransferMutation.isPending || p2pTransferMutation.isPending}
      />

      {/* Transaction Result Modal */}
      <TransactionResultModal
        visible={resultModal.visible}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        amount={resultModal.amount}
        reference={resultModal.reference}
        onClose={() => {
          setResultModal((prev) => ({ ...prev, visible: false }));
          if (resultModal.type === 'success') {
            router.back();
          }
        }}
      />
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontSize: Typography.xs,
  },
  balanceVal: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
  tabSegment: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  segmentText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  formGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    marginTop: Spacing.xs,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: Typography.sm,
  },
  inputText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  placeholderText: {
    flex: 1,
    fontSize: Typography.sm,
  },
  bankSelectedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: Spacing.xs,
  },
  lookupSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
  },
  lookupNameText: {
    color: '#30D158',
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 11,
  },
  verifyPhoneBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 10,
  },
  verifyPhoneBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
});
