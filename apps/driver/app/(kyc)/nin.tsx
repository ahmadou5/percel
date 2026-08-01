import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text } from '@/components/Themed';
import { Colors } from '@/constants/palette';
import { Typography } from '@/constants/typography';
import { http } from '@/lib/api';
import { useDriverStore } from '@/store/driver.store';

export default function NinScreen() {
  const queryClient = useQueryClient();
  const [nin, setNin] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const setDriver = useDriverStore((state) => state.setDriver);
  const driver = useDriverStore((state) => state.driver);

  const verify = async () => {
    setLoading(true);
    try {
      const response = await http.post<{ data: { verified: boolean; message?: string } }>('/api/v1/driver/kyc/verify-nin', { nin });
      if (!response.data.data.verified) {
        Alert.alert('NIN verification failed', response.data.data.message ?? 'Please review the number and try again.');
        return;
      }

      setVerified(true);
      if (driver) {
        await setDriver({ ...driver, status: 'KYC_SUBMITTED' });
      }
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      Alert.alert('NIN verified', 'Your identity check has been submitted.');
    } catch (error) {
      Alert.alert('Could not verify NIN', error instanceof Error ? error.message : 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card>
        <SectionHeader title="NIN verification" caption="Step 1" />
        <Text style={styles.copy}>Enter the 11-digit National Identification Number used for your driver record.</Text>
        <InputField label="NIN" value={nin} onChangeText={setNin} placeholder="12345678901" keyboardType="number-pad" />
        <ActionButton title={loading ? 'Verifying…' : verified ? 'Verified' : 'Verify'} onPress={verify} disabled={loading || nin.length < 11} />
        <ActionButton title="Continue" variant="ghost" onPress={() => router.push('/(kyc)/bvn')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 21, fontFamily: Typography.family.regular },
});
