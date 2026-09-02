import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, KeyRound, MessageSquareText, ShieldCheck } from 'lucide-react-native';

import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useForgotPinConfirm, useForgotPinRequest } from '@/hooks/useWallet';
import { useAppPalette } from '@/lib/theme';

export default function ResetPinScreen() {
  const modal = useAppModal();
  const palette = useAppPalette();
  const goBack = useSafeBack();

  const requestOtp = useForgotPinRequest();
  const confirmOtp = useForgotPinConfirm();

  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'confirm'>('request');

  const handleRequest = async () => {
    void haptics.heavy();
    try {
      const result = await requestOtp.mutateAsync();
      setMaskedPhone(result.data.maskedPhone);
      setStep('confirm');
      modal.alert('Code sent', `We sent a 6-digit reset code to ${result.data.maskedPhone}.`, 'success');
    } catch (err) {
      modal.alert('Could not send code', err instanceof Error ? err.message : 'Please try again.', 'error');
    }
  };

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      modal.alert('Check the code', 'Enter the full 6-digit code we sent you.', 'info');
      return;
    }
    void haptics.heavy();
    try {
      await confirmOtp.mutateAsync({ otp: otp.trim() });
      modal.show({
        title: 'PIN cleared',
        description: 'Your old transfer PIN was removed. Set a new one in Security to keep your wallet protected.',
        type: 'success',
        primaryText: 'Set new PIN',
        onPrimaryPress: () => {
          modal.hide();
          router.replace('/profile/security');
        },
        secondaryText: 'Later',
        onSecondaryPress: () => {
          modal.hide();
          goBack();
        },
      });
    } catch (err) {
      modal.alert('Reset failed', err instanceof Error ? err.message : 'Please try again.', 'error');
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => goBack()}>
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.iconWrap, { backgroundColor: 'rgba(10,132,255,0.12)' }]}>
        <KeyRound size={26} color={palette.primary} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.title, { color: palette.text }]}>Reset transfer PIN</Text>
        <Text style={[styles.body, { color: palette.textSecondary }]}>
          We&apos;ll text a one-time code to your verified phone number to confirm it&apos;s really you.
        </Text>
      </View>

      {step === 'request' ? (
        <>
          <View style={[styles.infoCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <MessageSquareText size={18} color={palette.primary} />
            <Text style={[styles.infoText, { color: palette.text }]}>
              Your old PIN will be cleared once verified. You can then set a new one in Security settings.
            </Text>
          </View>

          <Pressable
            disabled={requestOtp.isPending}
            onPress={() => void handleRequest()}
            style={({ pressed }) => [styles.ctaButton, { backgroundColor: palette.primary, opacity: pressed || requestOtp.isPending ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText}>{requestOtp.isPending ? 'Sending…' : 'Send me a code'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={[styles.infoCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ShieldCheck size={18} color={palette.success} />
            <Text style={[styles.infoText, { color: palette.text }]}>
              Code sent to {maskedPhone ?? 'your phone'}. It expires in 15 minutes.
            </Text>
          </View>

          <TextInput
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6-digit code"
            placeholderTextColor={palette.textSecondary}
            style={[styles.otpInput, { backgroundColor: palette.card, color: palette.text, borderColor: palette.border }]}
          />

          <Pressable
            disabled={confirmOtp.isPending || otp.length !== 6}
            onPress={() => void handleConfirm()}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: otp.length === 6 ? palette.primary : palette.border, opacity: pressed || confirmOtp.isPending ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.ctaText}>{confirmOtp.isPending ? 'Verifying…' : 'Verify & clear old PIN'}</Text>
          </Pressable>

          <Pressable
            onPress={() => void handleRequest()}
            disabled={requestOtp.isPending}
            style={{ alignItems: 'center', paddingVertical: Spacing.sm }}
          >
            <Text style={[styles.resendText, { color: palette.primary }]}>
              {requestOtp.isPending ? 'Sending…' : 'Resend code'}
            </Text>
          </Pressable>
        </>
      )}

      <AppModal config={modal.config} onClose={modal.hide} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 42 },
  iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  body: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: Spacing.md },
  infoText: { flex: 1, fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  otpInput: { height: 56, borderRadius: 14, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: Typography.lg, fontFamily: Typography.family.bold, letterSpacing: 6, textAlign: 'center' },
  ctaButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  resendText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
});
