import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronLeft, MapPin, Navigation, ShieldAlert, ShieldCheck, Zap } from 'lucide-react-native';

import { AppModal, useAppModal } from '@/components/ui/AppModal';
import { useSafeBack } from '@/components/navigation/useSafeBack';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { hexToRgba, useAppPalette } from '@/lib/theme';
import { usePreferencesStore } from '@/store/preferences.store';

export default function LocationSettingsScreen() {
  const back = useSafeBack('/settings');
  const palette = useAppPalette();
  const modal = useAppModal();

  const locationEnabled = usePreferencesStore((state) => state.locationEnabled);
  const setLocationEnabled = usePreferencesStore((state) => state.setLocationEnabled);

  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoGeocode, setAutoGeocode] = useState(true);
  const [nearbyHubs, setNearbyHubs] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkPermissions() {
      try {
        const fg = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        setPermissionStatus(fg.status);
      } catch {
        // Fallback for missing native location module
      }
    }

    void checkPermissions();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshPermissions = async () => {
    const fg = await Location.getForegroundPermissionsAsync();
    setPermissionStatus(fg.status);
    return fg.status;
  };

  const handleEnableLocation = async () => {
    setBusy(true);
    try {
      const fgCurrent = await Location.getForegroundPermissionsAsync();
      const fgNext = fgCurrent.status === Location.PermissionStatus.GRANTED
        ? fgCurrent
        : await Location.requestForegroundPermissionsAsync();

      setPermissionStatus(fgNext.status);

      if (fgNext.status !== Location.PermissionStatus.GRANTED) {
        modal.show({
          title: 'Location Permission Denied',
          description: 'Location access is blocked in system settings. Please open settings to grant location permission.',
          type: 'warning',
          primaryText: 'Open Settings',
          onPrimaryPress: () => {
            modal.hide();
            void Linking.openSettings();
          },
          secondaryText: 'Not now',
          onSecondaryPress: modal.hide,
        });
        return;
      }

      await setLocationEnabled(true);

      modal.show({
        title: 'Location Enabled',
        description: 'GPS location access is active for auto-filling addresses and real-time delivery tracking.',
        type: 'success',
        primaryText: 'Great',
        onPrimaryPress: modal.hide,
      });
    } catch (error) {
      modal.show({
        title: 'Could not enable location',
        description: error instanceof Error ? error.message : 'Please try again.',
        type: 'error',
        primaryText: 'OK',
        onPrimaryPress: modal.hide,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDisableLocation = async () => {
    setBusy(true);
    try {
      await setLocationEnabled(false);
      await refreshPermissions();
      modal.show({
        title: 'Location Preference Disabled',
        description: 'In-app location features disabled. Address entry will require manual search.',
        type: 'info',
        primaryText: 'OK',
        onPrimaryPress: modal.hide,
      });
    } finally {
      setBusy(false);
    }
  };

  const isGranted = permissionStatus === Location.PermissionStatus.GRANTED;
  const isBlocked = permissionStatus === Location.PermissionStatus.DENIED;

  const statusTone = isGranted ? palette.success : isBlocked ? palette.error : palette.warning;
  const statusLabel = isGranted ? 'Granted' : isBlocked ? 'Blocked' : 'Not Granted';

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <ChevronLeft size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Location Access</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.statusHeaderRow}>
            <View style={[styles.statusIconWrap, { backgroundColor: hexToRgba(statusTone, 0.14), borderColor: statusTone }]}>
              {isGranted ? (
                <ShieldCheck size={28} color={statusTone} />
              ) : isBlocked ? (
                <ShieldAlert size={28} color={statusTone} />
              ) : (
                <MapPin size={28} color={statusTone} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: palette.text }]}>GPS Location Permission</Text>
              <View style={[styles.badgePill, { backgroundColor: hexToRgba(statusTone, 0.14), borderColor: statusTone }]}>
                <View style={[styles.statusDot, { backgroundColor: statusTone }]} />
                <Text style={[styles.badgeText, { color: statusTone }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.statusDesc, { color: palette.textSecondary }]}>
            Percel uses location services to find nearby hubs, calculate precise delivery costs, and display real-time courier arrival on live maps.
          </Text>

          {/* Action Button */}
          {!isGranted ? (
            <Pressable
              onPress={() => void (isBlocked ? Linking.openSettings() : handleEnableLocation())}
              disabled={busy}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: palette.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MapPin size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>
                {busy ? 'Updating…' : isBlocked ? 'Open Device Settings' : 'Enable Location Access'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void handleDisableLocation()}
              disabled={busy}
              style={({ pressed }) => [
                styles.actionBtnSecondary,
                { backgroundColor: palette.bg, borderColor: palette.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.actionBtnSecondaryText, { color: palette.text }]}>
                {busy ? 'Updating…' : 'Revoke Location Preference'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Feature Toggles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>LOCATION FEATURES</Text>
          <View style={[styles.optionsGroup, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {/* Toggle 1: Auto-Detect Pickup Address */}
            <View style={[styles.optionRow, { borderColor: palette.border }]}>
              <View style={[styles.optionIcon, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <Navigation size={18} color={palette.primary} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Auto-Detect Current Address</Text>
                <Text style={[styles.optionSub, { color: palette.textSecondary }]}>
                  Automatically fill your pickup location when creating orders.
                </Text>
              </View>
              <Switch
                value={autoGeocode && isGranted}
                onValueChange={setAutoGeocode}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Toggle 2: Nearby Hubs & Service Areas */}
            <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.optionIcon, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <Zap size={18} color={palette.primary} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Nearby Hub Discovery</Text>
                <Text style={[styles.optionSub, { color: palette.textSecondary }]}>
                  Find closest drop-off hubs and service zone discounts.
                </Text>
              </View>
              <Switch
                value={nearbyHubs}
                onValueChange={setNearbyHubs}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  statusCard: {
    padding: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.md,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  statusDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    width: '100%',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  actionBtnSecondaryText: {
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
    marginLeft: Spacing.xs,
  },
  optionsGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
