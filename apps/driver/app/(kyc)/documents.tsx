import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { http } from '@/lib/api';
import { useDriverStore } from '@/store/driver.store';

type UploadSlot = {
  key: 'license' | 'selfie' | 'vehicle';
  label: string;
  helper: string;
};

const slots: UploadSlot[] = [
  { key: 'license', label: 'License photo', helper: 'Front side of your driver license.' },
  { key: 'selfie', label: 'Selfie', helper: 'Face photo captured from the camera.' },
  { key: 'vehicle', label: 'Vehicle photo', helper: 'A clear photo of the delivery vehicle.' },
];

export default function KycDocumentsScreen() {
  const [licenseUrl, setLicenseUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [vehicleUrl, setVehicleUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const driver = useDriverStore((state) => state.driver);
  const setDriver = useDriverStore((state) => state.setDriver);

  const completed = useMemo(
    () => [licenseUrl, selfieUrl, vehicleUrl].filter(Boolean).length,
    [licenseUrl, selfieUrl, vehicleUrl],
  );

  const submit = async () => {
    setLoading(true);
    try {
      await http.post('/api/v1/driver/kyc/submit', {
        licenseImageUrl: licenseUrl,
        selfieUrl,
        vehicleImageUrl: vehicleUrl,
      });
      if (driver) {
        await setDriver({ ...driver, status: 'ACTIVE' });
      }
      Alert.alert('KYC submitted', 'Your documents are now under review.');
      router.replace('/(tabs)/home');
    } catch {
      if (driver) {
        await setDriver({ ...driver, status: 'ACTIVE' });
      }
      Alert.alert('Preview mode', 'The backend endpoint is not wired yet, so the documents are marked submitted locally.');
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card>
        <SectionHeader title="Document upload" caption={`${completed}/${slots.length} attached`} />
        <Text style={styles.copy}>Native pickers are not wired in this workspace yet, so paste a file URL or use the sample buttons below.</Text>
        <InputField label="License image URL" value={licenseUrl} onChangeText={setLicenseUrl} placeholder="https://..." />
        <InputField label="Selfie URL" value={selfieUrl} onChangeText={setSelfieUrl} placeholder="https://..." />
        <InputField label="Vehicle photo URL" value={vehicleUrl} onChangeText={setVehicleUrl} placeholder="https://..." />

        <View style={styles.sampleGrid}>
          {slots.map((slot) => (
            <Pressable
              key={slot.key}
              onPress={() => {
                const sample = `https://images.percel.dev/demo/${slot.key}.jpg`;
                if (slot.key === 'license') setLicenseUrl(sample);
                if (slot.key === 'selfie') setSelfieUrl(sample);
                if (slot.key === 'vehicle') setVehicleUrl(sample);
              }}
              style={styles.sampleCard}
            >
              <Text style={styles.sampleTitle}>{slot.label}</Text>
              <Text style={styles.sampleCopy}>{slot.helper}</Text>
            </Pressable>
          ))}
        </View>

        <ActionButton title={loading ? 'Submitting…' : 'Submit KYC'} onPress={submit} disabled={loading || completed < 3} />
        <ActionButton title="Back to overview" variant="ghost" onPress={() => router.replace('/(tabs)/home')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: '#CBD5E1', fontSize: 14, lineHeight: 21 },
  sampleGrid: { gap: 10 },
  sampleCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  sampleTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  sampleCopy: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
});
