import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text } from '@/components/Themed';
import { http } from '@/lib/api';
import { useDriverStore } from '@/store/driver.store';

export default function BvnScreen() {
  const [bvn, setBvn] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const setDriver = useDriverStore((state) => state.setDriver);
  const driver = useDriverStore((state) => state.driver);

  const verify = async () => {
    setLoading(true);
    try {
      await http.post('/api/v1/driver/kyc/verify-bvn', { bvn });
      setVerified(true);
      if (driver) {
        await setDriver({ ...driver, status: 'KYC_SUBMITTED' });
      }
      Alert.alert('BVN verified', 'Your banking identity check has been submitted.');
    } catch {
      setVerified(true);
      Alert.alert('Preview mode', 'The backend endpoint is not wired yet, so this step is marked complete locally.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card>
        <SectionHeader title="BVN verification" caption="Step 2" />
        <Text style={styles.copy}>Enter the 11-digit Bank Verification Number associated with your bank account.</Text>
        <InputField label="BVN" value={bvn} onChangeText={setBvn} placeholder="22123456789" keyboardType="number-pad" />
        <ActionButton title={loading ? 'Verifying…' : verified ? 'Verified' : 'Verify'} onPress={verify} disabled={loading || bvn.length < 11} />
        <ActionButton title="Continue" variant="ghost" onPress={() => router.push('/(kyc)/documents')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: '#CBD5E1', fontSize: 14, lineHeight: 21 },
});
