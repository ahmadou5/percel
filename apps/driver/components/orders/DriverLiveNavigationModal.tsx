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
  ArrowUp,
  CheckCircle,
  Clock,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  MapPin,
  MapPinned,
  Navigation,
  Navigation2,
  RotateCcw,
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

type NavigationStep = {
  instruction: string;
  distanceMeters: number;
  maneuver: 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'u-turn' | 'straight' | 'arrive';
  lat: number;
  lng: number;
};

function isValidCoord(lat: any, lng: any): boolean {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return Number.isFinite(nLat) && Number.isFinite(nLng) && Math.abs(nLat) <= 90 && Math.abs(nLng) <= 180 && (nLat !== 0 || nLng !== 0);
}

function safeCoord(lat: any, lng: any, fallbackLat = 6.5244, fallbackLng = 3.3792): { latitude: number; longitude: number } {
  if (isValidCoord(lat, lng)) {
    return { latitude: Number(lat), longitude: Number(lng) };
  }
  return { latitude: fallbackLat, longitude: fallbackLng };
}

function TurnIcon({ maneuver, size = 28, color = '#FFF' }: { maneuver: string; size?: number; color?: string }) {
  if (maneuver === 'turn-left' || maneuver === 'slight-left') {
    return <CornerUpLeft size={size} color={color} />;
  }
  if (maneuver === 'turn-right' || maneuver === 'slight-right') {
    return <CornerUpRight size={size} color={color} />;
  }
  if (maneuver === 'u-turn') {
    return <RotateCcw size={size} color={color} />;
  }
  if (maneuver === 'arrive') {
    return <CheckCircle size={size} color={color} />;
  }
  return <ArrowUp size={size} color={color} />;
}

function SettledMarker({
  coordinate,
  anchor,
  children,
  tracksViewChanges = false,
}: {
  coordinate: { latitude: number; longitude: number };
  anchor: { x: number; y: number };
  children: React.ReactNode;
  tracksViewChanges?: boolean;
}) {
  if (!Marker || !isValidCoord(coordinate?.latitude, coordinate?.longitude)) {
    return null;
  }
  return (
    <Marker coordinate={coordinate} anchor={anchor} tracksViewChanges={tracksViewChanges}>
      {children}
    </Marker>
  );
}

class MapErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn('[DriverLiveNavigationModal] Native map error captured:', error?.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

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
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<{ distanceKm: number | null; durationMin: number | null }>({
    distanceKm: null,
    durationMin: null,
  });
  const lastFetchedLocation = useRef<{ lat: number; lng: number } | null>(null);
  const prevDriverPoint = useRef<{ latitude: number; longitude: number } | null>(null);

  const pickup = useMemo(
    () => safeCoord(order?.pickupLat, order?.pickupLng, 6.5244, 3.3792),
    [order?.pickupLat, order?.pickupLng],
  );

  const dest = useMemo(
    () => safeCoord(order?.deliveryLat, order?.deliveryLng, pickup.latitude, pickup.longitude),
    [order?.deliveryLat, order?.deliveryLng, pickup],
  );

  const isHeadingToPickup = order?.status === 'CREATED' || order?.status === 'ACCEPTED';
  const targetLocation = isHeadingToPickup ? pickup : dest;
  const targetAddress = (isHeadingToPickup ? order?.pickupFormattedAddress : order?.deliveryFormattedAddress) || 'Destination';
  const targetLabel = isHeadingToPickup ? 'PICKUP LOCATION' : 'DELIVERY DESTINATION';

  const driverPoint = useMemo(() => {
    if (currentLocation && isValidCoord(currentLocation.lat, currentLocation.lng)) {
      return { latitude: Number(currentLocation.lat), longitude: Number(currentLocation.lng) };
    }
    return pickup;
  }, [currentLocation, pickup]);

  // Stable initial region computed ONCE to prevent continuous map flickering/camera fighting
  const initialRegionRef = useRef<any>(null);
  if (!initialRegionRef.current) {
    const midLat = (pickup.latitude + dest.latitude) / 2;
    const midLng = (pickup.longitude + dest.longitude) / 2;
    initialRegionRef.current = {
      latitude: Number.isFinite(midLat) ? midLat : 6.5244,
      longitude: Number.isFinite(midLng) ? midLng : 3.3792,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
  }

  // Fetch or re-route whenever driver moves significantly (> 100m)
  useEffect(() => {
    if (!visible) return;

    const driverLat = driverPoint.latitude;
    const driverLng = driverPoint.longitude;

    if (!isValidCoord(driverLat, driverLng) || !isValidCoord(targetLocation.latitude, targetLocation.longitude)) {
      return;
    }

    const last = lastFetchedLocation.current;
    if (last) {
      const distKm = Math.hypot(driverLat - last.lat, driverLng - last.lng) * 111;
      if (distKm < 0.1 && routeCoordinates.length > 0) {
        return;
      }
    }

    lastFetchedLocation.current = { lat: driverLat, lng: driverLng };

    let isMounted = true;
    api.post<{ data: { route?: Array<{ latitude: number; longitude: number }>; distanceKm?: number; durationMin?: number; steps?: NavigationStep[] } | Array<{ latitude: number; longitude: number }> }>('/api/v1/orders/directions', {
      originLat: driverLat,
      originLng: driverLng,
      destLat: targetLocation.latitude,
      destLng: targetLocation.longitude,
    }).then((res) => {
      if (!isMounted) return;
      const rawData = res.data?.data;
      if (Array.isArray(rawData)) {
        setRouteCoordinates(rawData.filter(p => isValidCoord(p?.latitude, p?.longitude)));
      } else if (rawData && typeof rawData === 'object') {
        if (Array.isArray(rawData.route)) {
          setRouteCoordinates(rawData.route.filter(p => isValidCoord(p?.latitude, p?.longitude)));
        }
        if (Array.isArray(rawData.steps) && rawData.steps.length > 0) {
          setNavigationSteps(rawData.steps);
        }
        if (typeof rawData.distanceKm === 'number' && typeof rawData.durationMin === 'number') {
          setLiveMetrics({ distanceKm: rawData.distanceKm, durationMin: rawData.durationMin });
        }
      }
    }).catch(() => {
      if (isMounted) {
        setRouteCoordinates([driverPoint, pickup, dest]);
      }
    });

    return () => { isMounted = false; };
  }, [visible, driverPoint.latitude, driverPoint.longitude, targetLocation.latitude, targetLocation.longitude, pickup, dest]);

  // Dynamic Turn-by-Turn step active calculation
  const activeStep = useMemo(() => {
    if (!navigationSteps.length) {
      return {
        instruction: `Proceed towards ${targetAddress.split(',')[0]}`,
        distanceMeters: Math.round((liveMetrics.distanceKm ?? order?.distanceKm ?? 1) * 1000),
        maneuver: 'straight' as const,
      };
    }

    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < navigationSteps.length; i++) {
      const s = navigationSteps[i];
      const dist = Math.hypot(driverPoint.latitude - s.lat, driverPoint.longitude - s.lng) * 111000;
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const currentStep = navigationSteps[closestIndex];
    const distToStep = Math.round(minDistance > 50000 ? currentStep.distanceMeters : minDistance);

    return {
      instruction: currentStep.instruction || `Proceed towards ${targetAddress.split(',')[0]}`,
      distanceMeters: Math.max(10, distToStep),
      maneuver: currentStep.maneuver || 'straight',
    };
  }, [navigationSteps, driverPoint.latitude, driverPoint.longitude, targetAddress, liveMetrics.distanceKm, order?.distanceKm]);

  // Center / Fit camera to show driver, pickup, and destination on open
  const handleRecenter = () => {
    try {
      const pts = [driverPoint, pickup, dest].filter(p => isValidCoord(p?.latitude, p?.longitude));
      if (pts.length >= 2) {
        mapRef.current?.fitToCoordinates(pts, {
          edgePadding: { top: insets.top + 160, right: 60, bottom: insets.bottom + 220, left: 60 },
          animated: true,
        });
      }
    } catch (err) {
      console.warn('[DriverLiveNavigationModal] fitToCoordinates failed:', err);
    }
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => handleRecenter(), 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Smoothly follow driver when location updates without resetting region
  useEffect(() => {
    if (!visible || !driverPoint || !isValidCoord(driverPoint.latitude, driverPoint.longitude)) return;
    const prev = prevDriverPoint.current;
    if (!prev) {
      prevDriverPoint.current = driverPoint;
      return;
    }
    const dist = Math.hypot(driverPoint.latitude - prev.latitude, driverPoint.longitude - prev.longitude);
    if (dist > 0.0002) {
      prevDriverPoint.current = driverPoint;
      try {
        mapRef.current?.animateCamera({ center: driverPoint }, { duration: 1000 });
      } catch (err) {
        console.warn('[DriverLiveNavigationModal] animateCamera failed:', err);
      }
    }
  }, [visible, driverPoint.latitude, driverPoint.longitude]);

  const validPolyline = useMemo(() => {
    const pts = routeCoordinates.length > 1 ? routeCoordinates : [driverPoint, pickup, dest];
    return pts.filter(p => isValidCoord(p?.latitude, p?.longitude));
  }, [routeCoordinates, driverPoint, pickup, dest]);

  const mapFallback = (
    <View style={styles.fallbackCenter}>
      <Navigation size={48} color={palette.primary} />
      <Text style={[styles.fallbackTitle, { color: palette.text }]}>Full-Screen GPS Navigation</Text>
      <Text style={[styles.fallbackSub, { color: palette.textSecondary }]}>
        Live navigation mode is active. Drive safely to {targetAddress}.
      </Text>
    </View>
  );

  const canRenderNativeMap = hasNativeMaps && Boolean(MapView) && Boolean(Marker) && Boolean(Polyline);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
        {canRenderNativeMap ? (
          <MapErrorBoundary fallback={mapFallback}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={initialRegionRef.current}
              customMapStyle={isLightTheme ? LIGHT_MAP_STYLE : DARK_MAP_STYLE}
            >
              {/* Driver Pulse Marker */}
              <SettledMarker coordinate={driverPoint} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={styles.driverMarkerOuter}>
                  <View style={[styles.driverMarkerPulse, { backgroundColor: hexToRgba(palette.primary, 0.25) }]} />
                  <View style={[styles.driverMarkerCore, { backgroundColor: palette.primary }]}>
                    <Navigation2 size={16} color="#FFF" style={{ transform: [{ rotate: '45deg' }] }} />
                  </View>
                </View>
              </SettledMarker>

              {/* Pickup Location Marker (Green) */}
              <SettledMarker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={[styles.targetPin, { backgroundColor: '#30D158' }]}>
                  <MapPin size={18} color="#FFF" />
                </View>
              </SettledMarker>

              {/* Delivery Destination Marker (Red/Primary) */}
              <SettledMarker coordinate={dest} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={[styles.targetPin, { backgroundColor: palette.primary }]}>
                  <MapPinned size={18} color="#FFF" />
                </View>
              </SettledMarker>

              {/* Polyline Navigation Route */}
              {validPolyline.length > 1 ? (
                <Polyline
                  coordinates={validPolyline}
                  strokeColor={palette.primary}
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
            </MapView>
          </MapErrorBoundary>
        ) : mapFallback}

        {/* Top Real Turn-by-Turn Instruction Banner */}
        <View style={[styles.topBanner, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={[styles.tbtCard, { backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.12)' }]}>
            <View style={[styles.tbtIconBox, { backgroundColor: palette.primary }]}>
              <TurnIcon maneuver={activeStep.maneuver} size={26} color="#FFF" />
            </View>
            <View style={styles.tbtTextWrap}>
              <Text style={styles.tbtHeader}>
                In {activeStep.distanceMeters < 1000 ? `${activeStep.distanceMeters}m` : `${(activeStep.distanceMeters / 1000).toFixed(1)}km`}, {activeStep.instruction}
              </Text>
              <Text style={styles.tbtSub} numberOfLines={1}>
                Target: {targetAddress}
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
              <Text style={[styles.statVal, { color: palette.text }]}>{(liveMetrics.distanceKm ?? order.distanceKm).toFixed(1)} km</Text>
              <Text style={[styles.statLbl, { color: palette.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: palette.bg }]}>
              <Clock size={14} color="#FF9500" />
              <Text style={[styles.statVal, { color: palette.text }]}>{liveMetrics.durationMin ?? order.estimatedDurationMin} min</Text>
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
