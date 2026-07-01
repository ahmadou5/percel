import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Bell, Building2, CreditCard, HandCoins, Landmark, Phone, Shield, Trash2, Tv2, Users, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Linking } from 'react-native';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAuthStore } from '@/store/auth.store';
import { useAppPalette, isLight } from '@/lib/theme';
import { useBeneficiaryStore, type Beneficiary } from '@/store/beneficiary.store';
import { haptics } from '@/utils/haptics';

const SLUGS = {
  kyc: { title: 'KYC', description: 'Verify your identity so your account stays compliant and ready for higher limits.', Icon: BadgeCheck },
  'spending-limits': { title: 'Spending Limits', description: 'Manage the transaction limits that keep your account safe and predictable.', Icon: CreditCard },
  beneficiaries: { title: 'Beneficiaries', description: 'Review and manage the contacts and accounts you save for faster payments.', Icon: Users },
  notifications: { title: 'Notifications', description: 'Choose what updates you receive and when the app should alert you.', Icon: Bell },
  support: { title: 'Support', description: 'Reach the Percel team for help with deliveries, wallet issues, and account access.', Icon: HandCoins },
  'reset-pin': { title: 'Reset PIN', description: 'Need help regaining access? Reset your transfer PIN with guidance from support.', Icon: Shield },
} as const;

type SlugKey = keyof typeof SLUGS;

// ─── Beneficiaries sub-screen ─────────────────────────────────────────────────

type BeneficiaryTab = 'Bank' | 'Airtime' | 'TV';

function BeneficiariesScreen() {
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const { beneficiaries, removeBeneficiary } = useBeneficiaryStore();
  const [activeTab, setActiveTab] = useState<BeneficiaryTab>('Airtime');

  const bankBeneficiaries = beneficiaries.filter((b) => b.type === 'BANK');
  const airtimeBeneficiaries = beneficiaries.filter((b) => b.type === 'AIRTIME');
  // TV smartcards are stored with type PHONE + accountNumber
  const tvBeneficiaries = beneficiaries.filter((b) => b.type === 'PHONE' && b.accountNumber);

  const TABS: { key: BeneficiaryTab; label: string; Icon: typeof Phone; count: number }[] = [
    { key: 'Airtime', label: 'Airtime / Data', Icon: Phone, count: airtimeBeneficiaries.length },
    { key: 'Bank', label: 'Bank', Icon: Landmark, count: bankBeneficiaries.length },
    { key: 'TV', label: 'TV Cards', Icon: Tv2, count: tvBeneficiaries.length },
  ];

  const currentList: Beneficiary[] =
    activeTab === 'Bank' ? bankBeneficiaries :
    activeTab === 'TV' ? tvBeneficiaries :
    airtimeBeneficiaries;

  const handleDelete = (b: Beneficiary) => {
    void haptics.warning();
    Alert.alert(
      'Remove beneficiary',
      `Remove "${b.name}" from saved beneficiaries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeBeneficiary(b.id) },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Tab bar */}
      <View style={[styles.bTabBar, { borderBottomColor: lightBg ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)' }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.bTab, active ? [styles.bTabActive, { borderBottomColor: palette.primary }] : null]}
            >
              <tab.Icon size={14} color={active ? palette.primary : palette.textSecondary} />
              <Text style={[styles.bTabText, { color: active ? palette.primary : palette.textSecondary }]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.bTabBadge, { backgroundColor: active ? palette.primary : palette.border }]}>
                  <Text style={[styles.bTabBadgeText, { color: active ? '#fff' : palette.textSecondary }]}>{tab.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bList}>
        {currentList.length === 0 ? (
          <View style={styles.bEmpty}>
            <View style={[styles.bEmptyIcon, { backgroundColor: lightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }]}>
              {activeTab === 'Bank' ? <Landmark size={28} color={palette.textSecondary} /> :
               activeTab === 'TV' ? <Tv2 size={28} color={palette.textSecondary} /> :
               <Phone size={28} color={palette.textSecondary} />}
            </View>
            <Text style={[styles.bEmptyTitle, { color: palette.text }]}>No saved {activeTab === 'Airtime' ? 'contacts' : activeTab === 'TV' ? 'smartcards' : 'accounts'}</Text>
            <Text style={[styles.bEmptyBody, { color: palette.textSecondary }]}>
              {activeTab === 'Bank'
                ? 'Beneficiaries are saved automatically when you complete a bank transfer.'
                : activeTab === 'TV'
                  ? 'Save a smartcard from the TV subscription screen to see it here.'
                  : 'Save a number from the Airtime or Data screen to see it here.'}
            </Text>
          </View>
        ) : (
          currentList.map((b) => (
            <View key={b.id} style={[styles.bRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={[styles.bAvatar, { backgroundColor: lightBg ? 'rgba(10,132,255,0.08)' : 'rgba(10,132,255,0.14)' }]}>
                {activeTab === 'TV'
                  ? <Tv2 size={18} color={palette.primary} />
                  : activeTab === 'Bank'
                    ? <Building2 size={18} color={palette.primary} />
                    : <Text style={[styles.bAvatarText, { color: palette.primary }]}>{b.name.slice(0, 2).toUpperCase()}</Text>}
              </View>

              <View style={styles.bRowInfo}>
                <Text style={[styles.bRowName, { color: palette.text }]} numberOfLines={1}>{b.name}</Text>
                <Text style={[styles.bRowMeta, { color: palette.textSecondary }]} numberOfLines={1}>
                  {activeTab === 'Bank'
                    ? `${b.bankName ?? 'Bank'} • ${b.accountNumber ?? ''}`
                    : activeTab === 'TV'
                      ? `${b.bankName ?? ''} • ···${(b.accountNumber ?? '').slice(-4)}`
                      : `${b.phone ?? ''} • ${b.bankName ?? 'Network'}`}
                </Text>
              </View>

              <Pressable
                onPress={() => handleDelete(b)}
                style={[styles.bDeleteBtn, { backgroundColor: lightBg ? 'rgba(255,69,58,0.08)' : 'rgba(255,69,58,0.12)' }]}
                hitSlop={8}
              >
                <Trash2 size={15} color={palette.error} />
              </Pressable>
            </View>
          ))
        )}

        <View style={[styles.bHint, { backgroundColor: lightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)', borderColor: palette.border }]}>
          <Text style={[styles.bHintText, { color: palette.textSecondary }]}>
            Beneficiaries are saved locally on this device. To add one, complete a transaction and save it from within the payment screen.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const palette = useAppPalette();
  const lightBg = isLight(palette.bg);
  const back = useSafeBack("/settings");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);

  const slug = (Array.isArray(params.slug) ? params.slug[0] : params.slug) as SlugKey | undefined;
  const page = slug ? SLUGS[slug] : undefined;

  if (!isAuthenticated) {
    return <Redirect href='/(auth)/welcome' />;
  }

  if (!page) {
    return <Redirect href='/settings' />;
  }

  if (!isUnlocked && slug !== 'support' && slug !== 'reset-pin') {
    return <Redirect href='/auth-lock' />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl }]}>
        <Pressable onPress={() => back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ChevronRight size={18} color={palette.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{page.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Beneficiaries — full wired view */}
      {slug === 'beneficiaries' ? (
        <BeneficiariesScreen />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <View style={[styles.icon, { backgroundColor: palette.text }]}> 
              <page.Icon size={24} color={palette.card} />
            </View>
            <View style={[styles.note, { backgroundColor: lightBg ? 'rgba(10,132,255,0.06)' : 'rgba(255,255,255,0.04)', borderColor: palette.border }]}>
              <Text style={[styles.noteText, { color: palette.textSecondary }]}>This screen is wired into the new settings flow and can be expanded with the full product feature later.</Text>
            </View>
            {slug === 'support' || slug === 'reset-pin' ? <Button title="Email support" variant="secondary" onPress={() => void Linking.openURL('mailto:support@percel.app?subject=Percel%20Support')} /> : null}
            <Button title="Back to Settings" variant="secondary" onPress={() => back()} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.lg },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontFamily: Typography.family.bold },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.8 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },
  card: { borderRadius: 28, borderWidth: 1, padding: Spacing.lg, gap: 14, alignItems: 'center' },
  icon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  note: { width: '100%', borderRadius: 20, borderWidth: 1, padding: Spacing.md },
  noteText: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular, textAlign: 'center' },

  // Beneficiaries sub-screen styles
  bTabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.lg },
  bTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  bTabActive: {},
  bTabText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  bTabBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bTabBadgeText: { fontSize: 9, fontFamily: Typography.family.bold },
  bList: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  bRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, padding: Spacing.md },
  bAvatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bAvatarText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  bRowInfo: { flex: 1, gap: 3 },
  bRowName: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  bRowMeta: { fontSize: Typography.xs, lineHeight: 16 },
  bDeleteBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bEmpty: { alignItems: 'center', gap: 12, paddingVertical: Spacing.xxl },
  bEmptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bEmptyTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
  bEmptyBody: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular, textAlign: 'center', maxWidth: 260 },
  bHint: { borderRadius: 16, borderWidth: 1, padding: Spacing.md, marginTop: Spacing.sm },
  bHintText: { fontSize: Typography.xs, lineHeight: 17, fontFamily: Typography.family.regular, textAlign: 'center' },
});
