import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AuthBackdrop } from '@/components/auth/AuthBackdrop';
import { AuthButton, AuthInput, CountryPill, ErrorBanner, KeyboardView, useAuthPalette } from '@/components/auth/AuthControls';
import { useRegisterDriver } from '@/hooks/useAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+234\d{10}$/;
const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const vehicleTypes = ['BIKE', 'CAR', 'VAN', 'TRUCK'] as const;

type Step = 1 | 2 | 3 | 4 | 5;
type VehicleType = (typeof vehicleTypes)[number];

function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+234')) return cleaned.slice(4).replace(/\D/g, '');
  if (cleaned.startsWith('234') && cleaned.length >= 13) return cleaned.slice(3).replace(/\D/g, '');
  if (cleaned.startsWith('0')) return cleaned.slice(1).replace(/\D/g, '');
  return cleaned.replace(/\D/g, '');
}

export default function DriverRegisterScreen() {
  const { palette, light } = useAuthPalette();
  const params = useLocalSearchParams<{ phone?: string; step?: string }>();
  const initialStep = params.step ? parseInt(params.step, 10) as Step : 1;
  const [step, setStep] = useState<Step>(initialStep);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('BIKE');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useRegisterDriver({
    onSuccess: () => {
      router.replace('/(kyc)');
    },
    onError: (err) => {
      const serverMessage = err instanceof Error ? err.message : 'Unable to create a driver account.';
      setError(serverMessage);
    },
  });

  const phoneValue = useMemo(() => normalizePhone(phone), [phone]);
  const stepValid = useMemo(() => {
    switch (step) {
      case 1:
        return fullName.trim().length >= 2 && acceptedTerms;
      case 2:
        return phoneRegex.test(`+234${phoneValue}`) && emailRegex.test(email.trim());
      case 3:
        return passRegex.test(password);
      case 4:
        return Boolean(vehicleType) && vehiclePlate.trim().length >= 5 && vehicleModel.trim().length >= 2;
      case 5:
        return licenseNumber.trim().length >= 4;
      default:
        return false;
    }
  }, [acceptedTerms, email, fullName, licenseNumber, password, phoneValue, step, vehicleModel, vehiclePlate, vehicleType]);

  const next = () => {
    if (stepValid && step < 5) setStep((current) => (current + 1) as Step);
  };

  const back = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as Step);
      return;
    }
    router.back();
  };

  const submit = async () => {
    if (!stepValid || register.isPending) return;
    setError(null);
    register.mutate({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: `+234${phoneValue}`,
      password,
      vehicleType,
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      vehicleModel: vehicleModel.trim(),
      licenseNumber: licenseNumber.trim().toUpperCase(),
    });
  };

  return (
    <KeyboardView>
      <View style={[styles.screen, { backgroundColor: palette.bg }]}> 
        <AuthBackdrop />
        <View style={[styles.overlay, { backgroundColor: light ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]} />

        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={back} style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.card }]}>
            <Ionicons name="arrow-back" size={18} color={palette.text} />
          </Pressable>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(Math.min(step, 5) / 5) * 100}%`, backgroundColor: palette.primary }]} />
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} style={[styles.topLink, { borderColor: palette.border, backgroundColor: palette.card }]}>
            <Text style={[styles.topLinkText, { color: palette.primary }]}>Log In</Text>
          </Pressable>
        </View>

        <View style={styles.cardWrap}>
          <Animated.View entering={FadeInDown.duration(600)} style={[styles.card, { backgroundColor: light ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.06)', borderColor: light ? palette.border : 'rgba(255,255,255,0.08)' }]}> 
            {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

            {step === 1 ? (
              <Animated.View key="step-1" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>DRIVER DETAILS</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>Start with the legal name you will use for verification.</Text>

                <AuthInput
                  label="Full name"
                  placeholder="Ayo Ibrahim"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  error={fullName && fullName.trim().length < 2 ? 'Enter your full name' : undefined}
                />

                <View style={styles.termsRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                    onPress={() => setAcceptedTerms((value) => !value)}
                    style={[styles.checkbox, { borderColor: acceptedTerms ? palette.primary : palette.border, backgroundColor: acceptedTerms ? palette.primary : 'transparent' }]}
                  >
                    {acceptedTerms ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </Pressable>
                  <Text style={[styles.termsText, { color: palette.textSecondary }]}>I agree to the Percel driver terms and dispatch policies.</Text>
                </View>

                <AuthButton title="Continue" disabled={!stepValid} onPress={next} />
              </Animated.View>
            ) : null}

            {step === 2 ? (
              <Animated.View key="step-2" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>CONTACT INFO</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>Use a reachable phone number and email for dispatch updates.</Text>

                <AuthInput
                  label="Phone number"
                  placeholder="801 234 5678"
                  value={phone}
                  onChangeText={(value) => setPhone(normalizePhone(value))}
                  keyboardType="phone-pad"
                  leftElement={<CountryPill />}
                  error={phone && !phoneRegex.test(`+234${phoneValue}`) ? 'Enter a valid Nigerian phone number' : undefined}
                  autoFocus
                />
                <AuthInput
                  label="Email"
                  placeholder="driver@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  error={email && !emailRegex.test(email.trim()) ? 'Enter a valid email' : undefined}
                />

                <AuthButton title="Continue" disabled={!stepValid} onPress={next} />
              </Animated.View>
            ) : null}

            {step === 3 ? (
              <Animated.View key="step-3" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>CREATE PASSWORD</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>Use at least 8 characters, one uppercase letter, and one number.</Text>

                <AuthInput
                  label="Password"
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  secureToggle
                  error={password && !passRegex.test(password) ? 'Min 8 chars, one uppercase, one number' : undefined}
                  autoFocus
                />

                <AuthButton title="Continue" disabled={!stepValid} onPress={next} />
              </Animated.View>
            ) : null}

            {step === 4 ? (
              <Animated.View key="step-4" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>VEHICLE DETAILS</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>Add the vehicle dispatch will assign to deliveries.</Text>

                <View style={styles.vehicleRow}>
                  {vehicleTypes.map((type) => {
                    const selected = vehicleType === type;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={type}
                        onPress={() => setVehicleType(type)}
                        style={[styles.vehicleChip, { borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primary : palette.card }]}
                      >
                        <Text style={[styles.vehicleChipText, { color: selected ? '#fff' : palette.textSecondary }]}>{type}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <AuthInput
                  label="Plate number"
                  placeholder="LAG-482XY"
                  value={vehiclePlate}
                  onChangeText={setVehiclePlate}
                  autoCapitalize="characters"
                  error={vehiclePlate && vehiclePlate.trim().length < 5 ? 'Enter a valid plate number' : undefined}
                />
                <AuthInput
                  label="Vehicle model"
                  placeholder="Bajaj Boxer"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  autoCapitalize="words"
                  error={vehicleModel && vehicleModel.trim().length < 2 ? 'Enter your vehicle model' : undefined}
                />

                <AuthButton title="Continue" disabled={!stepValid} onPress={next} />
              </Animated.View>
            ) : null}

            {step === 5 ? (
              <Animated.View key="step-5" entering={FadeInDown.duration(400)} exiting={FadeOut.duration(300)}>
                <Text style={[styles.heading, { color: palette.text }]}>LICENSE NUMBER</Text>
                <Text style={[styles.subheading, { color: palette.textSecondary }]}>This links your account to the driver verification flow.</Text>

                <AuthInput
                  label="License number"
                  placeholder="LIC-004200"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  autoCapitalize="characters"
                  error={licenseNumber && licenseNumber.trim().length < 4 ? 'Enter your license number' : undefined}
                  autoFocus
                />

                <AuthButton title={register.isPending ? 'Creating account...' : 'Create driver account'} loading={register.isPending} disabled={!stepValid || register.isPending} onPress={submit} />
              </Animated.View>
            ) : null}
          </Animated.View>
        </View>
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingVertical: 28 },
  overlay: { ...StyleSheet.absoluteFillObject },
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
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.12)' },
  progressFill: { height: '100%', borderRadius: 999 },
  topLink: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  topLinkText: { fontSize: 13, fontWeight: '700' },
  cardWrap: { flex: 1, justifyContent: 'center', width: '100%' },
  card: { alignSelf: 'center', width: '100%', maxWidth: 460, borderRadius: 28, borderWidth: 1, padding: 20, gap: 4 },
  heading: { fontSize: 24, lineHeight: 28, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subheading: { fontSize: 14, lineHeight: 20, marginBottom: 14, fontWeight: '400', textAlign: 'center' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center' },
  termsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  vehicleChip: { minHeight: 40, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 14, borderWidth: 1 },
  vehicleChipText: { fontSize: 12, fontWeight: '700' },
});
