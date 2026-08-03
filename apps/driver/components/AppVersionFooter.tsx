import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useAppPalette } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { AppModal, useAppModal } from '@/components/ui/AppModal';

export function AppVersionFooter() {
  const palette = useAppPalette();
  const modal = useAppModal();
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const nativeVersion = Constants.expoConfig?.version ?? '1.0.0';
  const nativeBuild = Constants.expoConfig?.android?.versionCode?.toString() ?? '1';

  const handleCheckForUpdates = async () => {
    if (__DEV__) {
      modal.alert(
        'Development Mode',
        'Live over-the-air (OTA) updates require a preview or production build.',
        'info'
      );
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Checking for updates…');

    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setSyncStatus('Downloading update…');
        await Updates.fetchUpdateAsync();
        setIsSyncing(false);
        setSyncStatus(null);

        modal.show({
          title: 'Update Ready',
          description: 'A new update has been downloaded. Restart the app to apply changes.',
          type: 'success',
          primaryText: 'Restart Now',
          onPrimaryPress: () => {
            void Updates.reloadAsync();
          },
          secondaryText: 'Later',
          onSecondaryPress: () => modal.hide(),
        });
      } else {
        setIsSyncing(false);
        setSyncStatus(null);
        modal.alert('Up to Date', "You're running the latest version of Percel Driver.", 'success');
      }
    } catch (error: any) {
      setIsSyncing(false);
      setSyncStatus(null);
      const msg = error?.message || 'Unable to check for live updates right now.';
      modal.alert('Check Failed', msg, 'error');
    }
  };

  const updateId = Updates.updateId ? ` · ID: ${Updates.updateId.slice(0, 7)}` : '';
  const runtimeText = `RUNTIME: ${Updates.channel || 'NATIVE BUILD'}${updateId}`;

  return (
    <View style={styles.container}>
      <Text style={[styles.metaText, { color: palette.textSecondary }]}>
        {`APP VERSION: ${nativeVersion} (${nativeBuild})`}
      </Text>
      <Text style={[styles.metaText, { color: palette.textSecondary }]}>
        {runtimeText}
      </Text>

      <Pressable
        onPress={() => void handleCheckForUpdates()}
        disabled={isSyncing}
        style={({ pressed }) => [styles.updateButton, pressed && { opacity: 0.65 }]}
      >
        {isSyncing ? (
          <View style={styles.syncingRow}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={[styles.updateText, { color: palette.primary }]}>{syncStatus ?? 'Syncing…'}</Text>
          </View>
        ) : (
          <Text style={[styles.updateText, styles.underline, { color: palette.primary }]}>
            Check for updates
          </Text>
        )}
      </Pressable>
      <AppModal config={modal.config} onClose={modal.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Typography.family.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    lineHeight: 15,
  },
  updateButton: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateText: {
    fontSize: 12,
    fontFamily: Typography.family.medium,
    textAlign: 'center',
  },
  underline: {
    textDecorationLine: 'underline',
  },
});
