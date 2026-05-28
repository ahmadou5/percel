import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useRegisterDriver } from '@/hooks/useAuth';

const vehicleTypes = ['BIKE', 'CAR', 'VAN', 'TRUCK'] as const;

export default function DriverRegisterScreen() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicleType, setVehicleType] = useState<(typeof vehicleTypes)[number]>('BIKE');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const register = useRegisterDriver();

  const submit = async () => {
    setError(null);
    try {
      await register.mutateAsync({
        email,
        phone,
        password,
        fullName,
        vehicleType,
        vehiclePlate,
        vehicleModel,
        licenseNumber,
      });
      router.replace('/(kyc)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create a driver account.');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Driver registration</Text>
            <Text style={styles.title}>Create your delivery profile.</Text>
            <Text style={styles.subtitle}>Add your vehicle details now so KYC can move straight into verification after sign up.</Text>
          </View>

          <Card>
            <SectionHeader title="Account details" caption="Driver sign up" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <InputField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Ayo Ibrahim" />
            <InputField label="Email" value={email} onChangeText={setEmail} placeholder="driver@percel.co" />
            <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="+2348012345678" keyboardType="phone-pad" />
            <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Choose a strong password" secureTextEntry />
          </Card>

          <Card>
            <SectionHeader title="Vehicle details" caption="What you drive" />
            <View style={styles.vehicleRow}>
              {vehicleTypes.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setVehicleType(type)}
                  style={[styles.vehicleChip, vehicleType === type ? styles.vehicleChipActive : null]}
                >
                  <Text style={[styles.vehicleChipText, vehicleType === type ? styles.vehicleChipTextActive : null]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <InputField label="Plate number" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="LAG-482XY" />
            <InputField label="Vehicle model" value={vehicleModel} onChangeText={setVehicleModel} placeholder="Bajaj Boxer" />
            <InputField label="License number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="LIC-004200" />
          </Card>

          <ActionButton title={register.isPending ? 'Creating account…' : 'Create driver account'} onPress={submit} disabled={register.isPending} />
          <ActionButton title="Already have an account?" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 28 },
  hero: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  eyebrow: { color: '#FDE68A', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  error: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
  },
  vehicleChipActive: { backgroundColor: '#FDE68A', borderColor: '#FDE68A' },
  vehicleChipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  vehicleChipTextActive: { color: '#061423' },
});
