import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCheck, ChevronLeft, CircleAlert, Clock3, CreditCard, FileClock, Package, Wallet } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppPalette } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import { formatNotificationDate, type AppNotification } from '@/lib/notifications';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';

const filters = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
] as const;

function iconFor(notification: AppNotification) {
  const kind = `${notification.type} ${String(notification.data?.kind ?? '')}`.toLowerCase();
  if (kind.includes('payment') || kind.includes('transfer')) return CreditCard;
  if (kind.includes('wallet') || kind.includes('earning')) return Wallet;
  if (kind.includes('order')) return Package;
  if (kind.includes('system')) return CircleAlert;
  return Bell;
}

export default function DriverNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const palette = useAppPalette();
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('ALL');
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const query = useNotifications(30);
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = useMemo(() => {
    const items = query.data?.data ?? [];
    return filter === 'UNREAD' ? items.filter((item) => !item.read) : items;
  }, [filter, query.data?.data]);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.bg }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Notifications</Text>

      </View>

      <View style={[styles.summaryCard, { backgroundColor: palette.primaryDark }]}>
        <View>
          <Text style={styles.summaryLabel}>Unread updates</Text>
          <Text style={styles.summaryValue}>{query.data?.unreadCount ?? 0}</Text>
        </View>
        <Pressable onPress={() => void markAll.mutateAsync()} style={styles.summaryAction}>
          {markAll.isPending ? <ActivityIndicator color="#fff" /> : <CheckCheck size={18} color="#fff" />}
          <Text style={styles.summaryActionText}>Mark all read</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => {
          const active = item.key === filter;
          return (
            <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, { backgroundColor: active ? palette.primary : palette.card, borderColor: active ? palette.primary : palette.border }]}>
              <Text style={[styles.filterText, { color: active ? '#fff' : palette.text }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <StateCard icon={<FileClock size={24} color={palette.textSecondary} />} title="Loading notifications" body="Fetching your latest delivery and wallet alerts." />
      ) : query.isError ? (
        <StateCard icon={<CircleAlert size={24} color={palette.textSecondary} />} title="Could not load notifications" body="Check your connection and try again." action="Retry" onAction={() => void query.refetch()} />
      ) : notifications.length ? (
        <View style={styles.list}>
          {notifications.map((item) => {
            const Icon = iconFor(item);
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelected(item);
                  if (!item.read) void markOne.mutateAsync(item.id);
                }}
                style={({ pressed }) => [styles.card, { backgroundColor: palette.card, borderColor: item.read ? palette.border : palette.primary }, pressed ? styles.pressed : null]}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.read ? palette.bg : 'rgba(124,58,237,0.14)' }]}>
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
        <StateCard icon={<Bell size={24} color={palette.textSecondary} />} title="Nothing here yet" body="Delivery requests, payout alerts, and system messages will appear here." />
      )}

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={[styles.detailSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.detailTitle, { color: palette.text }]}>{selected?.title}</Text>
            <Text style={[styles.detailBody, { color: palette.textSecondary }]}>{selected?.body}</Text>
            <Text style={[styles.detailDate, { color: palette.textSecondary }]}>{selected ? formatNotificationDate(selected.createdAt) : ''}</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StateCard({ icon, title, body, action, onAction }: { icon: React.ReactNode; title: string; body: string; action?: string; onAction?: () => void }) {
  const palette = useAppPalette();
  return (
    <View style={[styles.stateCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {icon}
      <Text style={[styles.stateTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: palette.textSecondary }]}>{body}</Text>
      {action ? (
        <Pressable onPress={onAction} style={[styles.stateButton, { backgroundColor: palette.primary }]}>
          <Text style={styles.stateButtonText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 110, gap: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { gap: 8 },
  eyebrow: { fontSize: Typography.xs, fontFamily: Typography.family.bold, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold },
  summaryCard: { borderRadius: 28, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { color: 'rgba(255,255,255,0.72)', fontSize: Typography.xs, fontFamily: Typography.family.medium },
  summaryValue: { color: '#fff', fontSize: 34, lineHeight: 38, fontFamily: Typography.family.bold },
  summaryAction: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 999, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.14)' },
  summaryActionText: { color: '#fff', fontSize: Typography.xs, fontFamily: Typography.family.bold },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterChip: { minHeight: 42, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: Typography.xs, fontFamily: Typography.family.bold },
  list: { gap: 12 },
  card: { borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: Typography.sm, fontFamily: Typography.family.bold },
  cardBody: { fontSize: Typography.xs, lineHeight: 18, fontFamily: Typography.family.regular },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, fontFamily: Typography.family.medium },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  stateCard: { borderRadius: 22, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  stateTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  stateBody: { fontSize: Typography.xs, fontFamily: Typography.family.regular, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  stateButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stateButtonText: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'flex-end' },
  detailSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 22, gap: 10 },
  detailTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  detailBody: { fontSize: Typography.sm, fontFamily: Typography.family.regular, lineHeight: 21 },
  detailDate: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  pressed: { opacity: 0.92 },
});
