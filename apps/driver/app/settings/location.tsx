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
  const back = useSafeBack('/(tabs)/settings');
  const palette = useAppPalette();
  const modal = useAppModal();

  const locationEnabled = usePreferencesStore((state) => state.locationEnabled);
  const setLocationEnabled = usePreferencesStore((state) => state.setLocationEnabled);

  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [backgroundPermissionStatus, setBackgroundPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [backgroundTracking, setBackgroundTracking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkPermissions() {
      try {
        const fg = await Location.getForegroundPermissionsAsync();
        const bg = await Location.getBackgroundPermissionsAsync?.();
        if (cancelled) return;

        setPermissionStatus(fg.status);
        if (bg) setBackgroundPermissionStatus(bg.status);
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
    const bg = await Location.getBackgroundPermissionsAsync?.();
    setPermissionStatus(fg.status);
    if (bg) setBackgroundPermissionStatus(bg.status);
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
          description: 'Location access is blocked in device settings. Please open settings to allow location access.',
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

      // Try requesting background location for live delivery tracking if available
      try {
        const bgNext = await Location.requestBackgroundPermissionsAsync?.();
        if (bgNext) setBackgroundPermissionStatus(bgNext.status);
      } catch {
        // ignore background location error if not configured
      }

      await setLocationEnabled(true);

      modal.show({
        title: 'Location Enabled',
        description: 'GPS location tracking is active for dispatch matching and navigation.',
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
        description: 'In-app location preferences disabled. Note that active orders require location to dispatch.',
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
            Percel uses location services to match you with nearby dispatch orders, calculate customer delivery rates, and provide turn-by-turn navigation.
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
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>LOCATION PREFERENCES</Text>
          <View style={[styles.optionsGroup, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {/* Toggle 1: Dispatch & Order Matching */}
            <View style={[styles.optionRow, { borderColor: palette.border }]}>
              <View style={[styles.optionIcon, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <Navigation size={18} color={palette.primary} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Dispatch & Hub Matching</Text>
                <Text style={[styles.optionSub, { color: palette.textSecondary }]}>
                  Receive orders closest to your current location.
                </Text>
              </View>
              <Switch
                value={locationEnabled && isGranted}
                onValueChange={(val) => {
                  if (val) {
                    void handleEnableLocation();
                  } else {
                    void handleDisableLocation();
                  }
                }}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Toggle 2: High Accuracy Mode */}
            <View style={[styles.optionRow, { borderColor: palette.border }]}>
              <View style={[styles.optionIcon, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <Zap size={18} color={palette.primary} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>High Accuracy GPS</Text>
                <Text style={[styles.optionSub, { color: palette.textSecondary }]}>
                  Use high-precision GPS for accurate turn-by-turn navigation.
                </Text>
              </View>
              <Switch
                value={highAccuracy}
                onValueChange={setHighAccuracy}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Toggle 3: Background Tracking while Online */}
            <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.optionIcon, { backgroundColor: hexToRgba(palette.primary, 0.12) }]}>
                <MapPin size={18} color={palette.primary} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Background Tracking (Online)</Text>
                <Text style={[styles.optionSub, { color: palette.textSecondary }]}>
                  Keep sharing location while on active delivery routes.
                </Text>
              </View>
              <Switch
                value={backgroundTracking}
                onValueChange={setBackgroundTracking}
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
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
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
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
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
    fontFamily: Typography.family.bold,
    fontSize: 11,
  },
  statusDesc: {
    fontSize: 13,
    fontFamily: Typography.family.regular,
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
    fontFamily: Typography.family.bold,
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
    fontFamily: Typography.family.semibold,
    fontSize: 13,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.xs,
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
    fontFamily: Typography.family.semibold,
    fontSize: 14,
  },
  optionSub: {
    fontSize: 12,
    fontFamily: Typography.family.regular,
    marginTop: 2,
  },
});
