import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useAuth';

const checklist = [
  'Confirm phone battery and data plan are active.',
  'Check vehicle fuel, tyres, and delivery bag before leaving.',
  'Review the active order, customer notes, and stop sequence.',
] as const;

const supportCards = [
  { label: 'Dispatch line', value: '+234 700 555 0112', icon: 'phone' },
  { label: 'Safety team', value: 'safety@percel.co', icon: 'shield' },
  { label: 'Vehicle docs', value: 'Licence, insurance, inspection', icon: 'file-text' },
] as const;

export default function ModalScreen() {
  const logout = useLogout();

  return (
    <View style={styles.screen} lightColor={Colors.light.bg} darkColor={Colors.dark.bg}>
      <Stack.Screen options={{ title: 'Shift checklist' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome name="id-card" size={22} color="#FFFFFF" />
          </View>
          <Text lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.heroTitle}>Start each shift ready.</Text>
          <Text lightColor="rgba(255,255,255,0.82)" darkColor="rgba(255,255,255,0.82)" style={styles.heroCopy}>
            Use this screen before you go online, when you need a quick support contact, or when you want to
            verify your delivery readiness.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Before going online</Text>
          <Text style={styles.sectionCaption}>3-step check</Text>
        </View>

        <View style={styles.card} lightColor={Colors.light.card} darkColor={Colors.dark.card}>
          {checklist.map((item, index) => (
            <View key={item} style={[styles.checkRow, index !== checklist.length - 1 && styles.checkRowDivider]}>
              <View style={styles.checkBadge}>
                <Text lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.checkBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Support contacts</Text>
          <Text style={styles.sectionCaption}>Live help</Text>
        </View>

        <View style={styles.supportGrid}>
          {supportCards.map((card) => (
            <View key={card.label} style={styles.supportCard} lightColor={Colors.light.card} darkColor={Colors.dark.card}>
              <View style={styles.supportIcon}>
                <FontAwesome name={card.icon} size={15} color="#FFFFFF" />
              </View>
              <Text style={styles.supportLabel}>{card.label}</Text>
              <Text style={styles.supportValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card} lightColor={Colors.light.card} darkColor={Colors.dark.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Need a hand?</Text>
          </View>
          <Text style={styles.helpCopy}>
            Tap dispatch if an order is blocked, customer contact is unreachable, or the pickup location changes.
          </Text>
          <Pressable style={styles.helpButton}>
            <FontAwesome name="life-ring" size={14} color="#FFFFFF" />
            <Text lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.helpButtonText}>Contact dispatch</Text>
          </Pressable>

          <Pressable
            style={[styles.signOutButton, logout.isPending ? styles.signOutButtonDisabled : null]}
            onPress={async () => {
              await logout.mutateAsync();
              router.replace('/(auth)/login');
            }}
            disabled={logout.isPending}
          >
            <Text style={styles.signOutText}>{logout.isPending ? 'Signing out...' : 'Sign out'}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.huge,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  hero: {
    borderRadius: 24,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.light.primary,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: Typography.xxl,
    lineHeight: 34,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
    marginBottom: 10,
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: Typography.sm,
    lineHeight: 22,
    fontFamily: Typography.family.regular,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
  sectionCaption: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: Typography.semibold,
    fontFamily: Typography.family.semibold,
  },
  card: {
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: 22,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  checkRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },
  checkBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
  checkText: {
    flex: 1,
    color: Colors.light.text,
    fontSize: Typography.sm,
    lineHeight: 20,
    fontWeight: Typography.semibold,
    fontFamily: Typography.family.semibold,
  },
  supportGrid: {
    gap: 12,
    marginBottom: 22,
  },
  supportCard: {
    borderRadius: 24,
    padding: Spacing.lg,
  },
  supportIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    marginBottom: 12,
  },
  supportLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  supportValue: {
    color: Colors.light.text,
    fontSize: Typography.sm,
    lineHeight: 21,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
  helpCopy: {
    color: Colors.light.textSecondary,
    fontSize: Typography.sm,
    lineHeight: 21,
    fontFamily: Typography.family.regular,
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: Colors.light.primary,
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
  signOutButton: {
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.light.border,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: Colors.light.text,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    fontFamily: Typography.family.bold,
  },
});
