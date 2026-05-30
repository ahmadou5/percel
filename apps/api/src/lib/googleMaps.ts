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
