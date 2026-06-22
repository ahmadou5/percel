import { MessageCircle, Phone } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';

type Props = {
  driver: { name: string; avatar_url: string | null; phone: string };
  onChat: () => void;
  onCall: () => void;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function DriverContactRow({ driver, onChat, onCall }: Props) {
  const palette = useAppPalette();
  const hasPhone = Boolean(driver.phone);

  return (
    <View style={styles.row}>
      {driver.avatar_url ? (
        <Image source={{ uri: driver.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: palette.bg, borderColor: palette.border }]}>
          <Text style={[styles.initials, { color: palette.primary }]}>{initials(driver.name) || 'PD'}</Text>
        </View>
      )}
      <View style={styles.meta}>
        <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
          {driver.name}
        </Text>
        <Text style={[styles.role, { color: palette.textSecondary }]}>Delivery man</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Chat with driver"
          onPress={onChat}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: palette.bg, borderColor: palette.border },
            pressed ? { opacity: 0.72 } : null,
          ]}
        >
          <MessageCircle size={18} color={palette.primary} />
        </Pressable>
        {hasPhone ? (
          <Pressable
            accessibilityLabel="Call driver"
            onPress={onCall}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: palette.bg, borderColor: palette.border },
              pressed ? { opacity: 0.72 } : null,
            ]}
          >
            <Phone size={18} color={palette.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  role: { fontSize: Typography.sm, fontFamily: Typography.family.regular },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
