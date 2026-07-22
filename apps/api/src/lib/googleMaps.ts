import axios, { AxiosError } from 'axios';

import { env } from '../config/env.js';
import { AppError, ValidationError } from '../utils/errors.js';

const googleMaps = axios.create({
  baseURL: 'https://maps.googleapis.com/maps/api',
  timeout: 15000,
});

function wrapError(error: unknown): never {
  if (error instanceof AxiosError) {
    throw new AppError(error.response?.data?.error_message ?? 'Google Maps request failed', 502, 'GOOGLE_MAPS_ERROR');
  }

  if (error instanceof AppError) throw error;
  throw new AppError('Google Maps request failed', 502, 'GOOGLE_MAPS_ERROR');
}

/** Decode a Google Maps encoded polyline string into an array of lat/lng coordinate objects. */
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

/** Helper Haversine distance calculator in KM */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getDistanceAndDuration(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
) {
  try {
    const { data } = await googleMaps.get('/distancematrix/json', {
      params: {
        origins: `${originLat},${originLng}`,
        destinations: `${destLat},${destLng}`,
        key: env.GOOGLE_MAPS_API_KEY,
      },
    });

    const element = data?.rows?.[0]?.elements?.[0];
    const distanceKm = Number((element?.distance?.value ?? 0) / 1000);
    const durationMin = Number((element?.duration?.value ?? 0) / 60);

    if (distanceKm > 0 && durationMin > 0) {
      return { distanceKm, durationMin };
    }
  } catch (error) {
    console.warn('[googleMaps] Distance Matrix error/fallback:', error);
  }

  // Fallback: Haversine distance with estimated driving speed (30km/h)
  const dist = haversineDistanceKm(originLat, originLng, destLat, destLng);
  const distanceKm = Math.max(0.5, Number(dist.toFixed(2)));
  const durationMin = Math.max(10, Math.ceil((distanceKm / 30) * 60));
  return { distanceKm, durationMin };
}

export async function geocodeAddress(address: string) {
  // Regex to extract lat/lng if embedded in formatted text (e.g. "11.965, 8.537" or "Pin Location (11.965, 8.537)")
  const coordMatch = address.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  const extractedLat = coordMatch ? parseFloat(coordMatch[1]) : null;
  const extractedLng = coordMatch ? parseFloat(coordMatch[2]) : null;

  try {
    const { data } = await googleMaps.get('/geocode/json', {
      params: { address, key: env.GOOGLE_MAPS_API_KEY },
    });

    const result = data?.results?.[0];
    const location = result?.geometry?.location;

    if (result && location) {
      const parts = String(result.formatted_address ?? address).split(',').map((part: string) => part.trim());
      return {
        street: parts[0] ?? address,
        city: parts[1] ?? parts[0] ?? address,
        state: parts[2] ?? parts[1] ?? 'Nigeria',
        country: parts[3] ?? 'Nigeria',
        lat: Number(location.lat),
        lng: Number(location.lng),
        formattedAddress: result.formatted_address ?? address,
        placeId: String(result.place_id ?? address),
      };
    }
  } catch (error) {
    console.warn('[googleMaps] Geocoding API error/fallback for:', address, error);
  }

  // Resilient fallback for un-geocodable text strings or mock locations
  const parts = address.split(',').map(s => s.trim());
  const fallbackLat = extractedLat ?? 11.9650;
  const fallbackLng = extractedLng ?? 8.5371;

  return {
    street: parts[0] ?? address,
    city: parts[1] ?? parts[0] ?? 'Kano',
    state: parts[2] ?? 'Kano State',
    country: 'Nigeria',
    lat: fallbackLat,
    lng: fallbackLng,
    formattedAddress: address,
    placeId: address,
  };
}

/**
 * Fetch a road-following route between two coordinates via the Google Directions API.
 *
 * Strategy:
 *  1. Validate inputs — guard against NaN/Infinity from upstream DB reads.
 *  2. Call Directions API (driving mode).
 *  3. Decode step-level polylines from every leg for maximum road accuracy,
 *     falling back to the lower-resolution overview_polyline if steps are absent.
 *  4. On ANY failure, log the exact API status + error_message so the caller
 *     can diagnose permission issues (REQUEST_DENIED = Directions API not enabled
 *     for the key) vs quota/network errors, then return a straight-line fallback.
 */
export async function getDirectionsRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<Array<{ latitude: number; longitude: number }>> {
  const straight = [
    { latitude: originLat, longitude: originLng },
    { latitude: destLat, longitude: destLng },
  ];

  // Guard: NaN or Infinity coordinates produce a useless API call.
  if (
    !Number.isFinite(originLat) || !Number.isFinite(originLng) ||
    !Number.isFinite(destLat)   || !Number.isFinite(destLng)
  ) {
    console.error('[googleMaps] getDirectionsRoute: non-finite coordinates', { originLat, originLng, destLat, destLng });
    return straight;
  }

  try {
    const { data } = await googleMaps.get('/directions/json', {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        key: env.GOOGLE_MAPS_API_KEY,
        mode: 'driving',
        alternatives: false,
      },
    });

    // ── Diagnose failures immediately ────────────────────────────────────────
    if (data?.status !== 'OK') {
      console.warn(
        '[googleMaps] getDirectionsRoute: Directions API did not return OK.',
        `\n  status        : ${data?.status ?? 'unknown'}`,
        `\n  error_message : ${data?.error_message ?? '(none)'}`,
        '\n  Possible causes:',
        '\n    REQUEST_DENIED  → Directions API not enabled for this key in Google Cloud Console',
        '\n    ZERO_RESULTS    → No drivable route between these coordinates',
        '\n    OVER_QUERY_LIMIT → Daily quota exhausted',
        `\n  origin      : ${originLat},${originLng}`,
        `\n  destination : ${destLat},${destLng}`,
      );
      return straight;
    }

    const route = data.routes[0];

    // ── Prefer step-level polylines (highest resolution) ────────────────────
    const legs: Array<{ steps?: Array<{ polyline?: { points?: string } }> }> = route?.legs ?? [];
    const stepPoints: Array<{ latitude: number; longitude: number }> = [];

    for (const leg of legs) {
      for (const step of leg.steps ?? []) {
        const encoded = step?.polyline?.points;
        if (encoded) {
          stepPoints.push(...decodePolyline(encoded));
        }
      }
    }

    if (stepPoints.length > 1) return stepPoints;

    // ── Fallback: overview_polyline (lower resolution but always present) ───
    const overviewPolyline: string | undefined = route?.overview_polyline?.points;
    if (overviewPolyline) return decodePolyline(overviewPolyline);

    console.warn('[googleMaps] getDirectionsRoute: route present but no polyline data found');
    return straight;
  } catch (err) {
    console.error('[googleMaps] getDirectionsRoute: network/unexpected error', err);
    return straight;
  }
}

export async function reverseGeocode(lat: number, lng: number) {
  try {
    const { data } = await googleMaps.get('/geocode/json', {
      params: { latlng: `${lat},${lng}`, key: env.GOOGLE_MAPS_API_KEY },
    });

    const result = data?.results?.[0];
    const location = result?.geometry?.location;
    if (!result || !location) throw new ValidationError('Unable to reverse geocode coordinates');

    const parts = String(result.formatted_address).split(',').map((part: string) => part.trim());

    return {
      street: parts[0] ?? 'Unknown Street',
      city: parts[1] ?? parts[0] ?? 'Unknown City',
      state: parts[2] ?? parts[1] ?? 'Unknown State',
      country: parts[3] ?? 'Nigeria',
      lat: Number(location.lat),
      lng: Number(location.lng),
      formattedAddress: result.formatted_address,
      placeId: String(result.place_id),
    };
  } catch (error) {
    wrapError(error);
  }
}

export async function autocompletePlaces(input: string, lat?: number, lng?: number) {
  if (!input) return [];
  try {
    const params: Record<string, string | number> = {
      input,
      key: env.GOOGLE_MAPS_API_KEY,
      components: 'country:ng',
    };

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      params.location = `${lat},${lng}`;
      params.radius = 50000;
    }

    const { data } = await googleMaps.get('/place/autocomplete/json', { params });

    if (data?.status !== 'OK' && data?.status !== 'ZERO_RESULTS') {
      console.warn('[googleMaps] autocompletePlaces returned status:', data?.status, data?.error_message);
      return [];
    }

    const predictions = data?.predictions ?? [];
    return predictions.map((pred: any) => ({
      description: pred.description,
      placeId: pred.place_id,
      mainText: pred.structured_formatting?.main_text ?? pred.description,
      secondaryText: pred.structured_formatting?.secondary_text ?? '',
    }));
  } catch (error) {
    console.error('[googleMaps] autocompletePlaces error:', error);
    return [];
  }
}

export async function getPlaceDetails(placeId: string) {
  try {
    // Try Place Details API first
    const { data: placeData } = await googleMaps.get('/place/details/json', {
      params: { place_id: placeId, key: env.GOOGLE_MAPS_API_KEY, fields: 'formatted_address,geometry,place_id,address_components' },
    });

    const result = placeData?.result;
    const location = result?.geometry?.location;

    if (result && location) {
      const parts = String(result.formatted_address ?? '').split(',').map((part: string) => part.trim());
      return {
        street: parts[0] ?? 'Selected Location',
        city: parts[1] ?? parts[0] ?? 'City',
        state: parts[2] ?? parts[1] ?? 'State',
        country: parts[3] ?? 'Nigeria',
        lat: Number(location.lat),
        lng: Number(location.lng),
        formattedAddress: result.formatted_address ?? 'Selected Location',
        placeId: String(result.place_id ?? placeId),
      };
    }

    // Fallback to Geocoding API
    const { data: geocodeData } = await googleMaps.get('/geocode/json', {
      params: { place_id: placeId, key: env.GOOGLE_MAPS_API_KEY },
    });

    const geoResult = geocodeData?.results?.[0];
    const geoLoc = geoResult?.geometry?.location;
    if (!geoResult || !geoLoc) throw new ValidationError('Unable to geocode place ID');

    const parts = String(geoResult.formatted_address).split(',').map((part: string) => part.trim());

    return {
      street: parts[0] ?? 'Selected Location',
      city: parts[1] ?? parts[0] ?? 'City',
      state: parts[2] ?? parts[1] ?? 'State',
      country: parts[3] ?? 'Nigeria',
      lat: Number(geoLoc.lat),
      lng: Number(geoLoc.lng),
      formattedAddress: geoResult.formatted_address,
      placeId: String(geoResult.place_id ?? placeId),
    };
  } catch (error) {
    wrapError(error);
  }
}

