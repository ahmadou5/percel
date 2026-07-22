import { hubs, routes } from '@/seed/hubs';
import type { Hub, HubType, Route, RouteWithHubs } from '@/types/hubs';

const hubById = new Map(hubs.map((hub) => [hub.id, hub] as const));

export const hubTypes: Record<HubType, string> = {
  office: 'Office',
  agent: 'Agent',
  partner_park: 'Partner park',
};

export function listHubs() {
  return hubs.slice().filter((hub) => hub.isActive);
}

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getHubById(id?: string | null, activeHubs?: Hub[]) {
  if (!id) return null;
  if (activeHubs && activeHubs.length > 0) {
    const found = activeHubs.find((h) => h.id === id);
    if (found) return found;
  }
  return hubById.get(id) ?? null;
}

export function getRoute(originHubId?: string | null, destinationHubId?: string | null) {
  if (!originHubId || !destinationHubId || originHubId === destinationHubId) return null;
  return routes.find((route) => route.isActive && route.originHubId === originHubId && route.destinationHubId === destinationHubId) ?? null;
}

export function getRouteById(routeId?: string | null) {
  if (!routeId) return null;
  return routes.find((route) => route.id === routeId && route.isActive) ?? null;
}

export function getRouteWithHubs(
  origin: Hub | string | null | undefined,
  destination: Hub | string | null | undefined,
  activeHubs?: Hub[]
): RouteWithHubs | null {
  const originHub = typeof origin === 'string' ? getHubById(origin, activeHubs) : origin ?? null;
  const destinationHub = typeof destination === 'string' ? getHubById(destination, activeHubs) : destination ?? null;

  if (!originHub || !destinationHub || originHub.id === destinationHub.id) return null;

  const existingRoute = getRoute(originHub.id, destinationHub.id);
  if (existingRoute) {
    return {
      ...existingRoute,
      originHub,
      destinationHub,
    };
  }

  // Dynamic route calculation for DB hubs without pre-seeded Route rows
  const distanceKm = calculateHaversineDistanceKm(
    Number(originHub.lat), Number(originHub.lng),
    Number(destinationHub.lat), Number(destinationHub.lng)
  );

  const baseFare = Math.round(Math.max(1500, distanceKm * 15));
  const estimatedDays = Math.max(1, Math.ceil(distanceKm / 400));

  return {
    id: `route-${originHub.id}-${destinationHub.id}`,
    originHubId: originHub.id,
    destinationHubId: destinationHub.id,
    baseFare,
    estimatedDays,
    isActive: true,
    originHub,
    destinationHub,
  };
}

export function formatHubLabel(hub: Hub) {
  return `${hub.city} — ${hub.name}`;
}

export function formatHubLocation(hub: Hub) {
  return `${hub.city}, ${hub.state}`;
}

export function formatHubType(hub: Hub) {
  return hubTypes[hub.type];
}

export function composePickupAddress(hub: Hub, localPickupAddress: string) {
  const local = localPickupAddress.trim();
  return `${local || 'Local pickup near hub'} · ${hub.name}, ${hub.city}, ${hub.state}`;
}

export function composeDeliveryAddress(hub: Hub) {
  return `${hub.name}, ${hub.city}, ${hub.state}`;
}

export function buildRouteSummary(route: Route) {
  return {
    baseFare: route.baseFare,
    estimatedDays: route.estimatedDays,
  };
}
