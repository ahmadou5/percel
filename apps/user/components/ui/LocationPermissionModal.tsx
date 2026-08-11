import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { hexToRgba, useAppPalette } from '@/lib/theme';
import { useAuthStore } from '@/store/auth.store';
import { usePreferencesStore } from '@/store/preferences.store';

export function LocationPermissionModal() {
  const palette = useAppPalette();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const locationEnabled = usePreferencesStore((state) => state.locationEnabled);
  const setLocationEnabled = usePreferencesStore((state) => state.setLocationEnabled);
  const locationReminderDismissedAt = usePreferencesStore((state) => state.locationReminderDismissedAt);
  const setLocationReminderDismissedAt = usePreferencesStore((state) => state.setLocationReminderDismissedAt);

  const [visible, setVisible] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    async function checkPermission() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;

        setPermissionStatus(status);

        if (status === Location.PermissionStatus.GRANTED) {
          if (!locationEnabled) {
            void setLocationEnabled(true);
          }
          setVisible(false);
          return;
        }

        // Check if modal was dismissed recently (grace period 2 hours)
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const recentlyDismissed =
          locationReminderDismissedAt && Date.now() - locationReminderDismissedAt < TWO_HOURS_MS;

        if (!recentlyDismissed) {
          setVisible(true);
        }
      } catch {
        // Fallback for environments without location module
      }
    }

    void checkPermission();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, locationEnabled, locationReminderDismissedAt, setLocationEnabled]);

  const handleAllowAccess = async () => {
    setRequesting(true);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      const next = current.status === Location.PermissionStatus.GRANTED
        ? current
        : await Location.requestForegroundPermissionsAsync();

      setPermissionStatus(next.status);

      if (next.status === Location.PermissionStatus.GRANTED) {
        await setLocationEnabled(true);
        await setLocationReminderDismissedAt(null);
        setVisible(false);
      } else {
        // If permission was denied or blocked, redirect to settings
        void Linking.openSettings();
      }
    } catch (err) {
      console.warn('[LocationPermissionModal] permission request error:', err);
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = async () => {
    await setLocationReminderDismissedAt(Date.now());
    setVisible(false);
  };

  if (!visible) return null;

  const isBlocked = permissionStatus === Location.PermissionStatus.DENIED;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {/* Icon Glow Badge */}
          <View style={[styles.iconWrap, { backgroundColor: hexToRgba(palette.primary, 0.14), borderColor: palette.primary }]}>
            <MapPin size={32} color={palette.primary} />
          </View>

          <Text style={[styles.title, { color: palette.text }]}>Enable Location Access</Text>

          <Text style={[styles.description, { color: palette.textSecondary }]}>
            Percel uses your location to show nearby pickup points, calculate accurate delivery rates, and track your active package deliveries live.
          </Text>

          <View style={[styles.featureRow, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Navigation size={18} color={palette.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: palette.text }]}>Live Tracking & Address Autocomplete</Text>
              <Text style={[styles.featureSubtitle, { color: palette.textSecondary }]}>
                Auto-fill your pickup location and track driver arrival in real time.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => void handleAllowAccess()}
              disabled={requesting}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: palette.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <ShieldCheck size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                {requesting ? 'Requesting…' : isBlocked ? 'Open Settings' : 'Allow Location Access'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void handleDismiss()}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: palette.bg, borderColor: palette.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.titleMedium,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: Spacing.lg,
  },
  featureTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    fontSize: 13,
  },
  featureSubtitle: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    width: '100%',
  },
  primaryBtnText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  secondaryBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    fontSize: 14,
  },
});
