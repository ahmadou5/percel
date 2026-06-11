export type HubType = 'office' | 'agent' | 'partner_park';

export type Hub = {
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
};

export type Route = {
  id: string;
  originHubId: string;
  destinationHubId: string;
  baseFare: number;
  estimatedDays: number;
  isActive: boolean;
};

export type RouteWithHubs = Route & {
  originHub: Hub;
  destinationHub: Hub;
};
