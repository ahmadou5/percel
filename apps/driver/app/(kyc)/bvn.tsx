import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text } from '@/components/Themed';
import { Colors } from '@/constants/palette';
import { Typography } from '@/constants/typography';
import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { http } from '@/lib/api';
import { useDriverStore } from '@/store/driver.store';

export default function BvnScreen() {
  const modal = useAppModal();
  const queryClient = useQueryClient();
  const [bvn, setBvn] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const setDriver = useDriverStore((state) => state.setDriver);
  const driver = useDriverStore((state) => state.driver);

  const verify = async () => {
    setLoading(true);
    try {
      const response = await http.post<{ data: { verified: boolean; message?: string } }>('/api/v1/driver/kyc/verify-bvn', { bvn });
      if (!response.data.data.verified) {
        modal.alert('BVN verification failed', response.data.data.message ?? 'Please review the number and try again.', 'error');
        return;
      }

      setVerified(true);
      if (driver) {
        await setDriver({ ...driver, status: 'KYC_SUBMITTED' });
      }
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      modal.alert('BVN verified', 'Your banking identity check has been submitted.', 'success');
    } catch (error) {
      modal.alert('Could not verify BVN', error instanceof Error ? error.message : 'Please check your connection and try again.', 'error');
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
      <AppModal config={modal.config} onClose={modal.hide} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: Colors.light.textSecondary, fontSize: Typography.sm, lineHeight: 21, fontFamily: Typography.family.regular },
});
