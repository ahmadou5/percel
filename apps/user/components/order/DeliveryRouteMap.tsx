import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

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

export function DeliveryRouteMap({ driverLocation, destinationLocation, routeCoordinates }: Props) {
  const palette = useAppPalette();
  const mapRef = useRef<MapView>(null);
  const points = useMemo(
    () => (driverLocation ? [driverLocation, destinationLocation] : [destinationLocation]),
    [destinationLocation, driverLocation],
  );
  const region = useMemo(() => getRegion(points), [points]);
  const route = routeCoordinates.length ? routeCoordinates : driverLocation ? [driverLocation, destinationLocation] : [];

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 600);
  }, [region]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        customMapStyle={DARK_MAP_STYLE}
        mapType="standard"
        showsCompass={false}
        showsUserLocation={false}
        toolbarEnabled={false}
      >
        {route.length > 1 ? (
          <Polyline coordinates={route} strokeColor={palette.primary} strokeWidth={5} lineCap="round" lineJoin="round" />
        ) : null}
        {driverLocation ? (
          <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.driverMarker, { backgroundColor: palette.primary, borderColor: palette.card }]}>
              <View style={[styles.driverMarkerCore, { backgroundColor: Colors.dark.text }]} />
            </View>
          </Marker>
        ) : null}
        <Marker coordinate={destinationLocation} anchor={{ x: 0.5, y: 1 }}>
          <View style={[styles.destinationMarker, { backgroundColor: palette.card, borderColor: palette.primary }]}>
            <View style={[styles.destinationMarkerCore, { backgroundColor: palette.primary }]} />
          </View>
        </Marker>
      </MapView>
      {!driverLocation ? (
        <View style={[styles.locating, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.locatingText, { color: palette.text }]}>Locating driver...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  driverMarker: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  driverMarkerCore: { width: 14, height: 14, borderRadius: 7 },
  destinationMarker: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  destinationMarkerCore: { width: 12, height: 12, borderRadius: 6 },
  locating: { position: 'absolute', top: '45%', alignSelf: 'center', borderRadius: 999, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  locatingText: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
});
