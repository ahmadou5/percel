import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
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
    <View style={styles.screen} lightColor="#F3F4F6" darkColor="#030712">
      <Stack.Screen options={{ title: 'Shift checklist' }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome name="id-card" size={22} color="#061423" />
          </View>
          <Text lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.heroTitle}>Start each shift ready.</Text>
          <Text lightColor="#CBD5E1" darkColor="#CBD5E1" style={styles.heroCopy}>
            Use this screen before you go online, when you need a quick support contact, or when you want to
            verify your delivery readiness.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Before going online</Text>
          <Text style={styles.sectionCaption}>3-step check</Text>
        </View>

        <View style={styles.card} lightColor="#FFFFFF" darkColor="#111827">
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
            <View key={card.label} style={styles.supportCard} lightColor="#FFFFFF" darkColor="#111827">
              <View style={styles.supportIcon}>
                <FontAwesome name={card.icon} size={15} color="#FFFFFF" />
              </View>
              <Text style={styles.supportLabel}>{card.label}</Text>
              <Text style={styles.supportValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card} lightColor="#FFFFFF" darkColor="#111827">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Need a hand?</Text>
          </View>
          <Text style={styles.helpCopy}>
            Tap dispatch if an order is blocked, customer contact is unreachable, or the pickup location changes.
          </Text>
          <Pressable style={styles.helpButton}>
            <FontAwesome name="life-ring" size={14} color="#061423" />
            <Text lightColor="#0F172A" darkColor="#0F172A" style={styles.helpButtonText}>Contact dispatch</Text>
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
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  hero: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    backgroundColor: '#0F172A',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE68A',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroCopy: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCaption: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 28,
    padding: 18,
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
    borderBottomColor: '#E2E8F0',
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
  },
  checkBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  checkText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  supportGrid: {
    gap: 12,
    marginBottom: 22,
  },
  supportCard: {
    borderRadius: 24,
    padding: 18,
  },
  supportIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
    marginBottom: 12,
  },
  supportLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  supportValue: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  helpCopy: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: '#FDE68A',
  },
  helpButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  signOutButton: {
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
});
