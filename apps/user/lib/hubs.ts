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

export function getHubById(id?: string | null) {
  if (!id) return null;
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

export function getRouteWithHubs(originHubId?: string | null, destinationHubId?: string | null): RouteWithHubs | null {
  const route = getRoute(originHubId, destinationHubId);
  if (!route) return null;

  const originHub = getHubById(route.originHubId);
  const destinationHub = getHubById(route.destinationHubId);
  if (!originHub || !destinationHub) return null;

  return {
    ...route,
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
