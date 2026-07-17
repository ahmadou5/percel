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
    if (!distanceKm || !durationMin) throw new ValidationError('Google Maps returned an empty route');

    return { distanceKm, durationMin };
  } catch (error) {
    wrapError(error);
  }
}

export async function geocodeAddress(address: string) {
  try {
    const { data } = await googleMaps.get('/geocode/json', {
      params: { address, key: env.GOOGLE_MAPS_API_KEY },
    });

    const result = data?.results?.[0];
    const location = result?.geometry?.location;
    if (!result || !location) throw new ValidationError('Unable to geocode address');

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
  } catch (error) {
    wrapError(error);
  }
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

