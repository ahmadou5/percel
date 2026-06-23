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
 * Returns decoded polyline points. Falls back to a straight two-point line on any error.
 */
export async function getDirectionsRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<Array<{ latitude: number; longitude: number }>> {
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

    const route = data?.routes?.[0];
    const polyline: string | undefined = route?.overview_polyline?.points;
    if (!polyline) {
      return [
        { latitude: originLat, longitude: originLng },
        { latitude: destLat, longitude: destLng },
      ];
    }

    return decodePolyline(polyline);
  } catch {
    return [
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng },
    ];
  }
}
