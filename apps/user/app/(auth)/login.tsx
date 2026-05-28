import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { useLogin } from '@/hooks/useAuth';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useLogin({
    onSuccess: () => router.replace('/(tabs)/home'),
    onError: () => setError('Invalid credentials.'),
  });

  return (
    <KeyboardView>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Welcome back</Text>
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
        <Input label="Email or Phone" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry secureToggle />
        <Link href="/(auth)/forgot-password" style={{ marginBottom: 16 }}><Text>Forgot password?</Text></Link>
        <Button title="Login" loading={login.isPending} onPress={() => login.mutate({ identifier, password })} />
        <Link href="/(auth)/register" style={{ marginTop: 14, textAlign: 'center' }}><Text>No account? Register</Text></Link>
      </View>
    </KeyboardView>
  );
}
