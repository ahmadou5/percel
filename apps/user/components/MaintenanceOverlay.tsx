import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { http } from '@/lib/api';
import { useAppPalette } from '@/lib/theme';
import { Typography } from '@/constants/typography';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimatedMinutes: number | null;
}

export function MaintenanceOverlay() {
  const theme = useAppPalette();
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
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.card}>
          <View style={[styles.iconWrapper, { backgroundColor: `${theme.primary}15` }]}>
            <Ionicons name="construct-outline" size={48} color={theme.primary} />
          </View>

          <Text style={[styles.heading, { color: theme.text }]}>SYSTEM UPGRADE IN PROGRESS</Text>
          
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {maintenance.message || "We're currently updating Percel to bring you a faster and more secure delivery experience. We'll be back online shortly!"}
          </Text>

          {maintenance.estimatedMinutes ? (
            <View style={[styles.timerBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="time-outline" size={16} color={theme.primary} />
              <Text style={[styles.timerText, { color: theme.text }]}>
                Estimated completion: ~{maintenance.estimatedMinutes} mins
              </Text>
            </View>
          ) : null}

          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loaderText, { color: theme.textSecondary }]}>
              Checking systems...
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
    fontFamily: Typography.family.bold,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Typography.family.regular,
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
    fontFamily: Typography.family.semibold,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    fontFamily: Typography.family.regular,
  },
});
