import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ActionButton, Card, InputField, Screen, SectionHeader } from '@/components/DriverPrimitives';
import { Text, View } from '@/components/Themed';
import { useLogin } from '@/hooks/useAuth';
import { useDriverStore } from '@/store/driver.store';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();
  const setDriver = useDriverStore((state) => state.setDriver);
  const driver = useDriverStore((state) => state.driver);

  const submit = async () => {
    setError(null);
    try {
      await login.mutateAsync({ identifier, password });
      if (driver) {
        await setDriver(driver);
      }
      router.replace(driver?.status === 'ACTIVE' ? '/(tabs)' : '/(kyc)');
    } catch {
      setError('Invalid driver credentials.');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Driver access</Text>
            <Text style={styles.title}>Sign in to your shift.</Text>
            <Text style={styles.subtitle}>Use your email or phone number and password to open the live dispatch board.</Text>
          </View>

          <Card>
            <SectionHeader title="Welcome back" caption="Driver login" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <InputField label="Email or phone" placeholder="driver@percel.co or +234..." value={identifier} onChangeText={setIdentifier} />
            <InputField label="Password" placeholder="Enter password" secureTextEntry value={password} onChangeText={setPassword} />

            <ActionButton title={login.isPending ? 'Opening dashboard…' : 'Open dashboard'} onPress={submit} disabled={login.isPending} />
            {login.isPending ? <ActivityIndicator color="#FDE68A" /> : null}
          </Card>

          <Pressable onPress={() => router.replace('/(auth)/register')} style={styles.linkWrap}>
            <Text style={styles.link}>Create a driver account</Text>
          </Pressable>
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
  linkWrap: { alignSelf: 'center', paddingVertical: 4 },
  link: { color: '#BFDBFE', fontSize: 13, fontWeight: '700' },
});
