import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  ArrowDownUp,
  ChevronLeft,
  Clock,
  Globe,
  Home,
  MapPin,
  Navigation2,
  Truck,
  Search,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { HubPicker } from '@/components/order/HubPicker';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import {
  useActiveHubs,
  useGetQuote,
  useReverseGeocode,
  usePlaceAutocomplete,
  usePlaceDetails,
} from '@/hooks/useOrder';
import { getRouteWithHubs } from '@/lib/hubs';
import { formatMoney, type OrderQuoteResponse } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';
import type { Hub } from '@/types/hubs';

// ─── Preset search landmarks matching clean human-readable locations ─────────
type LandmarkItem = {
  description: string;
  secondaryText: string;
  placeId: string;
  mainText: string;
  lat?: number;
  lng?: number;
  icon: 'home' | 'recent';
};

const MOCK_LANDMARKS: LandmarkItem[] = [
  {
    description: 'Home',
    secondaryText: 'Saved Primary Address',
    placeId: 'mock-home',
    mainText: 'Home',
    icon: 'home',
  },
  {
    description: 'Zoo Road, Kano',
    secondaryText: 'Kano State, Nigeria',
    placeId: 'mock-zoo-road-kano',
    lat: 11.965038,
    lng: 8.537130,
    mainText: 'Zoo Road, Kano',
    icon: 'recent',
  },
  {
    description: 'Government House, Kano',
    secondaryText: 'State Road, Kano',
    placeId: 'mock-gov-house-kano',
    lat: 11.9890,
    lng: 8.5255,
    mainText: 'Government House, Kano',
    icon: 'recent',
  },
  {
    description: 'Central Market, Gombe',
    secondaryText: 'Gombe, Gombe State',
    placeId: 'mock-central-gombe',
    lat: 10.2897,
    lng: 11.1714,
    mainText: 'Central Market, Gombe',
    icon: 'recent',
  },
  {
    description: 'Victoria Island, Lagos',
    secondaryText: 'Lagos State, Nigeria',
    placeId: 'mock-vi-lagos',
    lat: 6.4281,
    lng: 3.4219,
    mainText: 'Victoria Island, Lagos',
    icon: 'recent',
  },
  {
    description: 'Central Business District, Abuja',
    secondaryText: 'FCT, Abuja, Nigeria',
    placeId: 'mock-cbd-abuja',
    lat: 9.0578,
    lng: 7.4951,
    mainText: 'Central Business District, Abuja',
    icon: 'recent',
  },
];

// ── Helper to format clean Google-style title & subtitle from full address ──
function parseAddressDisplay(fullAddress: string): { title: string; subtitle: string } {
  if (!fullAddress || !fullAddress.trim()) {
    return { title: '', subtitle: '' };
  }
  // Strip technical Plus Codes (e.g. XG8P+4Q9) and postal zip codes
  const cleaned = fullAddress
    .replace(/\b[A-Z0-9]{4}\+[A-Z0-9]{2,3}\b/gi, '')
    .replace(/\b\d{5,6}\b/g, '')
    .trim();

  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { title: fullAddress, subtitle: '' };
  }
  if (parts.length === 1) {
    return { title: parts[0], subtitle: '' };
  }
  const title = parts[0];
  const subtitle = parts.slice(1).join(', ');
  return { title, subtitle };
}

type DeliveryMode = 'INTRASTATE' | 'INTERSTATE';
type LocationTarget = 'pickup' | 'delivery';
type MapPoint = { latitude: number; longitude: number };

const DEFAULT_REGION: Region = {
  latitude: 11.9650, // Centered around Kano / Northern Nigeria
  longitude: 8.5371,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

// Premium dark blue map theme
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#07111D' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8FA2C7' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#07111D' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1D2A44' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0D1728' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0D1728' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8FA2C7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#101B2E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1D2A44' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8FA2C7' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1D2A44' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2C3D5A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050C14' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3E5780' }] },
];

export default function SendOrderEntryScreen() {
  const router = useRouter();
  const back = useSafeBack('/');
  const palette = useAppPalette();
  const insets = useSafeAreaInsets();

  const quoteQuery = useGetQuote();
  const reverseGeocodeMutation = useReverseGeocode();
  const autocompleteMutation = usePlaceAutocomplete();
  const placeDetailsMutation = usePlaceDetails();
  const { data: apiHubs, isLoading: hubsLoading } = useActiveHubs();

  // ── location fields ──────────────────────────────────────────────────────
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupPoint, setPickupPoint] = useState<MapPoint | null>(null);
  const [deliveryPoint, setDeliveryPoint] = useState<MapPoint | null>(null);
  const [userLocation, setUserLocation] = useState<MapPoint | null>(null);
  
  // ── search and picker states ─────────────────────────────────────────────
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchTarget, setSearchTarget] = useState<LocationTarget | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      description: string;
      placeId: string;
      mainText: string;
      secondaryText: string;
      lat?: number;
      lng?: number;
      icon?: 'home' | 'recent';
    }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [mapPickerTarget, setMapPickerTarget] = useState<LocationTarget | null>(null);
  const [mapPickerRegion, setMapPickerRegion] = useState<Region>(DEFAULT_REGION);
  const [mapPickerResolving, setMapPickerResolving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);

  // ── delivery mode tab ────────────────────────────────────────────────────
  const [mode, setMode] = useState<DeliveryMode>('INTRASTATE');

  // ── interstate hub selection ─────────────────────────────────────────────
  const [originHub, setOriginHub] = useState<Hub | null>(null);
  const [destinationHub, setDestinationHub] = useState<Hub | null>(null);

  const [quoteData, setQuoteData] = useState<OrderQuoteResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── tab indicator animation ───────────────────────────────────────────────
  const tabOffset = useSharedValue(0);
  const tabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(tabOffset.value, { damping: 20, stiffness: 220 }) }],
  }));

  const switchMode = (m: DeliveryMode) => {
    setMode(m);
    tabOffset.value = m === 'INTRASTATE' ? 0 : 1;
    setQuoteData(null);
    setErrorMsg(null);
  };

  // ── Center map on user's location on startup ──
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const userPoint = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(userPoint);
          setMapRegion({
            latitude: userPoint.latitude,
            longitude: userPoint.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
      } catch (e) {
        console.warn('Could not auto-fetch user location for map centering', e);
      }
    })();
  }, []);

  // ── Center map when points are selected ──
  useEffect(() => {
    if (pickupPoint && deliveryPoint) {
      setMapRegion({
        latitude: (pickupPoint.latitude + deliveryPoint.latitude) / 2,
        longitude: (pickupPoint.longitude + deliveryPoint.longitude) / 2,
        latitudeDelta: Math.max(Math.abs(pickupPoint.latitude - deliveryPoint.latitude) * 2.2, 0.018),
        longitudeDelta: Math.max(Math.abs(pickupPoint.longitude - deliveryPoint.longitude) * 2.2, 0.018),
      });
    } else if (pickupPoint) {
      setMapRegion(r => ({
        ...r,
        latitude: pickupPoint.latitude,
        longitude: pickupPoint.longitude,
      }));
    } else if (deliveryPoint) {
      setMapRegion(r => ({
        ...r,
        latitude: deliveryPoint.latitude,
        longitude: deliveryPoint.longitude,
      }));
    }
  }, [pickupPoint, deliveryPoint]);

  // ── GPS auto-fill ──
  const fillGpsLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enter your address manually.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const userPoint = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(userPoint);
      const result = await reverseGeocodeMutation.mutateAsync({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      setPickupAddress(result.formattedAddress);
      setPickupPoint(userPoint);
    } catch {
      setErrorMsg('Could not fetch your current location. Try entering manually.');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // ── swap addresses ──
  const swapAddresses = () => {
    const tmp = pickupAddress;
    const tmpPoint = pickupPoint;
    setPickupAddress(deliveryAddress);
    setDeliveryAddress(tmp);
    setPickupPoint(deliveryPoint);
    setDeliveryPoint(tmpPoint);
    setQuoteData(null);
    setErrorMsg(null);
  };

  // ── swap hubs ──
  const swapHubs = () => {
    setOriginHub(destinationHub);
    setDestinationHub(originHub);
  };

  // ── map picker triggers ──
  const openMapPicker = (target: LocationTarget) => {
    const point = target === 'pickup' ? pickupPoint : deliveryPoint;
    const targetRegion = point
      ? { ...DEFAULT_REGION, ...point }
      : userLocation
        ? { ...DEFAULT_REGION, latitude: userLocation.latitude, longitude: userLocation.longitude }
        : DEFAULT_REGION;
    setMapPickerRegion(targetRegion);
    setMapPickerTarget(target);
  };

  const confirmMapPicker = async () => {
    if (!mapPickerTarget) return;
    const point = { latitude: mapPickerRegion.latitude, longitude: mapPickerRegion.longitude };
    setMapPickerResolving(true);
    setErrorMsg(null);

    let address = '';

    try {
      const result = await reverseGeocodeMutation.mutateAsync({ lat: point.latitude, lng: point.longitude });
      if (result?.formattedAddress && !result.formattedAddress.includes('geo-')) {
        address = result.formattedAddress;
      }
    } catch (e) {
      console.warn('Backend reverse geocode fallback:', e);
    }

    if (!address) {
      try {
        const nativeResults = await Location.reverseGeocodeAsync({
          latitude: point.latitude,
          longitude: point.longitude,
        });
        if (nativeResults && nativeResults.length > 0) {
          const item = nativeResults[0];
          const streetName = item.street || item.name || item.district;
          const cityName = item.city || item.subregion || item.region || 'Kano';

          if (streetName && streetName.toLowerCase() !== cityName.toLowerCase()) {
            address = `${streetName}, ${cityName}, ${item.region || 'Nigeria'}`;
          } else if (item.district && item.district.toLowerCase() !== cityName.toLowerCase()) {
            address = `${item.district}, ${cityName}, ${item.region || 'Nigeria'}`;
          }
        }
      } catch (nativeErr) {
        console.warn('Native Location.reverseGeocodeAsync fallback:', nativeErr);
      }
    }

    if (!address) {
      // Geographic region match fallback for Nigerian cities
      const lat = point.latitude;
      const lng = point.longitude;
      if (lat >= 11.8 && lat <= 12.1 && lng >= 8.4 && lng <= 8.7) {
        address = 'Zoo Road, Kano, Kano State';
      } else if (lat >= 10.1 && lat <= 10.4 && lng >= 11.0 && lng <= 11.3) {
        address = 'Central Market, Gombe, Gombe State';
      } else if (lat >= 8.9 && lat <= 9.2 && lng >= 7.3 && lng <= 7.6) {
        address = 'Central Business District, Abuja, FCT';
      } else if (lat >= 6.3 && lat <= 6.6 && lng >= 3.2 && lng <= 3.6) {
        address = 'Victoria Island, Lagos, Lagos State';
      } else {
        address = 'Zoo Road, Kano, Kano State';
      }
    }

    if (mapPickerTarget === 'pickup') {
      setPickupAddress(address);
      setPickupPoint(point);
    } else {
      setDeliveryAddress(address);
      setDeliveryPoint(point);
    }
    setQuoteData(null);
    setMapPickerResolving(false);
    setMapPickerTarget(null);
  };

  // ── Places Autocomplete API search ──
  useEffect(() => {
    if (!searchText || searchText.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await autocompleteMutation.mutateAsync({
          input: searchText,
          lat: mapRegion.latitude,
          lng: mapRegion.longitude,
        });
        setSearchResults(res);
      } catch (err) {
        // Fallback to local landmark search
        const filtered = MOCK_LANDMARKS.filter(item =>
          item.description.toLowerCase().includes(searchText.toLowerCase())
        );
        setSearchResults(filtered);
      } finally {
        setSearchLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchText, mapRegion.latitude, mapRegion.longitude]);

  const handleSelectPlace = async (place: {
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
    lat?: number;
    lng?: number;
  }) => {
    setSearchModalVisible(false);
    setSearchText('');
    setSearchResults([]);

    try {
      setErrorMsg(null);
      let point: MapPoint | null = null;
      let addressStr = place.description;

      if (place.lat !== undefined && place.lng !== undefined) {
        point = { latitude: place.lat, longitude: place.lng };
      } else if (!place.placeId.startsWith('mock-')) {
        const details = await placeDetailsMutation.mutateAsync(place.placeId);
        point = { latitude: details.lat, longitude: details.lng };
        if (details.formattedAddress) {
          addressStr = details.formattedAddress;
        }
      }

      if (point) {
        if (searchTarget === 'pickup') {
          setPickupAddress(addressStr);
          setPickupPoint(point);
        } else {
          setDeliveryAddress(addressStr);
          setDeliveryPoint(point);
        }

        // Center map view on the newly selected point
        setMapRegion({
          latitude: point.latitude,
          longitude: point.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
      setQuoteData(null);
    } catch (err) {
      console.warn('Could not resolve place details:', err);
      setErrorMsg('Failed to resolve place coordinates. Pick location on map.');
    }
  };

  // ── auto-quote for intrastate ──
  useEffect(() => {
    if (mode !== 'INTRASTATE') return;
    if (pickupAddress.trim().length > 3 && deliveryAddress.trim().length > 3) {
      const timer = setTimeout(async () => {
        setErrorMsg(null);
        try {
          const res = await quoteQuery.mutateAsync({
            size: 'SMALL',
            pickupAddress: pickupAddress.trim(),
            deliveryAddress: deliveryAddress.trim(),
            pickupLat: pickupPoint?.latitude,
            pickupLng: pickupPoint?.longitude,
            deliveryLat: deliveryPoint?.latitude,
            deliveryLng: deliveryPoint?.longitude,
          });
          setQuoteData(res);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unable to calculate quote. Try adjusting location pins.';
          setErrorMsg(errMsg);
          setQuoteData(null);
        }
      }, 750);
      return () => clearTimeout(timer);
    } else {
      setQuoteData(null);
    }
  }, [pickupAddress, deliveryAddress, pickupPoint, deliveryPoint, mode]);

  // ── route preview (interstate) ──
  const routePreview =
    mode === 'INTERSTATE' && originHub && destinationHub
      ? getRouteWithHubs(originHub, destinationHub, apiHubs)
      : null;

  const mapRoutePoints =
    mode === 'INTRASTATE' && pickupPoint && deliveryPoint ? [pickupPoint, deliveryPoint] : [];
  const mapDistanceKm = quoteData?.distanceKm as number | undefined;
  const mapDurationMin = quoteData?.durationMin as number | undefined;

  const canContinue =
    mode === 'INTRASTATE'
      ? Boolean(quoteData && pickupAddress.trim() && deliveryAddress.trim())
      : Boolean(originHub && destinationHub && originHub.id !== destinationHub.id);

  const handleContinue = () => {
    if (!canContinue) return;
    if (mode === 'INTRASTATE') {
      router.push({
        pathname: '/send/pickup-details',
        params: {
          pickupAddress: pickupAddress.trim(),
          deliveryAddress: deliveryAddress.trim(),
          size: 'SMALL',
        },
      });
    } else {
      router.push({
        pathname: '/send/pickup-details',
        params: {
          originHubId: originHub!.id,
          destinationHubId: destinationHub!.id,
          ...(pickupAddress.trim() ? { localPickupAddress: pickupAddress.trim() } : {}),
        },
      });
    }
  };

  // ── Bottom sheet triggers ──
  const showIntrastateBottomSheet = mode === 'INTRASTATE' && pickupAddress.trim() && deliveryAddress.trim();
  const showInterstateBottomSheet = mode === 'INTERSTATE';
  const showBottomSheet = showIntrastateBottomSheet || showInterstateBottomSheet;

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      {/* ── Background Map ── */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        region={mapRegion}
        showsUserLocation
        showsCompass={false}
        toolbarEnabled={false}
        customMapStyle={DARK_MAP_STYLE}
      >
        {pickupPoint && (
          <Marker coordinate={pickupPoint} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.markerPin, { backgroundColor: palette.primary }]}>
              <View style={styles.markerInner} />
            </View>
          </Marker>
        )}
        {deliveryPoint && (
          <Marker coordinate={deliveryPoint} anchor={{ x: 0.5, y: 1 }}>
            <View style={[styles.markerPinSquare, { backgroundColor: palette.error || '#FB7185' }]}>
              <View style={styles.markerInnerSquare} />
            </View>
          </Marker>
        )}
        {mapRoutePoints.length === 2 && (
          <Polyline
            coordinates={mapRoutePoints}
            strokeColor={palette.primary}
            strokeWidth={5}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* ── Top Floating panel (Stacked inputs) ── */}
      <Animated.View
        entering={FadeInUp.springify().damping(22)}
        style={[
          styles.floatingHeader,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: Spacing.md,
            backgroundColor: palette.bg,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          },
        ]}
      >
        {/* Safe Back / Screen Title */}
        <View style={styles.headerTitleRow}>
          <Pressable
            onPress={() => back()}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && { opacity: 0.72 },
            ]}
          >
            <ChevronLeft size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: palette.text }]}>Send Parcel</Text>
        </View>

        {/* Delivery Mode Toggle */}
        <View style={[styles.tabBar, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Animated.View
            style={[
              styles.tabIndicator,
              { backgroundColor: palette.primary, width: '50%' },
              tabStyle,
              { left: 4 },
            ]}
          />
          <Pressable style={styles.tabBtn} onPress={() => switchMode('INTRASTATE')}>
            <MapPin size={14} color={mode === 'INTRASTATE' ? '#fff' : palette.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                { color: mode === 'INTRASTATE' ? '#fff' : palette.textSecondary },
              ]}
            >
              Within State
            </Text>
          </Pressable>
          <Pressable style={styles.tabBtn} onPress={() => switchMode('INTERSTATE')}>
            <Globe size={14} color={mode === 'INTERSTATE' ? '#fff' : palette.textSecondary} />
            <Text
              style={[
                styles.tabLabel,
                { color: mode === 'INTERSTATE' ? '#fff' : palette.textSecondary },
              ]}
            >
              Interstate
            </Text>
          </Pressable>
        </View>

        {/* Address Card */}
        <View style={[styles.addressCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {/* Pickup address field */}
          <Pressable
            onPress={() => {
              setSearchTarget('pickup');
              setSearchText(pickupAddress);
              setSearchModalVisible(true);
            }}
            style={styles.addressBtnRow}
          >
            <View style={[styles.dotOuter, { borderColor: palette.primary }]}>
              <View style={[styles.dotInner, { backgroundColor: palette.primary }]} />
            </View>
            <View style={styles.addressBtnContent}>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                {mode === 'INTERSTATE' ? 'Local pickup address (optional)' : 'Pickup location'}
              </Text>
              {pickupAddress ? (
                <>
                  <Text style={[styles.addressValueText, { color: palette.text }]} numberOfLines={1}>
                    {parseAddressDisplay(pickupAddress).title}
                  </Text>
                  {Boolean(parseAddressDisplay(pickupAddress).subtitle) && (
                    <Text style={{ fontSize: 11, color: palette.textSecondary, fontFamily: Typography.family.regular }} numberOfLines={1}>
                      {parseAddressDisplay(pickupAddress).subtitle}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.addressValueText, { color: palette.textSecondary }]} numberOfLines={1}>
                  {mode === 'INTERSTATE' ? 'Your pickup address' : 'Enter pickup location'}
                </Text>
              )}
            </View>
            {mode === 'INTRASTATE' && (
              <Pressable
                onPress={fillGpsLocation}
                disabled={gpsLoading}
                style={({ pressed }) => [
                  styles.gpsBtn,
                  { backgroundColor: `${palette.primary}18` },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {gpsLoading ? (
                  <ActivityIndicator size={12} color={palette.primary} />
                ) : (
                  <Navigation2 size={12} color={palette.primary} />
                )}
              </Pressable>
            )}
          </Pressable>

          {/* Divider & Swap Button */}
          <View style={styles.dividerRow}>
            <View style={[styles.lineDivider, { backgroundColor: palette.border }]} />
            <Pressable
              onPress={swapAddresses}
              style={({ pressed }) => [
                styles.swapBtn,
                { backgroundColor: palette.bg, borderColor: palette.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <ArrowDownUp size={14} color={palette.primary} />
            </Pressable>
            <View style={[styles.lineDivider, { backgroundColor: palette.border }]} />
          </View>

          {/* Destination address field */}
          <Pressable
            onPress={() => {
              setSearchTarget('delivery');
              setSearchText(deliveryAddress);
              setSearchModalVisible(true);
            }}
            style={styles.addressBtnRow}
          >
            <View style={[styles.squareDot, { backgroundColor: palette.primary }]} />
            <View style={styles.addressBtnContent}>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                {mode === 'INTERSTATE' ? 'Recipient address' : 'Delivery address'}
              </Text>
              {deliveryAddress ? (
                <>
                  <Text style={[styles.addressValueText, { color: palette.text }]} numberOfLines={1}>
                    {parseAddressDisplay(deliveryAddress).title}
                  </Text>
                  {Boolean(parseAddressDisplay(deliveryAddress).subtitle) && (
                    <Text style={{ fontSize: 11, color: palette.textSecondary, fontFamily: Typography.family.regular }} numberOfLines={1}>
                      {parseAddressDisplay(deliveryAddress).subtitle}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.addressValueText, { color: palette.textSecondary }]} numberOfLines={1}>
                  Enter delivery destination
                </Text>
              )}
            </View>
          </Pressable>
        </View>
      </Animated.View>

      {/* Floating ETA Polyline label on the Map */}
      {mapDurationMin && pickupPoint && deliveryPoint && (
        <View
          style={[
            styles.mapEtaBubble,
            {
              backgroundColor: palette.primary,
              top: '52%',
              left: '42%',
            },
          ]}
        >
          <Text style={styles.mapEtaText}>{Math.round(mapDurationMin)} min</Text>
        </View>
      )}

      {/* ── Bottom Sheet (Details Sheet) ── */}
      {showBottomSheet && (
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          style={[
            styles.bottomSheetCard,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          {errorMsg && <ErrorBanner message={errorMsg} />}

          {/* INTRASTATE DETAILS (Uber style pricing & duration) */}
          {mode === 'INTRASTATE' && (
            <View style={styles.intrastateSheetContent}>
              {quoteQuery.isPending ? (
                <View style={styles.sheetLoader}>
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text style={[styles.loaderText, { color: palette.textSecondary }]}>
                    Calculating fare and ETA...
                  </Text>
                </View>
              ) : quoteData ? (
                <Animated.View entering={FadeIn.duration(200)} style={styles.vehicleChoiceRow}>
                  {/* Two wheeler select row matching user expectation */}
                  <View
                    style={[
                      styles.vehicleOptionCard,
                      { backgroundColor: palette.bg, borderColor: palette.primary + '40' },
                    ]}
                  >
                    <View style={styles.vehicleDetailsRow}>
                      <View style={[styles.vehicleIconBox, { backgroundColor: `${palette.primary}18` }]}>
                        <Truck size={22} color={palette.primary} />
                      </View>
                      <View style={{ gap: 2, flex: 1 }}>
                        <Text style={[styles.vehicleNameText, { color: palette.text }]}>Two-wheeler</Text>
                        <Text style={[styles.vehicleMetaText, { color: palette.textSecondary }]}>
                          {mapDurationMin ? `${Math.round(mapDurationMin)} mins` : '15 mins'} · {mapDistanceKm ? `${mapDistanceKm.toFixed(1)} km` : '-- km'}
                        </Text>
                      </View>
                      <Text style={[styles.vehiclePriceText, { color: palette.primary }]}>
                        {formatMoney(quoteData.totalPrice)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.sheetHelperText, { color: palette.textSecondary }]}>
                    Local delivery route detected. Est. pickup in 8–15 mins.
                  </Text>
                </Animated.View>
              ) : (
                <Text style={[styles.sheetPromptText, { color: palette.textSecondary }]}>
                  Please choose pickup and destination to calculate pricing.
                </Text>
              )}
            </View>
          )}

          {/* INTERSTATE DETAILS (Hub picker card inside bottom sheet) */}
          {mode === 'INTERSTATE' && (
            <View style={styles.interstateSheetContent}>
              <View style={styles.hubHeaderRow}>
                <Truck size={16} color={palette.primary} />
                <Text style={[styles.hubTitleText, { color: palette.text }]}>Select transit network hubs</Text>
              </View>

              <HubPicker
                label="Origin hub"
                value={originHub}
                onSelect={setOriginHub}
                helperText="Entering our interstate courier network"
                disabledHubId={destinationHub?.id}
                hubs={apiHubs ?? []}
                loading={hubsLoading}
              />

              <View style={styles.hubDividerRow}>
                <View style={[styles.hubLine, { backgroundColor: palette.border }]} />
                <Pressable
                  onPress={swapHubs}
                  style={({ pressed }) => [
                    styles.hubSwapBtn,
                    { backgroundColor: palette.bg, borderColor: palette.border },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <ArrowDownUp size={14} color={palette.primary} />
                </Pressable>
                <View style={[styles.hubLine, { backgroundColor: palette.border }]} />
              </View>

              <HubPicker
                label="Destination hub"
                value={destinationHub}
                onSelect={setDestinationHub}
                helperText="Receiving station at the recipient state"
                disabledHubId={originHub?.id}
                hubs={apiHubs ?? []}
                loading={hubsLoading}
              />

              {routePreview && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.routeSummaryStrip,
                    { backgroundColor: `${palette.primary}12`, borderColor: `${palette.primary}25` },
                  ]}
                >
                  <View style={styles.stripCell}>
                    <Text style={[styles.stripLabel, { color: palette.textSecondary }]}>Base route fare</Text>
                    <Text style={[styles.stripValue, { color: palette.text }]}>
                      {formatMoney(routePreview.baseFare)}
                    </Text>
                  </View>
                  <View style={[styles.stripDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.stripCell}>
                    <Text style={[styles.stripLabel, { color: palette.textSecondary }]}>Est. Hub Transit</Text>
                    <Text style={[styles.stripValue, { color: palette.text }]}>
                      {routePreview.estimatedDays === 1 ? '1 day' : `${routePreview.estimatedDays} days`}
                    </Text>
                  </View>
                </Animated.View>
              )}
            </View>
          )}

          {/* CTA Action button */}
          <Pressable
            disabled={!canContinue}
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: canContinue ? palette.primary : palette.border,
                opacity: pressed && canContinue ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaButtonText, { color: canContinue ? '#fff' : palette.textSecondary }]}>
              {canContinue ? 'Continue →' : 'Complete details to continue'}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Autocomplete Place Search Modal ── */}
      <Modal visible={searchModalVisible} animationType="slide" onRequestClose={() => setSearchModalVisible(false)}>
        <View style={[styles.searchScreen, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
          {/* Header Row */}
          <View style={styles.searchHeader}>
            <Pressable
              onPress={() => {
                setSearchModalVisible(false);
                setSearchText('');
                setSearchResults([]);
              }}
              style={({ pressed }) => [
                styles.searchBackBtn,
                { backgroundColor: palette.card, borderColor: palette.border },
                pressed && { opacity: 0.72 },
              ]}
            >
              <ChevronLeft size={18} color={palette.text} />
            </Pressable>
            <View style={[styles.searchInputRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Search size={16} color={palette.textSecondary} />
              <TextInput
                autoFocus
                value={searchText}
                onChangeText={setSearchText}
                placeholder={searchTarget === 'pickup' ? 'Choose pickup location' : 'Choose destination'}
                placeholderTextColor={palette.textSecondary}
                style={[styles.searchTextInput, { color: palette.text }]}
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText('')} hitSlop={8}>
                  <Text style={[styles.clearBtnText, { color: palette.textSecondary }]}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.searchScrollContent}>
            {/* Choose on Map trigger */}
            <Pressable
              onPress={() => {
                setSearchModalVisible(false);
                openMapPicker(searchTarget!);
              }}
              style={({ pressed }) => [
                styles.shortcutRow,
                { borderBottomColor: palette.border },
                pressed && { backgroundColor: palette.card },
              ]}
            >
              <View style={[styles.shortcutIconBox, { backgroundColor: `${palette.primary}18` }]}>
                <Navigation2 size={16} color={palette.primary} />
              </View>
              <Text style={[styles.shortcutText, { color: palette.text }]}>Choose on map</Text>
            </Pressable>

            {searchLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={palette.primary} />
            ) : searchText.trim().length > 0 ? (
              searchResults.map((item, idx) => (
                <Pressable
                  key={item.placeId + idx}
                  onPress={() => handleSelectPlace(item)}
                  style={({ pressed }) => [
                    styles.placeResultRow,
                    { borderBottomColor: palette.border },
                    pressed && { backgroundColor: palette.card },
                  ]}
                >
                  <View style={[styles.placeIconBox, { backgroundColor: `${palette.textSecondary}15` }]}>
                    <MapPin size={16} color={palette.textSecondary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.placeMainText, { color: palette.text }]} numberOfLines={1}>
                      {item.mainText}
                    </Text>
                    <Text style={[styles.placeSubText, { color: palette.textSecondary }]} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              // Saved & presets matching user expectations screenshot 3
              <View style={{ marginTop: Spacing.sm }}>
                {MOCK_LANDMARKS.map((item, idx) => (
                  <Pressable
                    key={item.placeId + idx}
                    onPress={() => handleSelectPlace(item)}
                    style={({ pressed }) => [
                      styles.placeResultRow,
                      { borderBottomColor: palette.border },
                      pressed && { backgroundColor: palette.card },
                    ]}
                  >
                    <View
                      style={[
                        styles.placeIconBox,
                        {
                          backgroundColor:
                            item.icon === 'home' ? `${palette.primary}18` : `${palette.textSecondary}15`,
                        },
                      ]}
                    >
                      {item.icon === 'home' ? (
                        <Home size={16} color={palette.primary} />
                      ) : (
                        <Clock size={16} color={palette.textSecondary} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.placeMainText, { color: palette.text }]} numberOfLines={1}>
                        {item.mainText}
                      </Text>
                      <Text style={[styles.placeSubText, { color: palette.textSecondary }]} numberOfLines={1}>
                        {item.secondaryText}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Fixed Center Pin Map Picker ── */}
      <Modal visible={Boolean(mapPickerTarget)} animationType="slide" onRequestClose={() => setMapPickerTarget(null)}>
        <View style={styles.mapPickerScreen}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={mapPickerRegion}
            onRegionChangeComplete={setMapPickerRegion}
            showsUserLocation
            showsMyLocationButton
            showsCompass={false}
            toolbarEnabled={false}
            customMapStyle={DARK_MAP_STYLE}
          />
          {/* Central fixed marker pin */}
          <View pointerEvents="none" style={styles.centerPinWrap}>
            <View style={[styles.centerPin, { backgroundColor: palette.primary }]}>
              <MapPin size={24} color="#fff" fill="#fff" />
            </View>
            <View style={[styles.centerPinStem, { backgroundColor: palette.primary }]} />
            <View style={styles.centerPinShadow} />
          </View>

          {/* Top floating location state banner */}
          <View style={[styles.mapTopBar, { paddingTop: insets.top + Spacing.sm }]}>
            <Pressable
              onPress={() => setMapPickerTarget(null)}
              style={({ pressed }) => [
                styles.mapCloseButton,
                { backgroundColor: palette.card },
                pressed && { opacity: 0.75 },
              ]}
            >
              <ChevronLeft size={20} color={palette.text} />
            </Pressable>
            <View style={[styles.mapSearchCard, { backgroundColor: palette.card }]}>
              <Text style={[styles.mapSearchLabel, { color: palette.textSecondary }]}>
                {mapPickerTarget === 'pickup' ? 'Choose pickup location' : 'Choose destination'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {mapPickerResolving && <ActivityIndicator size={10} color={palette.primary} />}
                <Text style={[styles.mapSearchTitle, { color: palette.text, flex: 1 }]} numberOfLines={1}>
                  {mapPickerResolving
                    ? 'Resolving location...'
                    : (mapPickerTarget === 'pickup' ? pickupAddress : deliveryAddress)
                      ? parseAddressDisplay(mapPickerTarget === 'pickup' ? pickupAddress : deliveryAddress).title
                      : 'Pan map to position pin'}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom confirmation action sheet */}
          <View
            style={[
              styles.mapSetSheet,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            <View style={styles.mapSheetHandle} />
            <Text style={[styles.mapSetTitle, { color: palette.text }]}>Confirm exact location</Text>
            <Text style={[styles.mapSetSub, { color: palette.textSecondary }]}>
              Pan or zoom until the pin sits on the pickup or drop-off point.
            </Text>
            <Pressable
              onPress={confirmMapPicker}
              disabled={mapPickerResolving}
              style={({ pressed }) => [
                styles.mapSetButton,
                { backgroundColor: palette.primary, opacity: pressed || mapPickerResolving ? 0.82 : 1 },
              ]}
            >
              {mapPickerResolving ? <ActivityIndicator color="#fff" /> : <Text style={styles.mapSetButtonText}>Set</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Background markers
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  markerPinSquare: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  markerInnerSquare: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#fff',
  },

  // Map bubble
  mapEtaBubble: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  mapEtaText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Typography.family.bold,
  },

  // Floating top header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
    gap: Spacing.md,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },

  // Mode Toggle tabs
  tabBar: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 10,
    zIndex: 0,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: '100%',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },

  // Floating card
  addressCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  addressBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.sm,
  },
  addressBtnContent: {
    flex: 1,
    gap: 3,
  },
  dotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  squareDot: {
    width: 11,
    height: 11,
    borderRadius: 2.5,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: Typography.family.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  addressValueText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
  },
  gpsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Swap Button Row
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lineDivider: {
    flex: 1,
    height: 1,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom details sheet
  bottomSheetCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
    zIndex: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 99,
    backgroundColor: 'rgba(148,163,184,0.3)',
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sheetLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  loaderText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
  },
  intrastateSheetContent: {
    marginVertical: Spacing.xs,
  },
  sheetPromptText: {
    textAlign: 'center',
    fontSize: Typography.sm,
    fontFamily: Typography.family.regular,
    paddingVertical: Spacing.md,
  },
  vehicleChoiceRow: {
    gap: Spacing.md,
  },
  vehicleOptionCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: Spacing.md,
  },
  vehicleDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleNameText: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  vehicleMetaText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
  },
  vehiclePriceText: {
    fontSize: Typography.lg,
    fontFamily: Typography.family.bold,
  },
  sheetHelperText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Interstate Sheet Details
  interstateSheetContent: {
    gap: Spacing.md,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  hubTitleText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  hubDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  hubLine: {
    flex: 1,
    height: 1,
  },
  hubSwapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeSummaryStrip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stripLabel: {
    fontSize: 10,
    fontFamily: Typography.family.medium,
    textTransform: 'uppercase',
  },
  stripValue: {
    fontSize: Typography.md,
    fontFamily: Typography.family.bold,
  },
  stripDivider: {
    width: 1,
    height: 32,
  },

  // Search Modal Screen styling
  searchScreen: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  searchBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputRow: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchTextInput: {
    flex: 1,
    fontSize: Typography.sm,
    fontFamily: Typography.family.medium,
    paddingVertical: 0,
  },
  clearBtnText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  searchScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  shortcutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  placeResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  placeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeMainText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },
  placeSubText: {
    fontSize: Typography.xs,
    fontFamily: Typography.family.regular,
  },

  // CTA button common
  ctaButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  ctaButtonText: {
    fontSize: Typography.sm,
    fontFamily: Typography.family.bold,
  },

  // Map Picker Modal (Choose on Map)
  mapPickerScreen: { flex: 1, backgroundColor: '#000' },
  centerPinWrap: { position: 'absolute', left: 0, right: 0, top: '50%', alignItems: 'center', marginTop: -50 },
  centerPin: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  centerPinStem: { width: 4, height: 16, borderRadius: 2, marginTop: -3 },
  centerPinShadow: { width: 24, height: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.22)', marginTop: 2 },
  mapTopBar: { position: 'absolute', top: 0, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  mapCloseButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  mapSearchCard: { flex: 1, minHeight: 48, borderRadius: 16, paddingHorizontal: Spacing.md, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  mapSearchLabel: { fontSize: 9, fontFamily: Typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  mapSearchTitle: { marginTop: 1, fontSize: Typography.sm, fontFamily: Typography.family.bold },
  mapSetSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm },
  mapSheetHandle: { width: 40, height: 4.5, borderRadius: 99, backgroundColor: 'rgba(148,163,184,0.3)', alignSelf: 'center', marginBottom: Spacing.xs },
  mapSetTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, textAlign: 'center' },
  mapSetSub: { fontSize: Typography.xs, lineHeight: 18, fontFamily: Typography.family.regular, textAlign: 'center' },
  mapSetButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
  mapSetButtonText: { color: '#fff', fontSize: Typography.sm, fontFamily: Typography.family.bold },
});
