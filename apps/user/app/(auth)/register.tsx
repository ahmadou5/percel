import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { useRegister } from '@/hooks/useAuth';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+234\d{10}$/;
const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const valid = useMemo(
    () =>
      fullName.trim().length >= 2 &&
      emailRegex.test(email) &&
      phoneRegex.test(phone) &&
      passRegex.test(password),
    [fullName, email, phone, password],
  );

  const register = useRegister({
    onSuccess: () => router.replace('/(tabs)/home'),
    onError: () => setError('Registration failed. Please try again.'),
  });

  return (
    <KeyboardView>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Create account</Text>
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
        <Input
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          error={fullName && fullName.length < 2 ? 'Min 2 chars' : undefined}
        />
        <Input
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={email && !emailRegex.test(email) ? 'Invalid email' : undefined}
        />
        <Input
          label="Phone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={phone && !phoneRegex.test(phone) ? 'Use +234XXXXXXXXXX' : undefined}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          secureToggle
          error={password && !passRegex.test(password) ? 'Min 8, one uppercase, one number' : undefined}
        />
        <Button
          title="Register"
          disabled={!valid}
          loading={register.isPending}
          onPress={() => register.mutate({ fullName, email, phone, password })}
        />
        <Link href="/(auth)/login" style={{ marginTop: 14, textAlign: 'center' }}><Text>Already have an account? Login</Text></Link>
      </View>
    </KeyboardView>
  );
}
