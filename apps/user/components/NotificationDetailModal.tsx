import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CircleAlert, CreditCard, Package, Wallet } from 'lucide-react-native';

import { useAppPalette } from '@/lib/theme';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatNotificationDate, notificationTone, type AppNotification } from '@/lib/notifications';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { haptics } from '@/utils/haptics';

type NotificationDetailModalProps = {
  visible: boolean;
  notification: AppNotification | null;
  onClose: () => void;
};

function iconFor(notification: AppNotification) {
  const kind = String(notification.data?.kind ?? '').toLowerCase();
  if (kind.includes('transfer')) return CreditCard;
  if (kind.includes('wallet') || kind.includes('topup') || kind.includes('bill')) return Wallet;
  if (kind.includes('order')) return Package;
  if (kind.includes('system')) return CircleAlert;
  return Bell;
}

function prettyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return new Intl.NumberFormat('en-NG').format(value);
  if (Array.isArray(value)) return value.map((item) => prettyValue(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function notificationRows(notification: AppNotification) {
  const entries = Object.entries(notification.data ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return [
    { label: 'Type', value: notification.type },
    { label: 'Status', value: notification.read ? 'Read' : 'Unread' },
    { label: 'Created', value: formatNotificationDate(notification.createdAt) },
    ...entries.map(([key, value]) => ({ label: key.replace(/_/g, ' '), value: prettyValue(value) })),
  ];
}

export function NotificationDetailModal({ visible, notification, onClose }: NotificationDetailModalProps) {
  const palette = useAppPalette();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.94)).current;
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!visible) return;

    scale.setValue(0.94);
    opacity.setValue(0);
    void haptics.tap();
    if (reduceMotion) return;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 90,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, reduceMotion, scale, visible]);

  const toneType = notification ? notificationTone(notification.type) : 'muted';
  const Icon = notification ? iconFor(notification) : Bell;
  const tone =
    toneType === 'success'
      ? { backgroundColor: 'rgba(48,209,88,0.12)', iconColor: palette.success, accent: palette.success }
      : toneType === 'primary'
        ? { backgroundColor: 'rgba(10,132,255,0.12)', iconColor: palette.primary, accent: palette.primary }
        : toneType === 'warning'
          ? { backgroundColor: 'rgba(255,159,10,0.12)', iconColor: palette.warning, accent: palette.warning }
          : { backgroundColor: 'rgba(148,163,184,0.12)', iconColor: palette.textSecondary, accent: palette.textSecondary };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, opacity, transform: [{ scale }] }] }>
          <View style={[styles.iconWrap, { backgroundColor: tone.backgroundColor }] }>
            <Icon size={26} color={tone.iconColor} />
          </View>

          {notification ? (
            <>
              <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: palette.text }]}>{notification.title}</Text>
                <Text style={[styles.message, { color: palette.textSecondary }]}>{notification.body}</Text>
              </View>

              <ScrollView style={styles.rowsScroll} contentContainerStyle={styles.rows} showsVerticalScrollIndicator={false}>
                {notificationRows(notification).map((row) => (
                  <View key={row.label} style={[styles.row, { borderColor: palette.border }]}>
                    <Text style={[styles.label, { color: palette.textSecondary }]}>{row.label}</Text>
                    <Text style={[styles.value, { color: palette.text }]}>{row.value}</Text>
                  </View>
                ))}
              </ScrollView>

              <Pressable onPressIn={() => void haptics.tap()} onPress={onClose} style={[styles.primaryButton, { backgroundColor: tone.accent }]}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '84%',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontSize: Typography.xl,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  rowsScroll: {
    maxHeight: 360,
  },
  rows: {
    gap: 10,
    paddingTop: 2,
  },
  row: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Typography.family.bold,
  },
  value: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
    flexShrink: 1,
    textAlign: 'right',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
