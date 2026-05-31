import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCheck, CircleAlert, Clock3, CreditCard, FileClock, Package, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { StateCard } from '@/components/ui/StateCard';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNotificationDate, type AppNotification } from '@/lib/notifications';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';

const filters = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
] as const;

function iconFor(notification: AppNotification) {
  const kind = String(notification.data?.kind ?? '').toLowerCase();
  if (kind.includes('transfer')) return CreditCard;
  if (kind.includes('wallet') || kind.includes('topup') || kind.includes('bill')) return Wallet;
  if (kind.includes('order')) return Package;
  if (kind.includes('system')) return CircleAlert;
  return Bell;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const palette = Colors[scheme];
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('ALL');
  const query = useNotifications(30);
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = useMemo(() => {
    const items = query.data?.data ?? [];
    if (filter === 'UNREAD') return items.filter((item) => !item.read);
    return items;
  }, [filter, query.data?.data]);

  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.backText, { color: palette.text }]}>Back</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>Notifications</Text>
          <Text style={[styles.title, { color: palette.text }]}>Track payments, orders, and account updates in one place.</Text>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: palette.primaryDark }] }>
        <View>
          <Text style={styles.summaryLabel}>Unread updates</Text>
          <Text style={styles.summaryValue}>{unreadCount}</Text>
        </View>
        <Pressable onPress={() => void markAll.mutateAsync()} style={[styles.summaryAction, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
          {markAll.isPending ? <ActivityIndicator color="#fff" /> : <CheckCheck size={18} color="#fff" />}
          <Text style={styles.summaryActionText}>Mark all read</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = item.key === filter;
          return (
            <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }] }>
              <Text style={[styles.filterText, { color: active ? palette.card : palette.text }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <StateCard loading title="Loading notifications" description="We’re fetching your latest updates and wallet alerts." icon={<FileClock size={24} color={palette.textSecondary} />} />
      ) : query.isError ? (
        <StateCard
          title="Could not load notifications"
          description="Check your connection and try again."
          icon={<CircleAlert size={24} color={palette.textSecondary} />}
          actionLabel="Retry"
          onActionPress={() => void query.refetch()}
        />
      ) : notifications.length ? (
        <View style={styles.list}>
          {notifications.map((item) => {
            const Icon = iconFor(item);
            return (
              <Pressable
                key={item.id}
                onPress={() => void markOne.mutateAsync(item.id)}
                style={({ pressed }) => [styles.card, { backgroundColor: palette.card, borderColor: item.read ? palette.border : palette.primary }, pressed ? styles.pressed : null]}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.read ? palette.bg : 'rgba(10,132,255,0.12)' }]}>
                  <Icon size={18} color={palette.primary} />
                </View>
                <View style={styles.body}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>{item.title}</Text>
                    {!item.read ? <View style={[styles.dot, { backgroundColor: palette.primary }]} /> : null}
                  </View>
                  <Text style={[styles.cardBody, { color: palette.textSecondary }]}>{item.body}</Text>
                  <View style={styles.metaRow}>
                    <Clock3 size={12} color={palette.textSecondary} />
                    <Text style={[styles.metaText, { color: palette.textSecondary }]}>{formatNotificationDate(item.createdAt)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <StateCard
          title="Nothing here yet"
          description="Your order updates, payment alerts, and system messages will appear here."
          icon={<Bell size={24} color={palette.textSecondary} />}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  headerRow: { gap: Spacing.lg },
  backButton: { width: 72, minHeight: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  headerCopy: { gap: 8 },
  eyebrow: { fontSize: Typography.xs, fontFamily: Typography.family.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  summaryCard: { borderRadius: 28, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  summaryLabel: { color: 'rgba(255,255,255,0.72)', fontSize: Typography.sm },
  summaryValue: { color: '#fff', fontSize: 34, lineHeight: 38, fontFamily: Typography.family.bold },
  summaryAction: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 999, paddingHorizontal: 14 },
  summaryActionText: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterChip: { minHeight: 42, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  list: { gap: 12 },
  card: { borderRadius: 22, borderWidth: 1, padding: Spacing.md, flexDirection: 'row', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: Typography.md, fontFamily: Typography.family.bold },
  cardBody: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  pressed: { opacity: 0.92 },
});
