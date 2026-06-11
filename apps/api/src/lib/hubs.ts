import { haversineDistanceKm } from '../utils/helpers.js';

export type HubType = 'office' | 'agent' | 'partner_park';

export interface Hub {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  lat: number;
  lng: number;
  type: HubType;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Route {
  id: string;
  originHubId: string;
  destinationHubId: string;
  baseFare: number;
  estimatedDays: number;
  isActive: boolean;
}

export interface RouteWithHubs extends Route {
  originHub: Hub;
  destinationHub: Hub;
}

const hubs: Hub[] = [
  {
    id: 'hub-lagos-ojuelegba',
    name: 'Ojuelegba Hub',
    city: 'Lagos',
    state: 'Lagos',
    address: '14 Ojuelegba Rd, Surulere, Lagos',
    lat: 6.5046,
    lng: 3.3754,
    type: 'office',
    contactPhone: '+2348012345678',
    isActive: true,
    createdAt: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'hub-abuja-utako',
    name: 'Utako Hub',
    city: 'Abuja',
    state: 'FCT',
    address: 'Plot 112, Utako District, Abuja',
    lat: 9.0852,
    lng: 7.3986,
    type: 'agent',
    contactPhone: '+2348012345679',
    isActive: true,
    createdAt: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'hub-ph-gra',
    name: 'GRA Hub',
    city: 'Port Harcourt',
    state: 'Rivers',
    address: '34 Stadium Rd, GRA Phase 2, Port Harcourt',
    lat: 4.8156,
    lng: 7.0498,
    type: 'partner_park',
    contactPhone: '+2348012345680',
    isActive: true,
    createdAt: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'hub-kano-gyadi-gyadi',
    name: 'Gyadi Gyadi Hub',
    city: 'Kano',
    state: 'Kano',
    address: '23 Maiduguri Rd, Gyadi Gyadi, Kano',
    lat: 12.0022,
    lng: 8.521,
    type: 'office',
    contactPhone: '+2348012345681',
    isActive: true,
    createdAt: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'hub-ibadan-ring-road',
    name: 'Ring Road Hub',
    city: 'Ibadan',
    state: 'Oyo',
    address: '86 Ring Rd, Ibadan',
    lat: 7.3775,
    lng: 3.947,
    type: 'partner_park',
    contactPhone: '+2348012345682',
    isActive: true,
    createdAt: '2026-01-12T08:00:00.000Z',
  },
];

const routes: Route[] = [
  { id: 'route-lagos-abuja', originHubId: 'hub-lagos-ojuelegba', destinationHubId: 'hub-abuja-utako', baseFare: 4500, estimatedDays: 2, isActive: true },
  { id: 'route-lagos-ibadan', originHubId: 'hub-lagos-ojuelegba', destinationHubId: 'hub-ibadan-ring-road', baseFare: 1800, estimatedDays: 1, isActive: true },
  { id: 'route-abuja-port-harcourt', originHubId: 'hub-abuja-utako', destinationHubId: 'hub-ph-gra', baseFare: 5200, estimatedDays: 3, isActive: true },
  { id: 'route-kano-abuja', originHubId: 'hub-kano-gyadi-gyadi', destinationHubId: 'hub-abuja-utako', baseFare: 4800, estimatedDays: 2, isActive: true },
  { id: 'route-ph-ibadan', originHubId: 'hub-ph-gra', destinationHubId: 'hub-ibadan-ring-road', baseFare: 5600, estimatedDays: 3, isActive: true },
];

const hubById = new Map(hubs.map((hub) => [hub.id, hub] as const));
const routeById = new Map(routes.map((route) => [route.id, route] as const));

export function listHubs() {
  return hubs.filter((hub) => hub.isActive);
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
  return routeById.get(routeId) ?? null;
}

export function getRouteWithHubs(originHubId?: string | null, destinationHubId?: string | null): RouteWithHubs | null {
  const route = getRoute(originHubId, destinationHubId);
  if (!route) return null;

  const originHub = getHubById(route.originHubId);
  const destinationHub = getHubById(route.destinationHubId);
  if (!originHub || !destinationHub) return null;

  return { ...route, originHub, destinationHub };
}

export function resolveHubRouteContext(originHubId?: string | null, destinationHubId?: string | null, routeId?: string | null) {
  const originHub = getHubById(originHubId);
  const destinationHub = getHubById(destinationHubId);
  const route = getRouteById(routeId) ?? getRoute(originHubId, destinationHubId);

  if (!originHub || !destinationHub || !route) return null;
  if (route.originHubId !== originHub.id || route.destinationHubId !== destinationHub.id) return null;

  return {
    originHub,
    destinationHub,
    route,
    distanceKm: haversineDistanceKm(originHub.lat, originHub.lng, destinationHub.lat, destinationHub.lng),
    durationMin: Math.max(route.estimatedDays * 12 * 60, 60),
  };
}

export function formatHubLabel(hub: Hub) {
  return `${hub.city} — ${hub.name}`;
}

export function formatHubLocation(hub: Hub) {
  return `${hub.city}, ${hub.state}`;
}

export function formatHubType(hub: Hub) {
  switch (hub.type) {
    case 'office':
      return 'Office';
    case 'agent':
      return 'Agent';
    case 'partner_park':
      return 'Partner park';
  }
}

export function composePickupAddress(hub: Hub, localPickupAddress: string) {
  const local = localPickupAddress.trim();
  return `${local || 'Local pickup near hub'} · ${hub.name}, ${hub.city}, ${hub.state}`;
}

export function composeDeliveryAddress(hub: Hub) {
  return `${hub.name}, ${hub.city}, ${hub.state}`;
}
