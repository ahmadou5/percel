import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CornerUpLeft,
  Crosshair,
  MapPin,
  MapPinned,
  Navigation,
  Navigation2,
  X,
} from 'lucide-react-native';

import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { api } from '@/lib/api';
import { isLight, useAppPalette, hexToRgba } from '@/lib/theme';
import type { DriverOrder } from '@/lib/types';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;
let hasNativeMaps = false;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default || Maps;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  hasNativeMaps = Boolean(MapView);
} catch {
  hasNativeMaps = false;
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#12131A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E8E93' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#12131A' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1C1D24' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2C2D35' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F1E36' }] },
];

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#F8F9FC' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#636366' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E5E5EA' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C9DFFA' }] },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  order: DriverOrder;
  currentLocation: { lat: number; lng: number } | null;
  advanceLabel?: string | null;
  onAdvance?: () => void;
  isAdvancing?: boolean;
};

export function DriverLiveNavigationModal({
  visible,
  onClose,
  order,
  currentLocation,
  advanceLabel,
  onAdvance,
  isAdvancing,
}: Props) {
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const isLightTheme = isLight(palette.bg);

  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const lastFetchedLocation = useRef<{ lat: number; lng: number } | null>(null);

  const pickup = useMemo(() => ({
    latitude: Number(order.pickupLat),
    longitude: Number(order.pickupLng),
  }), [order.pickupLat, order.pickupLng]);

  const dest = useMemo(() => ({
    latitude: Number(order.deliveryLat),
    longitude: Number(order.deliveryLng),
  }), [order.deliveryLat, order.deliveryLng]);

  const isHeadingToPickup = order.status === 'CREATED' || order.status === 'ACCEPTED';
  const targetLocation = isHeadingToPickup ? pickup : dest;
  const targetAddress = isHeadingToPickup ? order.pickupFormattedAddress : order.deliveryFormattedAddress;
  const targetLabel = isHeadingToPickup ? 'PICKUP LOCATION' : 'DELIVERY DESTINATION';

  const driverPoint = useMemo(() => {
    if (currentLocation && currentLocation.lat !== 0 && currentLocation.lng !== 0) {
      return { latitude: currentLocation.lat, longitude: currentLocation.lng };
    }
    return pickup;
  }, [currentLocation, pickup]);

  // Fetch or re-route whenever driver moves significantly (> 40m)
  useEffect(() => {
    if (!visible) return;

    const driverLat = driverPoint.latitude;
    const driverLng = driverPoint.longitude;

    const last = lastFetchedLocation.current;
    if (last) {
      const distKm = Math.hypot(driverLat - last.lat, driverLng - last.lng) * 111;
      if (distKm < 0.04 && routeCoordinates.length > 0) {
        return;
      }
    }

    lastFetchedLocation.current = { lat: driverLat, lng: driverLng };

    let isMounted = true;
    setLoadingRoute(true);
    api.post<{ data: Array<{ latitude: number; longitude: number }> }>('/api/v1/orders/directions', {
      originLat: driverLat,
      originLng: driverLng,
      destLat: targetLocation.latitude,
      destLng: targetLocation.longitude,
    }).then((res) => {
      if (isMounted && res.data?.data && Array.isArray(res.data.data)) {
        setRouteCoordinates(res.data.data);
      }
    }).catch(() => {
      if (isMounted) {
        setRouteCoordinates([driverPoint, targetLocation]);
      }
    }).finally(() => {
      if (isMounted) setLoadingRoute(false);
    });

    return () => { isMounted = false; };
  }, [visible, driverPoint.latitude, driverPoint.longitude, targetLocation.latitude, targetLocation.longitude]);

  // Center / Fit camera to show driver and target
  const handleRecenter = () => {
    mapRef.current?.fitToCoordinates([driverPoint, targetLocation], {
      edgePadding: { top: insets.top + 160, right: 60, bottom: insets.bottom + 220, left: 60 },
      animated: true,
    });
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => handleRecenter(), 400);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
        {hasNativeMaps && MapView ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: (driverPoint.latitude + targetLocation.latitude) / 2,
              longitude: (driverPoint.longitude + targetLocation.longitude) / 2,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }}
            customMapStyle={isLightTheme ? LIGHT_MAP_STYLE : DARK_MAP_STYLE}
          >
            {/* Driver Pulse Marker */}
            <Marker coordinate={driverPoint} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.driverMarkerOuter}>
                <View style={[styles.driverMarkerPulse, { backgroundColor: hexToRgba(palette.primary, 0.25) }]} />
                <View style={[styles.driverMarkerCore, { backgroundColor: palette.primary }]}>
                  <Navigation2 size={16} color="#FFF" style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
              </View>
            </Marker>

            {/* Target Destination Marker */}
            <Marker coordinate={targetLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={[styles.targetPin, { backgroundColor: isHeadingToPickup ? '#30D158' : palette.primary }]}>
                {isHeadingToPickup ? <MapPin size={18} color="#FFF" /> : <MapPinned size={18} color="#FFF" />}
              </View>
            </Marker>

            {/* Polyline Navigation Route */}
            {(routeCoordinates.length > 1 || true) && (
              <Polyline
                coordinates={routeCoordinates.length > 1 ? routeCoordinates : [driverPoint, targetLocation]}
                strokeColor={palette.primary}
                strokeWidth={6}
                lineDashPattern={[0]}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.fallbackCenter}>
            <Navigation size={48} color={palette.primary} />
            <Text style={[styles.fallbackTitle, { color: palette.text }]}>Full-Screen GPS Navigation</Text>
            <Text style={[styles.fallbackSub, { color: palette.textSecondary }]}>
              Live navigation mode is active. Drive safely to {targetAddress}.
            </Text>
          </View>
        )}

        {/* Top Turn-by-Turn Instruction Banner */}
        <View style={[styles.topBanner, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={[styles.tbtCard, { backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.12)' }]}>
            <View style={[styles.tbtIconBox, { backgroundColor: palette.primary }]}>
              <CornerUpLeft size={28} color="#FFF" />
            </View>
            <View style={styles.tbtTextWrap}>
              <Text style={styles.tbtHeader}>In 150m, proceed straight</Text>
              <Text style={styles.tbtSub} numberOfLines={1}>
                towards {targetAddress.split(',')[0]}
              </Text>
            </View>
          </View>

          {/* Quick controls row */}
          <View style={styles.topControlRow}>
            <Pressable onPress={onClose} style={[styles.topRoundBtn, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <X size={20} color="#FFF" />
            </Pressable>
            <View style={[styles.statusPill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <View style={[styles.liveDot, { backgroundColor: isHeadingToPickup ? '#30D158' : palette.primary }]} />
              <Text style={styles.statusPillText}>{targetLabel}</Text>
            </View>
            <Pressable onPress={handleRecenter} style={[styles.topRoundBtn, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <Crosshair size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>

        {/* Bottom Turn-by-Turn Control Panel */}
        <View style={[styles.bottomPanel, { backgroundColor: palette.card, borderColor: palette.border, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.bottomHandle} />
          
          <View style={styles.navDetailRow}>
            <View style={styles.destIconBox}>
              {isHeadingToPickup ? <MapPin size={22} color="#30D158" /> : <MapPinned size={22} color={palette.primary} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.destTag, { color: palette.textSecondary }]}>{targetLabel}</Text>
              <Text style={[styles.destAddress, { color: palette.text }]} numberOfLines={2}>
                {targetAddress}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: palette.bg }]}>
              <MapPin size={14} color={palette.primary} />
              <Text style={[styles.statVal, { color: palette.text }]}>{order.distanceKm.toFixed(1)} km</Text>
              <Text style={[styles.statLbl, { color: palette.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: palette.bg }]}>
              <Clock size={14} color="#FF9500" />
              <Text style={[styles.statVal, { color: palette.text }]}>{order.estimatedDurationMin} min</Text>
              <Text style={[styles.statLbl, { color: palette.textSecondary }]}>Est. Time</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: palette.bg }]}>
              <CheckCircle size={14} color="#30D158" />
              <Text style={[styles.statVal, { color: palette.text }]}>₦{order.price.toLocaleString()}</Text>
              <Text style={[styles.statLbl, { color: palette.textSecondary }]}>Payout</Text>
            </View>
          </View>

          {advanceLabel && onAdvance ? (
            <Pressable
              onPress={onAdvance}
              disabled={isAdvancing}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: palette.primary, opacity: pressed || isAdvancing ? 0.75 : 1 },
              ]}
            >
              {isAdvancing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Navigation size={20} color="#FFF" />
                  <Text style={styles.actionBtnText}>{advanceLabel}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallbackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  fallbackTitle: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  fallbackSub: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
  },
  driverMarkerOuter: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarkerPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  driverMarkerCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  targetPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
  },
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  tbtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tbtIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbtTextWrap: {
    flex: 1,
    gap: 2,
  },
  tbtHeader: {
    color: '#FFF',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  tbtSub: {
    color: '#8E8E93',
    fontSize: Typography.xs,
    fontFamily: Typography.family.medium,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    color: '#FFF',
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.5,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  bottomHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    opacity: 0.4,
    alignSelf: 'center',
  },
  navDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  destIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTag: {
    fontSize: 10,
    fontFamily: Typography.family.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  destAddress: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  statLbl: {
    fontSize: 10,
    fontFamily: Typography.family.medium,
  },
  actionBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
});
