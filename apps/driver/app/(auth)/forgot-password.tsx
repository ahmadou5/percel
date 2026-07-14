import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { AuthButton, AuthInput, ErrorBanner, KeyboardView, useAuthPalette } from '@/components/auth/AuthControls';
import { useForgotPassword, useResetPassword } from '@/hooks/useAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?234\d{10}$|^0\d{10}$/;
const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function DriverForgotPasswordScreen() {
  const { palette, light } = useAuthPalette();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();

  const stepOneValid = useMemo(
    () => emailRegex.test(identifier.trim()) || phoneRegex.test(identifier.trim()),
    [identifier],
  );

  const handleSendCode = async () => {
    setError(null);
    try {
      await forgotPassword.mutateAsync(identifier.trim());
      setStep(2);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message;
      setError(msg || 'Something went wrong. Please try again.');
    }
  };

  const handleReset = async () => {
    if (!passRegex.test(newPassword)) {
      setError('Password must be at least 8 characters with one uppercase letter and one number.');
      return;
    }
    setError(null);
    try {
      await resetPassword.mutateAsync({ token: otp.trim(), newPassword });
      setStep(3);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message;
      setError(msg || 'Invalid or expired code. Please try again.');
    }
  };

  const totalSteps = 2;
  const progress = step === 3 ? 1 : (step - 1) / totalSteps;

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: palette.bg }]}>
        <AuthBackdrop />
        <View style={[styles.overlay, { backgroundColor: light ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]} />

        {/* Top row */}
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => (step > 1 && step < 3 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.back())}
            style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.card }]}
          >
            <Ionicons name="arrow-back" size={18} color={palette.text} />
          </Pressable>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: palette.primary }]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(auth)/login')}
            style={[styles.topLink, { borderColor: palette.border, backgroundColor: palette.card }]}
          >
            <Text style={[styles.topLinkText, { color: palette.primary }]}>Log In</Text>
          </Pressable>
        </View>

        <View style={styles.cardWrap}>
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={[
              styles.card,
              {
                backgroundColor: light ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.06)',
                borderColor: light ? palette.border : 'rgba(255,255,255,0.08)',
              },
            ]}
          >
            {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

            {/* Step 1 – Enter email / phone */}
            {step === 1 && (
              <Animated.View key="step-1" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>FORGOT PASSWORD?</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>
                  Enter the email or phone number linked to your driver account and we'll send you a 6-digit reset code.
                </Text>
                <AuthInput
                  label="Email or Phone"
                  placeholder="driver@example.com or 08012345678"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoFocus
                />
                <View style={styles.ctaWrap}>
                  <AuthButton
                    title={forgotPassword.isPending ? 'Sending code…' : 'Send Reset Code'}
                    loading={forgotPassword.isPending}
                    disabled={!stepOneValid || forgotPassword.isPending}
                    onPress={handleSendCode}
                  />
                </View>
              </Animated.View>
            )}

            {/* Step 2 – Enter OTP + new password */}
            {step === 2 && (
              <Animated.View key="step-2" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>ENTER RESET CODE</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>
                  We sent a 6-digit code to{' '}
                  <Text style={{ fontWeight: '600', color: palette.primary }}>
                    {identifier}
                  </Text>
                  . Enter it below with your new password.
                </Text>

                <AuthInput
                  label="6-Digit Code"
                  placeholder="Enter 6-digit code"
                  keyboardType="numeric"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  autoFocus
                />

                <View style={{ marginTop: 12 }}>
                  <AuthInput
                    label="New Password"
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    secureTextEntry
                    secureToggle
                    value={newPassword}
                    onChangeText={setNewPassword}
                    error={
                      newPassword && !passRegex.test(newPassword)
                        ? 'Min 8 chars, one uppercase, one number'
                        : undefined
                    }
                  />
                </View>

                <View style={styles.ctaWrap}>
                  <AuthButton
                    title={resetPassword.isPending ? 'Resetting…' : 'Reset Password'}
                    loading={resetPassword.isPending}
                    disabled={otp.trim().length < 6 || !passRegex.test(newPassword) || resetPassword.isPending}
                    onPress={handleReset}
                  />
                </View>
                <Pressable onPress={handleSendCode} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: palette.primary, fontWeight: '600' }}>
                    Didn&apos;t get a code? Resend
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Step 3 – Success */}
            {step === 3 && (
              <Animated.View key="step-3" entering={FadeInDown.duration(400)} style={{ alignItems: 'center', gap: 12 }}>
                <View style={[styles.successIcon, { backgroundColor: `${palette.primary}18` }]}>
                  <Ionicons name="checkmark-circle" size={48} color={palette.primary} />
                </View>
                <Text style={[styles.heading, { color: palette.text }]}>PASSWORD RESET!</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>
                  Your password has been updated. You can now log in to your driver account.
                </Text>
                <View style={styles.ctaWrap}>
                  <AuthButton
                    title="Back to Login"
                    onPress={() => router.replace('/(auth)/login')}
                  />
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
    position: 'absolute',
    top: 24,
    left: 20,
    right: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  topLink: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  topLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardWrap: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 4,
  },
  heading: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  ctaWrap: {
    marginTop: 12,
    width: '100%',
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
