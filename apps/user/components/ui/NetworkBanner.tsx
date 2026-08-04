import React, { useEffect, useRef, useState } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { Wifi, WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useAppPalette } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

export function NetworkBanner() {
  const netInfo = useNetInfo();
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const wasOffline = useRef(false);

  const [showConnectedToast, setShowConnectedToast] = useState(false);

  useEffect(() => {
    if (isOffline) {
      if (!wasOffline.current) {
        wasOffline.current = true;
        void haptics.warning();
      }
      setShowConnectedToast(false);
    } else if (wasOffline.current && netInfo.isConnected === true) {
      wasOffline.current = false;
      setShowConnectedToast(true);
      void haptics.success();

      const timer = setTimeout(() => {
        setShowConnectedToast(false);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isOffline, netInfo.isConnected]);

  if (isOffline) {
    return (
      <Animated.View
        entering={FadeInUp.duration(300)}
        exiting={FadeOutUp.duration(250)}
        style={[
          styles.container,
          {
            top: Math.max(insets.top, 12),
            backgroundColor: '#EF4444', // Red warning banner
          },
        ]}
      >
        <View style={styles.contentRow}>
          <View style={styles.iconCircle}>
            <WifiOff size={18} color="#FFFFFF" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.titleText}>Internet Disconnected</Text>
            <Text style={styles.subtitleText}>Check your Wi-Fi or cellular data connection.</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (showConnectedToast) {
    return (
      <Animated.View
        entering={FadeInUp.duration(300)}
        exiting={FadeOutUp.duration(250)}
        style={[
          styles.container,
          {
            top: Math.max(insets.top, 12),
            backgroundColor: '#10B981', // Green success banner
          },
        ]}
      >
        <View style={styles.contentRow}>
          <View style={styles.iconCircle}>
            <Wifi size={18} color="#FFFFFF" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.titleText}>Internet Connected</Text>
            <Text style={styles.subtitleText}>You are back online.</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
    marginTop: 1,
  },
});
