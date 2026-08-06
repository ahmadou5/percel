import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, HelpCircle, LifeBuoy, MessageSquare, Plus, ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { StateCard } from '@/components/ui/StateCard';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useSupportTickets } from '@/hooks/useSupport';
import { useAppPalette } from '@/lib/theme';

export default function SupportIndexScreen() {
  const router = useRouter();
  const back = useSafeBack('/');
  const palette = useAppPalette();
  const { data: tickets = [], isLoading } = useSupportTickets();

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
          onPress={() => back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ArrowLeft size={18} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroSub}>Report failed orders, wrong charges, or chat with support.</Text>
          </View>
          <LifeBuoy size={42} color="rgba(255,255,255,0.85)" />
        </View>

        {/* Action Button */}
        <Pressable
          onPress={() => router.push('/support/create')}
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
            <Text style={[styles.createTitle, { color: palette.text }]}>Report an Issue / Dispute</Text>
            <Text style={[styles.createSub, { color: palette.textSecondary }]}>File a ticket for wrong charges or delivery problems</Text>
          </View>
          <ChevronRight size={18} color={palette.textSecondary} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Your Complaints & Tickets</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={palette.primary} style={{ marginVertical: 20 }} />
        ) : tickets.length === 0 ? (
          <StateCard
            title="No support tickets"
            description="You have not submitted any disputes or support complaints yet."
            icon={<HelpCircle size={28} color={palette.textSecondary} />}
          />
        ) : (
          tickets.map((t) => {
            const badge = getStatusBadge(t.status);
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/support/[id]', params: { id: t.id } })}
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

                {t.order ? (
                  <View style={[styles.orderRef, { backgroundColor: palette.bg }]}>
                    <Text style={[styles.orderRefText, { color: palette.textSecondary }]}>
                      Order: {t.order.trackingCode} • ₦{Number(t.order.price).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: Spacing.xs },
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
  heroSub: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.85)', fontFamily: Typography.family.medium },
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
  createSub: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  sectionHeader: { marginTop: 8 },
  sectionTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
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
  orderRef: { padding: 8, borderRadius: 10, marginTop: 4 },
  orderRefText: { fontSize: Typography.xs },
});
