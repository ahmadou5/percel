import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { http } from '@/lib/api';
import { useAppPalette } from '@/lib/theme';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimatedMinutes: number | null;
}

export function MaintenanceOverlay() {
  const palette = useAppPalette();
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>({
    enabled: false,
    message: '',
    estimatedMinutes: null,
  });

  useEffect(() => {
    let active = true;

    async function checkStatus() {
      try {
        const res = await http.get<{ data: { maintenance: MaintenanceConfig } }>('/api/v1/health/config');
        if (res.data?.data?.maintenance && active) {
          setMaintenance(res.data.data.maintenance);
        }
      } catch (err) {
        console.warn('Failed to fetch platform maintenance status', err);
      }
    }

    // Initial check
    void checkStatus();

    // Poll every 20 seconds
    const interval = setInterval(checkStatus, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!maintenance.enabled) {
    return null;
  }

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
    >
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
        <View style={styles.card}>
          <View style={[styles.iconWrapper, { backgroundColor: `${palette.primary}15` }]}>
            <Ionicons name="construct-outline" size={48} color={palette.primary} />
          </View>

          <Text style={[styles.heading, { color: palette.text }]}>DRIVER PLATFORM UPGRADE</Text>
          
          <Text style={[styles.message, { color: palette.textSecondary }]}>
            {maintenance.message || "We're currently upgrading the dispatch platform to improve routing and performance. We'll be back online shortly!"}
          </Text>

          {maintenance.estimatedMinutes ? (
            <View style={[styles.timerBadge, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Ionicons name="time-outline" size={16} color={palette.primary} />
              <Text style={[styles.timerText, { color: palette.text }]}>
                Estimated completion: ~{maintenance.estimatedMinutes} mins
              </Text>
            </View>
          ) : null}

          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={[styles.loaderText, { color: palette.textSecondary }]}>
              Reconnecting to servers...
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 24,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 24,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    fontWeight: '400',
  },
});
