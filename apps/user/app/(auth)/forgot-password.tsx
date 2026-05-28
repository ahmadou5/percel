import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { http } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await http.post('/api/v1/auth/forgot-password', { identifier });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardView>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Reset password</Text>
        <Input label="Email or Phone" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
        <Button title="Send reset link" loading={loading} onPress={submit} />
        {done ? <Text style={{ marginTop: 12 }}>If account exists, reset instructions have been sent.</Text> : null}
      </View>
    </KeyboardView>
  );
}
