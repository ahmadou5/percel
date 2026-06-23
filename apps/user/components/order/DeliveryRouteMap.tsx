import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Navigation, Truck, MapPin } from 'lucide-react-native';

import { Colors } from '@/constants/palette';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { TrackingLocation } from '@/hooks/useLiveTracking';
import { useAppPalette } from '@/lib/theme';

type Props = {
  driverLocation: TrackingLocation | null;
  destinationLocation: TrackingLocation;
  routeCoordinates: TrackingLocation[];
};

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

/** Pulsing ring that radiates outward from the driver marker to signal live tracking */
function PulseRing({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.4,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          borderColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

export function DeliveryRouteMap({ driverLocation, destinationLocation, routeCoordinates }: Props) {
  const palette = useAppPalette();
  const mapRef = useRef<MapView>(null);
  // Track whether the user has manually moved the map so we don't fight them
  const userInteracted = useRef(false);
  const prevDriverLocation = useRef<TrackingLocation | null>(null);

  const points = useMemo(
    () => (driverLocation ? [driverLocation, destinationLocation] : [destinationLocation]),
    [destinationLocation, driverLocation],
  );
  const initialRegion = useMemo(() => getRegion(points), [points]); // stable for initialRegion
  const route = routeCoordinates.length ? routeCoordinates : driverLocation ? [driverLocation, destinationLocation] : [];

  // Smoothly re-center on driver when their location changes, but only if user hasn't
  // manually dragged the map away.
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
      // Always center on first fix
      mapRef.current?.animateToRegion(
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800,
      );
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
  }, [driverLocation]);

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
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        mapType="standard"
        showsCompass={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        onPanDrag={() => {
          // User is manually navigating — stop auto-following
          userInteracted.current = true;
        }}
      >
        {/* Route polyline */}
        {route.length > 1 ? (
          <Polyline
            coordinates={route}
            strokeColor={palette.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            lineDashPattern={undefined}
          />
        ) : null}

        {/* Driver / vehicle marker */}
        {driverLocation ? (
          <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.vehicleMarkerWrap}>
              {/* Pulsing live-location ring */}
              <PulseRing color={palette.primary} />
              {/* Vehicle icon bubble */}
              <View style={[styles.vehicleBubble, { backgroundColor: palette.primary, borderColor: palette.card }]}>
                <Truck size={18} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>
          </Marker>
        ) : null}

        {/* Destination pin */}
        <Marker coordinate={destinationLocation} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <View style={styles.destinationWrap}>
            <View style={[styles.destinationBubble, { backgroundColor: palette.card, borderColor: palette.primary }]}>
              <MapPin size={14} color={palette.primary} strokeWidth={2.5} />
            </View>
            <View style={[styles.destinationStem, { backgroundColor: palette.primary }]} />
          </View>
        </Marker>
      </MapView>

      {/* Locate driver FAB */}
      {driverLocation ? (
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
      ) : null}

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
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
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
  },
  // Destination pin
  destinationWrap: {
    alignItems: 'center',
  },
  destinationBubble: {
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
  destinationStem: {
    width: 3,
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
});
