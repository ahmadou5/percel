import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Application from 'expo-application';
import { useAppPalette } from '@/lib/theme';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

let codePush: any = null;
try {
  codePush = require('@code-push-next/react-native-code-push');
} catch {
  // Safe fallback when running in dev/Expo Go without native binary module
}

interface CodePushMeta {
  label: string;
  packageHash: string;
  appVersion: string;
  description?: string;
  isPending?: boolean;
}

export function AppVersionFooter() {
  const palette = useAppPalette();
  const [codePushMeta, setCodePushMeta] = useState<CodePushMeta | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const nativeVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const nativeBuild = Application.nativeBuildVersion ?? '1';

  const fetchCodePushMetadata = async () => {
    if (!codePush?.getUpdateMetadata) return;
    try {
      const meta = await codePush.getUpdateMetadata();
      if (meta) {
        setCodePushMeta({
          label: meta.label,
          packageHash: meta.packageHash,
          appVersion: meta.appVersion,
          description: meta.description,
          isPending: meta.isPending,
        });
      }
    } catch {
      // Ignore errors when running outside native release builds
    }
  };

  useEffect(() => {
    void fetchCodePushMetadata();
  }, []);

  const handleCheckForUpdates = () => {
    if (!codePush?.sync) {
      Alert.alert('Development Environment', 'CodePush over-the-air updates require a native production/preview build.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Checking...');

    const syncOptions = {
      installMode: codePush.InstallMode?.ON_NEXT_RESTART ?? 1,
    };

    codePush.sync(
      syncOptions,
      (status: number) => {
        switch (status) {
          case codePush.SyncStatus?.CHECKING_FOR_UPDATE:
            setSyncStatus('Checking for updates…');
            break;
          case codePush.SyncStatus?.DOWNLOADING_PACKAGE:
            setSyncStatus('Downloading update…');
            break;
          case codePush.SyncStatus?.INSTALLING_UPDATE:
            setSyncStatus('Installing update…');
            break;
          case codePush.SyncStatus?.UP_TO_DATE:
            setIsSyncing(false);
            setSyncStatus(null);
            Alert.alert('Up to Date', "You're on the latest version of Percel.");
            break;
          case codePush.SyncStatus?.UPDATE_INSTALLED:
            setIsSyncing(false);
            setSyncStatus(null);
            void fetchCodePushMetadata();
            Alert.alert(
              'Update Ready',
              'Update downloaded successfully. Restart the app to apply changes.',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Restart Now',
                  onPress: () => {
                    if (codePush?.restartApp) {
                      codePush.restartApp();
                    }
                  },
                },
              ]
            );
            break;
          case codePush.SyncStatus?.UNKNOWN_ERROR:
          default:
            setIsSyncing(false);
            setSyncStatus(null);
            Alert.alert('Check Failed', 'Could not check for updates. Please try again later.');
            break;
        }
      },
      () => {
        // Download progress callback
      }
    ).catch(() => {
      setIsSyncing(false);
      setSyncStatus(null);
      Alert.alert('Check Failed', 'Unable to check for live updates right now.');
    });
  };

  const shortHash = codePushMeta?.packageHash ? codePushMeta.packageHash.slice(0, 7) : null;
  const runtimeText = codePushMeta
    ? `RUNTIME: ${codePushMeta.label.toUpperCase()} · ${shortHash}`
    : 'RUNTIME: NATIVE BUILD';

  return (
    <View style={styles.container}>
      <Text style={[styles.metaText, { color: palette.textSecondary }]}>
        {`APP VERSION: ${nativeVersion} (${nativeBuild})`}
      </Text>
      <Text style={[styles.metaText, { color: palette.textSecondary }]}>
        {runtimeText}
      </Text>

      <Pressable
        onPress={handleCheckForUpdates}
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
