import { Link } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/palette';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.inner}>
        <Text style={styles.logo}>Percel</Text>
        <Text style={styles.tagline}>Deliver anything, anywhere.</Text>
        <Link href="/(auth)/register" asChild>
          <View style={{ marginTop: 24 }}>
            <Button title="Get Started" />
          </View>
        </Link>
        <Link href="/(auth)/login" asChild>
          <View style={{ marginTop: 12 }}>
            <Button title="I already have an account" variant="ghost" />
          </View>
        </Link>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.bg, justifyContent: 'center', padding: 20 },
  inner: { backgroundColor: Colors.light.card, borderRadius: 20, padding: 24 },
  logo: { fontSize: 40, fontWeight: '700', color: Colors.light.primary },
  tagline: { marginTop: 8, fontSize: 18, color: Colors.light.textSecondary },
});
