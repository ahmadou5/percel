import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, HelpCircle, LifeBuoy, Plus } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useDriverSupportTickets } from '@/hooks/useDriverSupport';
import { useAppPalette } from '@/lib/theme';

export default function DriverSupportIndexScreen() {
  const router = useRouter();
  const palette = useAppPalette();
  const { data: tickets = [], isLoading } = useDriverSupportTickets();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', bg: 'rgba(255, 149, 0, 0.12)', text: '#FF9500' };
      case 'UNDER_REVIEW':
        return { label: 'In Review', bg: 'rgba(10, 132, 255, 0.12)', text: '#0A84FF' };
      case 'RESOLVED':
        return { label: 'Resolved', bg: 'rgba(48, 209, 88, 0.12)', text: '#30D158' };
      case 'CLOSED':
        return { label: 'Closed', bg: palette.border, text: palette.textSecondary };
      default:
        return { label: status, bg: palette.border, text: palette.textSecondary };
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Driver Help & Disputes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Driver Support Center</Text>
            <Text style={styles.heroSub}>Report earnings issues, trip disputes, or app problems.</Text>
          </View>
          <LifeBuoy size={42} color="rgba(255,255,255,0.85)" />
        </View>

        {/* Action Button */}
        <Pressable
          onPress={() => router.push('/support/create' as any)}
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[styles.createIconWrap, { backgroundColor: 'rgba(10,132,255,0.1)' }]}>
            <Plus size={20} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.createTitle, { color: palette.text }]}>File a Dispute / Report Issue</Text>
            <Text style={[styles.createSub, { color: palette.textSecondary }]}>File a ticket for wrong deduction or trip complaint</Text>
          </View>
          <ChevronRight size={18} color={palette.textSecondary} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Your Support Tickets</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={palette.primary} style={{ marginVertical: 20 }} />
        ) : tickets.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <HelpCircle size={32} color={palette.textSecondary} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No support tickets</Text>
            <Text style={[styles.emptySub, { color: palette.textSecondary }]}>You have not filed any complaints or disputes yet.</Text>
          </View>
        ) : (
          tickets.map((t) => {
            const badge = getStatusBadge(t.status);
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/support/[id]', params: { id: t.id } } as any)}
                style={({ pressed }) => [
                  styles.ticketCard,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <View style={styles.ticketTop}>
                  <Text style={[styles.ticketNumber, { color: palette.textSecondary }]}>{t.ticketNumber}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={[styles.ticketSubject, { color: palette.text }]} numberOfLines={1}>
                  {t.subject}
                </Text>
                <Text style={[styles.ticketDesc, { color: palette.textSecondary }]} numberOfLines={2}>
                  {t.description}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  heroCard: {
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, color: '#FFF' },
  heroSub: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.85)' },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  createIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  createSub: { fontSize: Typography.xs },
  sectionHeader: { marginTop: 8 },
  sectionTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  emptyCard: { padding: Spacing.xl, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 6, marginVertical: 12 },
  emptyTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  emptySub: { fontSize: Typography.xs, textAlign: 'center' },
  ticketCard: {
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNumber: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  badgeText: { fontSize: 11, fontFamily: Typography.family.bold },
  ticketSubject: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  ticketDesc: { fontSize: Typography.xs, lineHeight: 16 },
});
