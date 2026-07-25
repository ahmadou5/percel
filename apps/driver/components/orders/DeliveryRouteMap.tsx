import { Navigation, Truck, MapPin } from 'lucide-react-native';
import React, { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { isLight, useAppPalette } from '@/lib/theme';

let MapView: any = null;
let Circle: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;
type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
let hasNativeMaps = false;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default || Maps;
  Circle = Maps.Circle;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  hasNativeMaps = Boolean(MapView);
} catch {
  hasNativeMaps = false;
}

export type TrackingLocation = {
  latitude: number;
  longitude: number;
};

type Props = {
  driverLocation: TrackingLocation | null;
  driverName?: string;
  driverAvatarUrl?: string | null;
  originLocation: TrackingLocation;
  destinationLocation: TrackingLocation;
  routeCoordinates: TrackingLocation[];
};

class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('[DeliveryRouteMap] Native map error captured:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function MapFallbackView() {
  const palette = useAppPalette();
  return (
    <View style={[styles.fallbackContainer, { backgroundColor: palette.card }]}>
      <Navigation size={28} color={palette.primary} />
      <Text style={[styles.fallbackTitle, { color: palette.text }]}>Live Route Navigation</Text>
      <Text style={[styles.fallbackSub, { color: palette.textSecondary }]}>
        Interactive Google Maps is available in native preview/release builds.
      </Text>
    </View>
  );
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: Colors.dark.bg }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: Colors.dark.bg }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: Colors.dark.border }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.textSecondary }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.text }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.textSecondary }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: Colors.dark.bg }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.textSecondary }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: Colors.dark.bg }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: Colors.dark.card }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.textSecondary }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: Colors.dark.border }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: Colors.dark.border }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: Colors.dark.border }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.textSecondary }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.textSecondary }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: Colors.light.text }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: Colors.dark.border }] },
];

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: Colors.light.bg }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: Colors.light.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: Colors.light.bg }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: Colors.light.border }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.textSecondary }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.text }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.textSecondary }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#D2F1D2' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.textSecondary }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: Colors.light.bg }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: Colors.light.card }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.textSecondary }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: Colors.light.border }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: Colors.light.border }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: Colors.light.border }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.textSecondary }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.textSecondary }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#A9C4EB' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: Colors.light.border }] },
];

function getRegion(points: TrackingLocation[]): Region {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.04),
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.04),
  };
}

/** Get initials for fallback driver name display */
function getInitials(name?: string) {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name[0] ?? '').toUpperCase();
}

/**
 * Converts a 6-digit hex color + alpha into an rgba() string suitable for
 * react-native-maps Circle fill/stroke colors.
 */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(124,58,237,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Drives a 0-99 phase counter at ~50 fps (20 ms tick).
 * Two full ring cycles complete every ~2 s.
 * Consumers stagger ring offsets to get the ripple effect.
 */
function usePulsePhase() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 100), 20);
    return () => clearInterval(id);
  }, []);
  return phase;
}

/** Compute radius (meters) and fill-opacity for one ripple ring at a given phase offset. */
function ringProps(phase: number, offset: number, maxRadius = 130) {
  const t = ((phase + offset) % 100) / 100; // 0 → 1
  return {
    radius: 15 + t * maxRadius,
    opacity: 0.55 * (1 - t),
  };
}

/**
 * Wrapper that keeps tracksViewChanges=true for an initial settle period then
 * switches to false to stop unnecessary re-renders. This prevents the "frozen
 * at 0 size" bug where a marker with tracksViewChanges=false is snapshotted
 * before layout has completed.
 */
function SettledMarker({
  coordinate,
  anchor,
  children,
  alwaysTrack = false,
}: {
  coordinate: { latitude: number; longitude: number };
  anchor: { x: number; y: number };
  children: React.ReactNode;
  alwaysTrack?: boolean;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    if (alwaysTrack) return;
    const timer = setTimeout(() => setTracksViewChanges(false), 600);
    return () => clearTimeout(timer);
  }, [alwaysTrack]);

  return (
    <Marker coordinate={coordinate} anchor={anchor} tracksViewChanges={alwaysTrack || tracksViewChanges}>
      {children}
    </Marker>
  );
}

export function DeliveryRouteMap(props: Props) {
  if (!hasNativeMaps || !MapView) {
    return <MapFallbackView />;
  }

  return (
    <MapErrorBoundary fallback={<MapFallbackView />}>
      <RouteMapContent {...props} />
    </MapErrorBoundary>
  );
}

function RouteMapContent({ driverLocation, driverName, driverAvatarUrl, originLocation, destinationLocation, routeCoordinates }: Props) {
  const palette = useAppPalette();
  const isLightTheme = isLight(palette.bg);
  // Phase counter that drives the native Circle pulse overlays (0-99, cycles ~every 2s)
  const pulsePhase = usePulsePhase();
  const mapRef = useRef<any>(null);
  // Track whether the user has manually moved the map so we don't fight them
  const userInteracted = useRef(false);
  const prevDriverLocation = useRef<TrackingLocation | null>(null);

  const points = useMemo(
    () => {
      const all = [originLocation, destinationLocation];
      if (driverLocation) all.push(driverLocation);
      return all;
    },
    [originLocation, destinationLocation, driverLocation],
  );
  const initialRegion = useMemo(() => getRegion(points), [points]); // stable for initialRegion
  const route = routeCoordinates.length ? routeCoordinates : [originLocation, destinationLocation];

  // Smoothly follow the driver when location changes (unless user interacted)
  useEffect(() => {
    if (!driverLocation) return;

    const prev = prevDriverLocation.current;
    const isFirstFix = !prev;
    const moved =
      prev &&
      (Math.abs(prev.latitude - driverLocation.latitude) > 0.0001 ||
        Math.abs(prev.longitude - driverLocation.longitude) > 0.0001);

    prevDriverLocation.current = driverLocation;

    if (isFirstFix) {
      // Fit to see everything on start
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
        animated: true,
      });
      userInteracted.current = false;
    } else if (moved && !userInteracted.current) {
      // Gently follow the driver when they move
      mapRef.current?.animateCamera(
        {
          center: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
        },
        { duration: 1200 },
      );
    }
  }, [driverLocation, points]);

  const handleLocateDriver = () => {
    userInteracted.current = false;
    if (driverLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        600,
      );
    } else {
      mapRef.current?.fitToCoordinates([originLocation, destinationLocation], {
        edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
        animated: true,
      });
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={isLightTheme ? LIGHT_MAP_STYLE : DARK_MAP_STYLE}
        mapType="standard"
        showsCompass={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        onPanDrag={() => {
          // User is manually navigating — stop auto-following
          userInteracted.current = true;
        }}
      >
        {/* Route polyline from Origin to Destination */}
        {route.length > 1 ? (
          <Polyline
            coordinates={route}
            strokeColor={palette.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {/* ── Pulse rings – rendered as native Circle overlays so they actually animate ── */}
        {/* Origin ripples (green, 2 staggered rings) */}
        {[0, 50].map((offset, i) => {
          const rp = ringProps(pulsePhase, offset, 110);
          return (
            <Circle
              key={`origin-ring-${i}`}
              center={originLocation}
              radius={rp.radius}
              fillColor={hexToRgba('#10B981', rp.opacity)}
              strokeWidth={0}
            />
          );
        })}

        {/* Destination ripples (primary color, 2 staggered rings) */}
        {[0, 50].map((offset, i) => {
          const rp = ringProps(pulsePhase, offset, 110);
          return (
            <Circle
              key={`dest-ring-${i}`}
              center={destinationLocation}
              radius={rp.radius}
              fillColor={hexToRgba(palette.primary, rp.opacity)}
              strokeWidth={0}
            />
          );
        })}

        {/* Driver ripples (primary color, 3 staggered rings for stronger effect) */}
        {driverLocation
          ? [0, 33, 66].map((offset, i) => {
              const rp = ringProps(pulsePhase, offset, 140);
              return (
                <Circle
                  key={`driver-ring-${i}`}
                  center={driverLocation}
                  radius={rp.radius}
                  fillColor={hexToRgba(palette.primary, rp.opacity)}
                  strokeWidth={0}
                />
              );
            })
          : null}

        {/* Origin Pin */}
        <SettledMarker coordinate={originLocation} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.pinWrap}>
            <View style={styles.pinBubble_origin}>
              <MapPin size={14} color="#10B981" strokeWidth={2.5} />
            </View>
            <View style={[styles.pinStem, { backgroundColor: '#10B981' }]} />
          </View>
        </SettledMarker>

        {/* Destination pin */}
        <SettledMarker coordinate={destinationLocation} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.pinWrap}>
            <View style={[styles.pinBubble, { backgroundColor: palette.card, borderColor: palette.primary }]}>
              <MapPin size={14} color={palette.primary} strokeWidth={2.5} />
            </View>
            <View style={[styles.pinStem, { backgroundColor: palette.primary }]} />
          </View>
        </SettledMarker>

        {/* Driver marker – no animation inside the marker; rings are Circle overlays above */}
        {driverLocation ? (
          <SettledMarker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} alwaysTrack>
            <View style={styles.vehicleMarkerWrap}>
              <View style={[styles.vehicleBubble, { backgroundColor: palette.card, borderColor: palette.primary }]}>
                {driverAvatarUrl &&
                driverAvatarUrl.trim() !== '' &&
                driverAvatarUrl !== 'null' &&
                (driverAvatarUrl.startsWith('http://') ||
                  driverAvatarUrl.startsWith('https://') ||
                  driverAvatarUrl.startsWith('data:')) ? (
                  <Image source={{ uri: driverAvatarUrl }} style={styles.driverAvatar} />
                ) : (
                  <Text style={[styles.driverInitials, { color: palette.primary }]}>
                    {getInitials(driverName)}
                  </Text>
                )}
              </View>
            </View>
          </SettledMarker>
        ) : null}
      </MapView>

      {/* Locate driver FAB */}
      <Pressable
        onPress={handleLocateDriver}
        style={({ pressed }) => [
          styles.locateButton,
          { backgroundColor: palette.card, borderColor: palette.border },
          pressed ? { opacity: 0.85 } : null,
        ]}
      >
        <Navigation size={20} color={palette.primary} />
      </Pressable>

      {/* Searching overlay */}
      {!driverLocation ? (
        <View style={[styles.locating, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Truck size={14} color={palette.primary} />
          <Text style={[styles.locatingText, { color: palette.text }]}>Locating driver…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Vehicle marker
  vehicleMarkerWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {}, // kept for reference; no longer rendered — pulse is handled by Circle overlays
  bubbleContainer: {}, // no longer used

  vehicleBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  driverAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  driverInitials: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
  // Pin markers (origin & destination share the same shape)
  pinWrap: {
    alignItems: 'center',
  },
  pinBubble_origin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinStem: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginTop: -1,
  },
  // Locating banner
  locating: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locatingText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  // Locate FAB
  locateButton: {
    position: 'absolute',
    right: 16,
    top: 140,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  fallbackTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
    marginTop: 4,
  },
  fallbackSub: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.medium,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 16,
  },
});
