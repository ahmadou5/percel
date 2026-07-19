import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  ArrowDownUp,
  Building2,
  ChevronLeft,
  Clock,
  Globe,
  Home,
  Loader2,
  MapPin,
  Navigation2,
  Sparkles,
  Truck,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useSafeBack } from '@/components/navigation/useSafeBack';
import { HubPicker } from '@/components/order/HubPicker';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { formatHubLabel, formatHubLocation, getRouteWithHubs } from '@/lib/hubs';
import { formatMoney } from '@/lib/order';
import { useAppPalette } from '@/lib/theme';
import type { Hub } from '@/types/hubs';
import { useActiveHubs, useGetQuote, useReverseGeocode } from '@/hooks/useOrder';

// ─── Recent/Saved location quick picks ───────────────────────────────────────
const QUICK_PICKS = [
  { id: 'home', label: 'Home', subtitle: 'Add your home address', icon: 'home' as const },
  { id: 'work', label: 'Work', subtitle: 'Add your work address', icon: 'building' as const },
];

type DeliveryMode = 'INTRASTATE' | 'INTERSTATE';

type LocationTarget = 'pickup' | 'delivery';
type MapPoint = { latitude: number; longitude: number };

const DEFAULT_REGION: Region = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export default function SendOrderEntryScreen() {
  const router = useRouter();
  const back = useSafeBack('/');
  const palette = useAppPalette();

  const quoteQuery = useGetQuote();
  const reverseGeocodeMutation = useReverseGeocode();
  const { data: apiHubs, isLoading: hubsLoading } = useActiveHubs();

  // ── location fields ──────────────────────────────────────────────────────
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupPoint, setPickupPoint] = useState<MapPoint | null>(null);
  const [deliveryPoint, setDeliveryPoint] = useState<MapPoint | null>(null);
  const [mapPickerTarget, setMapPickerTarget] = useState<LocationTarget | null>(null);
  const [mapPickerRegion, setMapPickerRegion] = useState<Region>(DEFAULT_REGION);
  const [mapPickerResolving, setMapPickerResolving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // ── delivery mode tab ────────────────────────────────────────────────────
  const [mode, setMode] = useState<DeliveryMode>('INTRASTATE');

  // ── interstate hub selection ─────────────────────────────────────────────
  const [originHub, setOriginHub] = useState<Hub | null>(null);
  const [destinationHub, setDestinationHub] = useState<Hub | null>(null);

  // ── quote + error state ──────────────────────────────────────────────────
  const [quoteData, setQuoteData] = useState<any>(null);
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

  // ── GPS auto-fill ─────────────────────────────────────────────────────────
  const fillGpsLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enter your address manually.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await reverseGeocodeMutation.mutateAsync({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      setPickupAddress(result.formattedAddress);
      setPickupPoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      setErrorMsg('Could not fetch your current location. Try entering manually.');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // ── swap addresses ────────────────────────────────────────────────────────
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

  // ── swap hubs ─────────────────────────────────────────────────────────────
  const swapHubs = () => {
    setOriginHub(destinationHub);
    setDestinationHub(originHub);
  };

  const openMapPicker = (target: LocationTarget) => {
    const point = target === 'pickup' ? pickupPoint : deliveryPoint;
    setMapPickerRegion(point ? { ...DEFAULT_REGION, ...point } : DEFAULT_REGION);
    setMapPickerTarget(target);
  };

  const confirmMapPicker = async () => {
    if (!mapPickerTarget) return;
    const point = { latitude: mapPickerRegion.latitude, longitude: mapPickerRegion.longitude };
    setMapPickerResolving(true);
    setErrorMsg(null);

    try {
      const result = await reverseGeocodeMutation.mutateAsync({ lat: point.latitude, lng: point.longitude });
      if (mapPickerTarget === 'pickup') {
        setPickupAddress(result.formattedAddress);
        setPickupPoint(point);
      } else {
        setDeliveryAddress(result.formattedAddress);
        setDeliveryPoint(point);
      }
      setQuoteData(null);
      setMapPickerTarget(null);
    } catch {
      setErrorMsg('Could not name that location. Move the map slightly and try again.');
    } finally {
      setMapPickerResolving(false);
    }
  };

  // ── auto-quote for intrastate ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'INTRASTATE') return;
    if (pickupAddress.trim().length > 5 && deliveryAddress.trim().length > 5) {
      const timer = setTimeout(async () => {
        setErrorMsg(null);
        try {
          const res = await quoteQuery.mutateAsync({
            size: 'SMALL',
            pickupAddress: pickupAddress.trim(),
            deliveryAddress: deliveryAddress.trim(),
          });
          setQuoteData(res);
        } catch (err: any) {
          setErrorMsg(err.message ?? 'Unable to detect the route. Try different addresses.');
          setQuoteData(null);
        }
      }, 900);
      return () => clearTimeout(timer);
    } else {
      setQuoteData(null);
    }
  }, [pickupAddress, deliveryAddress, mode]);

  // ── route preview (interstate) ────────────────────────────────────────────
  const routePreview =
    mode === "INTERSTATE" && originHub && destinationHub
      ? getRouteWithHubs(originHub.id, destinationHub.id)
      : null;

  const mapRoutePoints =
    mode === "INTRASTATE" && pickupPoint && deliveryPoint ? [pickupPoint, deliveryPoint] : [];
  const mapDistanceKm = quoteData?.distanceKm as number | undefined;
  const mapDurationMin = quoteData?.durationMin as number | undefined;
  const previewRegion: Region | null = mapRoutePoints.length === 2
    ? {
        latitude: (mapRoutePoints[0].latitude + mapRoutePoints[1].latitude) / 2,
        longitude: (mapRoutePoints[0].longitude + mapRoutePoints[1].longitude) / 2,
        latitudeDelta: Math.max(Math.abs(mapRoutePoints[0].latitude - mapRoutePoints[1].latitude) * 2.4, 0.018),
        longitudeDelta: Math.max(Math.abs(mapRoutePoints[0].longitude - mapRoutePoints[1].longitude) * 2.4, 0.018),
      }
    : null;

  // ── can continue? ─────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: palette.card, borderColor: palette.border },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => back()}
        >
          <ChevronLeft size={18} color={palette.text} />
        </Pressable>
      </View>

      {/* ── Hero text ── */}
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>Send a parcel</Text>
        <Text style={[styles.title, { color: palette.text }]}>Where is the package going?</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          Enter pickup and delivery details. We'll handle the routing automatically.
        </Text>
      </View>

      {/* ── Delivery mode toggle ── */}
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
          <MapPin size={15} color={mode === 'INTRASTATE' ? '#fff' : palette.textSecondary} />
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
          <Globe size={15} color={mode === 'INTERSTATE' ? '#fff' : palette.textSecondary} />
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

      {/* ── Google Maps-style stacked address card ── */}
      <View
        style={[
          styles.addressCard,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}
      >
        {/* Pickup field */}
        <View style={styles.addressRow}>
          <View style={[styles.dotOuter, { borderColor: palette.primary }]}>
            <View style={[styles.dotInner, { backgroundColor: palette.primary }]} />
          </View>
          <View style={styles.addressFieldWrap}>
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
              {mode === 'INTERSTATE' ? 'Local pickup address (optional)' : 'Your location'}
            </Text>
            <View style={styles.addressInputRow}>
              <TextInput
                style={[styles.addressInput, { color: palette.text }]}
                value={pickupAddress}
                onChangeText={(value) => {
                  setPickupAddress(value);
                  setPickupPoint(null);
                  setQuoteData(null);
                }}
                placeholder={
                  mode === 'INTERSTATE' ? 'Your full address for pickup' : 'Enter pickup address'
                }
                placeholderTextColor={palette.textSecondary}
                returnKeyType="next"
              />
              <Pressable
                onPress={fillGpsLocation}
                style={({ pressed }) => [
                  styles.gpsBtn,
                  { backgroundColor: `${palette.primary}18` },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {gpsLoading ? (
                  <ActivityIndicator size={14} color={palette.primary} />
                ) : (
                  <Navigation2 size={14} color={palette.primary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Divider + swap button */}
        <View style={styles.swapRow}>
          <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
          <Pressable
            onPress={swapAddresses}
            style={({ pressed }) => [
              styles.swapBtn,
              { backgroundColor: palette.bg, borderColor: palette.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <ArrowDownUp size={15} color={palette.primary} />
          </Pressable>
          <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
        </View>

        {/* Destination field */}
        <View style={styles.addressRow}>
          <View style={[styles.squareDot, { backgroundColor: palette.primary }]} />
          <View style={styles.addressFieldWrap}>
            <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
              {mode === 'INTERSTATE' ? 'Recipient address' : 'Delivery address'}
            </Text>
            <TextInput
              style={[styles.addressInput, { color: palette.text }]}
              value={deliveryAddress}
              onChangeText={(value) => {
                setDeliveryAddress(value);
                setDeliveryPoint(null);
                setQuoteData(null);
              }}
              placeholder="Enter delivery address"
              placeholderTextColor={palette.textSecondary}
              returnKeyType="done"
            />
          </View>
        </View>
      </View>

      {mode === "INTRASTATE" && (
        <View style={[styles.locationList, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Pressable
            onPress={() => openMapPicker("pickup")}
            style={({ pressed }) => [styles.locationRow, pressed && { opacity: 0.72 }]}
          >
            <View style={[styles.locationIcon, { backgroundColor: palette.primary + "14" }]}>
              <MapPin size={17} color={palette.primary} />
            </View>
            <View style={styles.locationCopy}>
              <Text style={[styles.locationTitle, { color: palette.text }]}>Choose pickup on map</Text>
              <Text style={[styles.locationSubtitle, { color: palette.textSecondary }]}>Pan and zoom the map under the fixed pin</Text>
            </View>
          </Pressable>
          <View style={[styles.locationDivider, { backgroundColor: palette.border }]} />
          <Pressable
            onPress={() => openMapPicker("delivery")}
            style={({ pressed }) => [styles.locationRow, pressed && { opacity: 0.72 }]}
          >
            <View style={[styles.locationIcon, { backgroundColor: palette.primary + "14" }]}>
              <Navigation2 size={17} color={palette.primary} />
            </View>
            <View style={styles.locationCopy}>
              <Text style={[styles.locationTitle, { color: palette.text }]}>Choose destination on map</Text>
              <Text style={[styles.locationSubtitle, { color: palette.textSecondary }]}>Place the center pin at the exact drop-off</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* ── Quick picks (only for intrastate) ── */}
      {mode === 'INTRASTATE' && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <View style={styles.quickPicksRow}>
            {QUICK_PICKS.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [
                  styles.quickPickChip,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                {p.icon === 'home' ? (
                  <Home size={14} color={palette.primary} />
                ) : (
                  <Building2 size={14} color={palette.primary} />
                )}
                <Text style={[styles.quickPickLabel, { color: palette.text }]}>{p.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [
                styles.quickPickChip,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Clock size={14} color={palette.textSecondary} />
              <Text style={[styles.quickPickLabel, { color: palette.textSecondary }]}>Recent</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* ── Auto-quote loading ── */}
      {quoteQuery.isPending && mode === 'INTRASTATE' && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.loaderRow}>
          <ActivityIndicator size="small" color={palette.primary} />
          <Text style={[styles.loaderText, { color: palette.textSecondary }]}>
            Detecting route & fare...
          </Text>
        </Animated.View>
      )}

      {errorMsg && <ErrorBanner message={errorMsg} />}

      {previewRegion && (
        <Animated.View
          entering={FadeIn.springify().damping(20)}
          style={[styles.routePreviewCard, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <View style={styles.routePreviewMap}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={previewRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              showsCompass={false}
              toolbarEnabled={false}
            >
              <Polyline coordinates={mapRoutePoints} strokeColor={palette.primary} strokeWidth={5} />
              <Marker coordinate={mapRoutePoints[0]} anchor={{ x: 0.5, y: 0.5 }} />
              <Marker coordinate={mapRoutePoints[1]} anchor={{ x: 0.5, y: 1 }} />
            </MapView>
          </View>
          <View style={styles.routePreviewSummary}>
            <View>
              <Text style={[styles.routePreviewTitle, { color: palette.text }]}>Route preview</Text>
              <Text style={[styles.routePreviewSub, { color: palette.textSecondary }]}>Review the pickup and destination before order details.</Text>
            </View>
            <View style={styles.routePreviewStats}>
              <Text style={[styles.routeStatValue, { color: palette.primary }]}>{mapDistanceKm ? `${mapDistanceKm.toFixed(1)} km` : "-- km"}</Text>
              <Text style={[styles.routeStatValue, { color: palette.text }]}>{mapDurationMin ? `${Math.round(mapDurationMin)} mins` : "ETA pending"}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Intrastate quote preview card ── */}
      {quoteData && mode === 'INTRASTATE' && (
        <Animated.View
          entering={FadeIn.springify().damping(20)}
          style={[
            styles.previewCard,
            { backgroundColor: palette.card, borderColor: palette.primary + '30' },
          ]}
        >
          <View style={styles.previewHeader}>
            <Sparkles size={18} color={palette.primary} />
            <Text style={[styles.previewTitle, { color: palette.text }]}>
              Local delivery detected ✓
            </Text>
          </View>
          <View style={styles.previewGrid}>
            <View style={styles.previewCell}>
              <Text style={[styles.cellLabel, { color: palette.textSecondary }]}>
                Estimated Pickup
              </Text>
              <Text style={[styles.cellValue, { color: palette.text }]}>8–15 mins</Text>
            </View>
            <View style={[styles.previewDivider, { backgroundColor: palette.border }]} />
            <View style={styles.previewCell}>
              <Text style={[styles.cellLabel, { color: palette.textSecondary }]}>
                Starting From
              </Text>
              <Text style={[styles.cellValue, { color: palette.primary }]}>
                {formatMoney(quoteData.totalPrice)}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Interstate hub pickers ── */}
      {mode === 'INTERSTATE' && (
        <Animated.View
          entering={FadeIn.springify().damping(22)}
          style={[
            styles.hubCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}
        >
          <View style={styles.hubCardHeader}>
            <Truck size={18} color={palette.primary} />
            <Text style={[styles.hubCardTitle, { color: palette.text }]}>
              Select network hubs
            </Text>
          </View>
          <Text style={[styles.hubCardBody, { color: palette.textSecondary }]}>
            Your parcel will be transported through these two hub stations across state lines.
          </Text>

          <HubPicker
            label="Origin hub"
            value={originHub}
            onSelect={setOriginHub}
            helperText="Pickup station entering our interstate network"
            disabledHubId={destinationHub?.id}
            hubs={apiHubs ?? []}
            loading={hubsLoading}
          />

          <View style={styles.hubSwapRow}>
            <View style={[styles.hubSwapLine, { backgroundColor: palette.border }]} />
            <Pressable
              onPress={swapHubs}
              style={({ pressed }) => [
                styles.swapBtn,
                { backgroundColor: palette.bg, borderColor: palette.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <ArrowDownUp size={15} color={palette.primary} />
            </Pressable>
            <View style={[styles.hubSwapLine, { backgroundColor: palette.border }]} />
          </View>

          <HubPicker
            label="Destination hub"
            value={destinationHub}
            onSelect={setDestinationHub}
            helperText="Receiving station at the destination state"
            disabledHubId={originHub?.id}
            hubs={apiHubs ?? []}
            loading={hubsLoading}
          />

          {/* Route summary strip */}
          {routePreview && (
            <Animated.View
              entering={FadeIn.duration(250)}
              style={[
                styles.routeStrip,
                { backgroundColor: `${palette.primary}10`, borderColor: `${palette.primary}30` },
              ]}
            >
              <View style={styles.routeStripCell}>
                <Text style={[styles.routeStripLabel, { color: palette.textSecondary }]}>
                  Base fare
                </Text>
                <Text style={[styles.routeStripValue, { color: palette.text }]}>
                  {formatMoney(routePreview.baseFare)}
                </Text>
              </View>
              <View style={[styles.routeStripDivider, { backgroundColor: `${palette.primary}25` }]} />
              <View style={styles.routeStripCell}>
                <Text style={[styles.routeStripLabel, { color: palette.textSecondary }]}>
                  Est. Hub Arrival
                </Text>
                <Text style={[styles.routeStripValue, { color: palette.text }]}>
                  {routePreview.estimatedDays === 1
                    ? '1 day'
                    : `${routePreview.estimatedDays} days`}
                </Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* ── CTA ── */}
      <Pressable
        disabled={!canContinue}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: canContinue ? palette.primary : palette.border,
            opacity: pressed && canContinue ? 0.88 : 1,
          },
        ]}
      >
        <Text style={[styles.ctaText, { color: canContinue ? '#fff' : palette.textSecondary }]}>
          {canContinue ? 'Continue →' : 'Complete route details'}
        </Text>
      </Pressable>

      <Modal visible={Boolean(mapPickerTarget)} animationType="slide" onRequestClose={() => setMapPickerTarget(null)}>
        <View style={styles.mapPickerScreen}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={mapPickerRegion}
            onRegionChangeComplete={setMapPickerRegion}
            showsUserLocation
            showsMyLocationButton
            showsCompass={false}
            toolbarEnabled={false}
          />
          <View pointerEvents="none" style={styles.centerPinWrap}>
            <View style={[styles.centerPin, { backgroundColor: palette.primary }]}>
              <MapPin size={24} color="#fff" fill="#fff" />
            </View>
            <View style={styles.centerPinStem} />
            <View style={styles.centerPinShadow} />
          </View>
          <View style={styles.mapTopBar}>
            <Pressable
              onPress={() => setMapPickerTarget(null)}
              style={({ pressed }) => [styles.mapCloseButton, { backgroundColor: palette.card }, pressed && { opacity: 0.75 }]}
            >
              <ChevronLeft size={20} color={palette.text} />
            </Pressable>
            <View style={[styles.mapSearchCard, { backgroundColor: palette.card }]}>
              <Text style={[styles.mapSearchLabel, { color: palette.textSecondary }]}>
                {mapPickerTarget === "pickup" ? "Set pickup location" : "Set destination"}
              </Text>
              <Text style={[styles.mapSearchTitle, { color: palette.text }]} numberOfLines={1}>Move the map under the pin</Text>
            </View>
          </View>
          <View style={[styles.mapSetSheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.mapSheetHandle} />
            <Text style={[styles.mapSetTitle, { color: palette.text }]}>Confirm exact location</Text>
            <Text style={[styles.mapSetSub, { color: palette.textSecondary }]}>Pan or zoom until the pin sits on the pickup or drop-off point.</Text>
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
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },

  // header
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // hero
  hero: { gap: Spacing.xs },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: Typography.xs,
    fontFamily: Typography.family.bold,
  },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Typography.family.bold, letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.md, lineHeight: 22, fontFamily: Typography.family.regular },

  // delivery mode tab
  tabBar: {
    height: 50,
    borderRadius: 16,
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
    borderRadius: 12,
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
  tabLabel: { fontSize: Typography.sm, fontFamily: Typography.family.semibold },

  // address card
  addressCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 4 },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  dotInner: { width: 7, height: 7, borderRadius: 4 },
  squareDot: { width: 14, height: 14, borderRadius: 4, marginTop: 20 },
  addressFieldWrap: { flex: 1, paddingVertical: Spacing.sm, gap: 2 },
  fieldLabel: { fontSize: 11, fontFamily: Typography.family.medium, letterSpacing: 0.3 },
  addressInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressInput: {
    flex: 1,
    fontSize: Typography.md,
    fontFamily: Typography.family.semibold,
    paddingVertical: 0,
    minHeight: 28,
  },
  gpsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // swap
  swapRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, gap: Spacing.sm },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: { flex: 1, height: 1 },

  // quick picks
  quickPicksRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
  },
  quickPickLabel: { fontSize: Typography.sm, fontFamily: Typography.family.medium },

  // loader
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  loaderText: { fontSize: Typography.sm, fontFamily: Typography.family.regular },

  // quote preview (intrastate)
  previewCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold, flex: 1 },
  previewGrid: { flexDirection: 'row', alignItems: 'center' },
  previewCell: { flex: 1, alignItems: 'center', gap: 4 },
  previewDivider: { width: 1, height: 40 },
  cellLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  cellValue: { fontSize: Typography.xl, fontFamily: Typography.family.bold },

  // interstate hub card
  hubCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.lg, gap: Spacing.lg },
  hubCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hubCardTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  hubCardBody: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular },
  hubSwapRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hubSwapLine: { flex: 1, height: 1 },

  // map location rows
  locationList: { borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  locationRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: Spacing.md },
  locationIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  locationCopy: { flex: 1, gap: 3 },
  locationTitle: { fontSize: Typography.sm, fontFamily: Typography.family.bold },
  locationSubtitle: { fontSize: Typography.xs, fontFamily: Typography.family.regular },
  locationDivider: { height: 1, marginLeft: 64 },

  // route preview map
  routePreviewCard: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  routePreviewMap: { height: 190, overflow: "hidden" },
  routePreviewSummary: { padding: Spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md },
  routePreviewTitle: { fontSize: Typography.md, fontFamily: Typography.family.bold },
  routePreviewSub: { marginTop: 3, maxWidth: 210, fontSize: Typography.xs, lineHeight: 17, fontFamily: Typography.family.regular },
  routePreviewStats: { alignItems: "flex-end", gap: 4 },
  routeStatValue: { fontSize: Typography.sm, fontFamily: Typography.family.bold },

  // full-screen fixed-pin map picker
  mapPickerScreen: { flex: 1, backgroundColor: "#000" },
  centerPinWrap: { position: "absolute", left: 0, right: 0, top: "50%", alignItems: "center", marginTop: -54 },
  centerPin: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.26, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  centerPinStem: { width: 4, height: 18, borderRadius: 2, backgroundColor: "#0A84FF", marginTop: -3 },
  centerPinShadow: { width: 28, height: 8, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.22)", marginTop: 2 },
  mapTopBar: { position: "absolute", top: 54, left: Spacing.lg, right: Spacing.lg, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  mapCloseButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  mapSearchCard: { flex: 1, minHeight: 54, borderRadius: 18, paddingHorizontal: Spacing.md, justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  mapSearchLabel: { fontSize: 11, fontFamily: Typography.family.medium, textTransform: "uppercase", letterSpacing: 0.6 },
  mapSearchTitle: { marginTop: 2, fontSize: Typography.md, fontFamily: Typography.family.bold },
  mapSetSheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 36, gap: Spacing.sm },
  mapSheetHandle: { width: 46, height: 5, borderRadius: 99, backgroundColor: "rgba(148,163,184,0.45)", alignSelf: "center", marginBottom: Spacing.xs },
  mapSetTitle: { fontSize: Typography.lg, fontFamily: Typography.family.bold, textAlign: "center" },
  mapSetSub: { fontSize: Typography.sm, lineHeight: 20, fontFamily: Typography.family.regular, textAlign: "center" },
  mapSetButton: { minHeight: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginTop: Spacing.sm },
  mapSetButtonText: { color: "#fff", fontSize: Typography.md, fontFamily: Typography.family.bold },

  // route strip
  routeStrip: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  routeStripCell: { flex: 1, alignItems: 'center', gap: 4 },
  routeStripLabel: { fontSize: Typography.xs, fontFamily: Typography.family.medium },
  routeStripValue: { fontSize: Typography.lg, fontFamily: Typography.family.bold },
  routeStripDivider: { width: 1, height: 40, marginHorizontal: Spacing.md },

  // CTA
  cta: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: { fontSize: Typography.md, fontFamily: Typography.family.bold },
});
