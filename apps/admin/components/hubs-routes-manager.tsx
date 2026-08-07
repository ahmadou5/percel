'use client';

import { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Truck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Info,
  Sliders,
  History,
  Navigation,
  ArrowRight,
  ShieldAlert,
  Search,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AdminHub, AdminRoute, PricingAuditRecord } from '@/lib/admin-data';

import { HubCoordinatePicker } from './hub-coordinate-picker';
import { NetworkMapVisualization } from './network-map-visualization';

// Initial Seed Fallback Data for Hubs if API returns empty
const DEFAULT_HUBS: AdminHub[] = [
  {
    id: 'hub-jabi',
    name: 'Jabi Central Hub',
    city: 'Abuja',
    state: 'FCT',
    address: 'Hausawa Dan Fulani',
    lat: 9.0765,
    lng: 7.3986,
    type: 'office',
    contactPhone: '+2348000000101',
    isActive: true,
    basePricingModifier: 1.0,
    auditHistory: [
      {
        id: 'aud-h1',
        serviceAreaId: 'hub-jabi',
        cityName: 'Jabi Central Hub',
        adminName: 'Super Admin',
        field: 'Price Modifier',
        oldValue: 1.2,
        newValue: 1.0,
        timestamp: 'Jul 24, 2026, 10:30 AM',
      },
    ],
  },
  {
    id: 'hub-mariri',
    name: 'Mariri Transport Hub',
    city: 'Kano',
    state: 'Kano',
    address: 'Hausawa Dan Fulani',
    lat: 12.0022,
    lng: 8.592,
    type: 'partner_park',
    contactPhone: '+2348000000102',
    isActive: true,
    basePricingModifier: 1.15,
    auditHistory: [],
  },
  {
    id: 'hub-ibb',
    name: 'IBB Way Terminal',
    city: 'Kano',
    state: 'Kano',
    address: 'Hausawa Dan Fulani',
    lat: 11.9961,
    lng: 8.5412,
    type: 'agent',
    contactPhone: '+2348000000103',
    isActive: true,
    basePricingModifier: 0.95,
    auditHistory: [],
  },
];

// Initial Seed Fallback Data for Interstate Routes
const DEFAULT_ROUTES: AdminRoute[] = [
  {
    id: 'rt-jabi-mariri',
    originHubId: 'hub-mariri',
    destinationHubId: 'hub-jabi',
    baseFare: 18000,
    estimatedDays: 1,
    isActive: true,
    auditHistory: [
      {
        id: 'aud-r1',
        serviceAreaId: 'rt-jabi-mariri',
        cityName: 'Mariri → Jabi Route',
        adminName: 'Logistics Admin',
        field: 'Base Route Fare',
        oldValue: 15000,
        newValue: 18000,
        timestamp: 'Jul 25, 2026, 04:20 PM',
      },
    ],
  },
];

// Haversine Distance Helper (calculates straight-line km between two lat/lng pairs)
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2 || lat1 === 0 || lat2 === 0) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Normalized Hub Type Label Formatter
function formatHubTypeLabel(type: string): string {
  if (type === 'partner_park') return 'Partner Park';
  if (type === 'agent') return 'Agent';
  return 'Office Station';
}

export function HubsRoutesManager({ initialHubs, initialRoutes }: { initialHubs: AdminHub[]; initialRoutes: AdminRoute[] }) {
  const [hubs, setHubs] = useState<AdminHub[]>(initialHubs || []);
  const [routes, setRoutes] = useState<AdminRoute[]>(initialRoutes || []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'hubs' | 'routes' | 'audit'>('hubs');
  const [showNetworkMap, setShowNetworkMap] = useState(true);

  // Hub Form State (Create / Edit)
  const [editingHubId, setEditingHubId] = useState<string | null>(null);
  const [hubName, setHubName] = useState('');
  const [hubCity, setHubCity] = useState('');
  const [hubState, setHubState] = useState('');
  const [hubAddress, setHubAddress] = useState('');
  const [hubPhone, setHubPhone] = useState('');
  const [hubLat, setHubLat] = useState<number>(9.0765);
  const [hubLng, setHubLng] = useState<number>(7.3986);
  const [hubType, setHubType] = useState<'office' | 'agent' | 'partner_park'>('office');
  const [hubModifier, setHubModifier] = useState<number | ''>(1.0);
  const [hubActive, setHubActive] = useState(true);
  const [hubValidationErrors, setHubValidationErrors] = useState<Record<string, string>>({});

  // Route Form State (Create / Edit)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [originHubId, setOriginHubId] = useState('');
  const [destHubId, setDestHubId] = useState('');
  const [routeBaseFare, setRouteBaseFare] = useState<number | ''>(15000);
  const [routeEstDays, setRouteEstDays] = useState<number | ''>(1);
  const [routeActive, setRouteActive] = useState(true);
  const [routeValidationErrors, setRouteValidationErrors] = useState<Record<string, string>>({});

  // Expandable Row & Modal States
  const [deactivatingHub, setDeactivatingHub] = useState<AdminHub | null>(null);
  const [expandedHubAudit, setExpandedHubAudit] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset Hub Form
  const resetHubForm = () => {
    setEditingHubId(null);
    setHubName('');
    setHubCity('');
    setHubState('');
    setHubAddress('');
    setHubPhone('');
    setHubLat(9.0765);
    setHubLng(7.3986);
    setHubType('office');
    setHubModifier(1.0);
    setHubActive(true);
    setHubValidationErrors({});
  };

  // Reset Route Form
  const resetRouteForm = () => {
    setEditingRouteId(null);
    setOriginHubId('');
    setDestHubId('');
    setRouteBaseFare(15000);
    setRouteEstDays(1);
    setRouteActive(true);
    setRouteValidationErrors({});
  };

  // Populate Hub Form for Edit
  const handleEditHubClick = (hub: AdminHub) => {
    setEditingHubId(hub.id);
    setHubName(hub.name);
    setHubCity(hub.city);
    setHubState(hub.state);
    setHubAddress(hub.address);
    setHubPhone(hub.contactPhone || '');
    setHubLat(hub.lat || 9.0765);
    setHubLng(hub.lng || 7.3986);
    setHubType(hub.type);
    setHubModifier(hub.basePricingModifier ?? 1.0);
    setHubActive(hub.isActive);
    setHubValidationErrors({});
    setActiveTab('hubs');
  };

  // Populate Route Form for Edit
  const handleEditRouteClick = (route: AdminRoute) => {
    setEditingRouteId(route.id);
    setOriginHubId(route.originHubId);
    setDestHubId(route.destinationHubId);
    setRouteBaseFare(Number(route.baseFare));
    setRouteEstDays(route.estimatedDays);
    setRouteActive(route.isActive);
    setRouteValidationErrors({});
    setActiveTab('routes');
  };

  // 1. Form Validation + Map Picker for Hubs (Order #1)
  const handleSubmitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const trimmedName = hubName.trim();
    const trimmedCity = hubCity.trim();
    const trimmedState = hubState.trim();
    const trimmedAddress = hubAddress.trim();
    const trimmedPhone = hubPhone.trim();
    const numMod = typeof hubModifier === 'number' ? hubModifier : Number(hubModifier);

    if (!trimmedName) errors.name = 'Hub Name is required';
    if (!trimmedCity) errors.city = 'City is required';
    if (!trimmedState) errors.state = 'State is required';
    if (!trimmedAddress) errors.address = 'Address is required';
    if (!trimmedPhone) errors.contactPhone = 'Contact Phone is required';

    if (isNaN(numMod) || numMod < 0) {
      errors.modifier = 'Base Price Modifier must be ≥ 0';
    }

    if (Object.keys(errors).length > 0) {
      setHubValidationErrors(errors);
      return;
    }

    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

    try {
      const url = editingHubId ? `/api/admin/hubs/${editingHubId}` : '/api/admin/hubs';
      const method = editingHubId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          city: trimmedCity,
          state: trimmedState,
          address: trimmedAddress,
          contactPhone: trimmedPhone,
          lat: hubLat,
          lng: hubLng,
          type: hubType,
          basePricingModifier: numMod,
          isActive: hubActive,
        }),
      });

      const resData = await response.json().catch(() => null);
      const savedHub: AdminHub = resData?.data ?? {
        id: editingHubId || `hub-${Date.now()}`,
        name: trimmedName,
        city: trimmedCity,
        state: trimmedState,
        address: trimmedAddress,
        contactPhone: trimmedPhone,
        lat: hubLat,
        lng: hubLng,
        type: hubType,
        basePricingModifier: numMod,
        isActive: hubActive,
      };

      if (editingHubId) {
        setHubs((prev) =>
          prev.map((item) => {
            if (item.id !== editingHubId) return item;
            const auditEntries: PricingAuditRecord[] = [...(item.auditHistory || [])];
            if (item.basePricingModifier !== numMod) {
              auditEntries.unshift({
                id: `aud-${Date.now()}`,
                serviceAreaId: item.id,
                cityName: item.name,
                adminName: 'Operations Admin',
                field: 'Price Modifier',
                oldValue: item.basePricingModifier,
                newValue: numMod,
                timestamp: nowStr,
              });
            }
            return { ...savedHub, auditHistory: auditEntries };
          })
        );
      } else {
        setHubs((prev) => [
          {
            ...savedHub,
            auditHistory: [
              {
                id: `aud-${Date.now()}`,
                serviceAreaId: savedHub.id,
                cityName: trimmedName,
                adminName: 'Operations Admin',
                field: 'Hub Created',
                oldValue: 'N/A',
                newValue: `Modifier: ${numMod}x`,
                timestamp: nowStr,
              },
            ],
          },
          ...prev,
        ]);
      }

      resetHubForm();
    } catch (err: any) {
      alert(err.message || 'Failed to save hub');
    }
  };

  // 3. Live Pricing Preview for Route Form (Order #3)
  const routePreviewDistanceAndFare = useMemo(() => {
    const origin = hubs.find((h) => h.id === originHubId);
    const dest = hubs.find((h) => h.id === destHubId);

    if (!origin || !dest || !origin.lat || !dest.lat) return null;

    const distanceKm = calculateHaversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);
    const ratePerKm = 80; // Standard interstate per-km rate
    const calculatedFare = Math.round(distanceKm * ratePerKm * (origin.basePricingModifier || 1.0));

    return {
      distanceKm,
      calculatedFare,
      originName: origin.name,
      destName: dest.name,
    };
  }, [originHubId, destHubId, hubs]);

  // Route Form Submit Handler
  const handleSubmitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!originHubId) errors.originHubId = 'Select an Origin Hub';
    if (!destHubId) errors.destHubId = 'Select a Destination Hub';

    if (originHubId && destHubId && originHubId === destHubId) {
      errors.destHubId = 'Origin and Destination hub cannot be the same';
    }

    const numFare = typeof routeBaseFare === 'number' ? routeBaseFare : Number(routeBaseFare);
    const numDays = typeof routeEstDays === 'number' ? routeEstDays : Number(routeEstDays);

    if (isNaN(numFare) || numFare <= 0) {
      errors.baseFare = 'Base Route Fare must be greater than ₦0';
    }
    if (isNaN(numDays) || numDays < 1 || numDays > 14) {
      errors.estimatedDays = 'Transit time must be between 1 and 14 days';
    }

    if (Object.keys(errors).length > 0) {
      setRouteValidationErrors(errors);
      return;
    }

    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

    try {
      const url = editingRouteId ? `/api/admin/routes/${editingRouteId}` : '/api/admin/routes';
      const method = editingRouteId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originHubId,
          destinationHubId: destHubId,
          baseFare: numFare,
          estimatedDays: numDays,
          isActive: routeActive,
        }),
      });

      const resData = await response.json().catch(() => null);
      const savedRoute: AdminRoute = resData?.data ?? {
        id: editingRouteId || `rt-${Date.now()}`,
        originHubId,
        destinationHubId: destHubId,
        baseFare: numFare,
        estimatedDays: numDays,
        isActive: routeActive,
      };

      if (editingRouteId) {
        setRoutes((prev) =>
          prev.map((r) => {
            if (r.id !== editingRouteId) return r;
            const auditEntries: PricingAuditRecord[] = [...(r.auditHistory || [])];
            if (Number(r.baseFare) !== numFare) {
              auditEntries.unshift({
                id: `aud-rt-${Date.now()}`,
                serviceAreaId: r.id,
                cityName: 'Route Fare Edit',
                adminName: 'Operations Admin',
                field: 'Base Route Fare',
                oldValue: Number(r.baseFare),
                newValue: numFare,
                timestamp: nowStr,
              });
            }
            return { ...savedRoute, auditHistory: auditEntries };
          })
        );
      } else {
        setRoutes((prev) => [
          {
            ...savedRoute,
            auditHistory: [
              {
                id: `aud-rt-${Date.now()}`,
                serviceAreaId: savedRoute.id,
                cityName: 'New Route Created',
                adminName: 'Operations Admin',
                field: 'Route Fare',
                oldValue: 'N/A',
                newValue: numFare,
                timestamp: nowStr,
              },
            ],
          },
          ...prev,
        ]);
      }

      resetRouteForm();
    } catch (err: any) {
      alert(err.message || 'Failed to save route');
    }
  };

  // Check if Duplicate Route exists (warning note)
  const isDuplicateRouteExisting = useMemo(() => {
    if (!originHubId || !destHubId || originHubId === destHubId) return false;
    return routes.some(
      (r) => r.id !== editingRouteId && r.originHubId === originHubId && r.destinationHubId === destHubId
    );
  }, [originHubId, destHubId, routes, editingRouteId]);

  // Hub Deactivation Trigger with Warning Modal (Order #2)
  const handleToggleHubActiveClick = (hub: AdminHub) => {
    // Check connected routes count
    const connected = routes.filter((r) => r.originHubId === hub.id || r.destinationHubId === hub.id);

    if (hub.isActive && connected.length > 0) {
      setDeactivatingHub(hub);
      return;
    }

    toggleHubStatus(hub.id);
  };

  const toggleHubStatus = (hubId: string) => {
    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
    setHubs((prev) =>
      prev.map((h) => {
        if (h.id !== hubId) return h;
        const nextActive = !h.isActive;
        const auditEntries: PricingAuditRecord[] = [
          {
            id: `aud-${Date.now()}`,
            serviceAreaId: h.id,
            cityName: h.name,
            adminName: 'Operations Admin',
            field: 'Status',
            oldValue: h.isActive ? 'Active' : 'Inactive',
            newValue: nextActive ? 'Active' : 'Inactive',
            timestamp: nowStr,
          },
          ...(h.auditHistory || []),
        ];
        return { ...h, isActive: nextActive, auditHistory: auditEntries };
      })
    );
    setDeactivatingHub(null);
  };

  // Filtered Hubs & Routes
  const filteredHubs = useMemo(() => {
    if (!searchQuery.trim()) return hubs;
    const q = searchQuery.toLowerCase().trim();
    return hubs.filter(
      (h) => h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q) || h.state.toLowerCase().includes(q)
    );
  }, [hubs, searchQuery]);

  // Global Audit Logs across Hubs & Routes
  const globalAuditLogs = useMemo(() => {
    const logs: PricingAuditRecord[] = [];
    hubs.forEach((h) => {
      if (h.auditHistory) logs.push(...h.auditHistory);
    });
    routes.forEach((r) => {
      if (r.auditHistory) logs.push(...r.auditHistory);
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [hubs, routes]);

  return (
    <div className="space-y-6">
      {/* Context Data Quality Alert Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-xs">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Data Integrity Notices for Backend / Logistics Team:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-200/90">
            <li>
              <strong>Placeholder Address Notice:</strong> Hubs (Jabi, Mariri, IBB) share identical address{' '}
              <code className="bg-amber-500/20 px-1 py-0.2 rounded font-mono font-bold">&quot;Hausawa Dan Fulani&quot;</code> despite being in different states. Update addresses before production dispatch.
            </li>
            <li>
              <strong>Coordinate Picker Enabled:</strong> Map coordinate selection now replaces manual 0/0 lat/long inputs.
            </li>
            <li>
              <strong>Orphaned Hub Flag:</strong> <strong className="font-mono text-amber-600">IBB Way Terminal</strong> currently has 0 connected routes.
            </li>
          </ul>
        </div>
      </div>

      {/* Network Topology Map Toggle & View (Order #4) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            Network Topology & Hub Locations
          </h3>
          <button
            type="button"
            onClick={() => setShowNetworkMap(!showNetworkMap)}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 border border-border px-3 py-1.5 rounded-xl bg-card"
          >
            {showNetworkMap ? 'Hide Network Map' : 'Show Network Map'}
          </button>
        </div>

        {showNetworkMap && <NetworkMapVisualization hubs={hubs} routes={routes} />}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('hubs')}
          className={`px-5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
            activeTab === 'hubs'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-3.5 w-3.5 inline mr-1.5" />
          Hubs Management ({hubs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          className={`px-5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
            activeTab === 'routes'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Truck className="h-3.5 w-3.5 inline mr-1.5" />
          Interstate Routes ({routes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-3.5 w-3.5 inline mr-1.5" />
          Pricing Audit Log ({globalAuditLogs.length})
        </button>
      </div>

      {/* TAB 1: HUBS MANAGEMENT */}
      {activeTab === 'hubs' && (
        <div className="space-y-6">
          {/* Hub Form & Map Picker (Order #1) */}
          <Card className="p-5 border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                {editingHubId ? 'Edit Logistics Hub' : 'Add New Logistics Network Hub'}
              </h3>
              {editingHubId && (
                <button
                  type="button"
                  onClick={resetHubForm}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitHub} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Hub Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Hub Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. Jabi Central Hub"
                  />
                  {hubValidationErrors.name && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{hubValidationErrors.name}</p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hubCity}
                    onChange={(e) => setHubCity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. Abuja"
                  />
                  {hubValidationErrors.city && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{hubValidationErrors.city}</p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hubState}
                    onChange={(e) => setHubState(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. FCT"
                  />
                  {hubValidationErrors.state && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{hubValidationErrors.state}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Full Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hubAddress}
                    onChange={(e) => setHubAddress(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. 14 Jabi Motor Park, Abuja"
                  />
                  {hubValidationErrors.address && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{hubValidationErrors.address}</p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hubPhone}
                    onChange={(e) => setHubPhone(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="+2348000000101"
                  />
                  {hubValidationErrors.contactPhone && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{hubValidationErrors.contactPhone}</p>
                  )}
                </div>

                {/* Hub Type (Normalized Dropdown) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Hub Type
                  </label>
                  <select
                    value={hubType}
                    onChange={(e) => setHubType(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="office">Office Station</option>
                    <option value="partner_park">Partner Park</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>

                {/* Base Price Modifier */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Base Price Modifier (≥ 0)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={hubModifier}
                    onChange={(e) => setHubModifier(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="1.0"
                  />
                  {hubValidationErrors.modifier && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{hubValidationErrors.modifier}</p>
                  )}
                </div>
              </div>

              {/* Map Coordinate Picker Widget (Order #1) */}
              <div className="pt-2">
                <HubCoordinatePicker
                  lat={hubLat}
                  lng={hubLng}
                  city={hubCity}
                  state={hubState}
                  onChange={(newLat, newLng) => {
                    setHubLat(newLat);
                    setHubLng(newLng);
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={hubActive}
                    onChange={(e) => setHubActive(e.target.checked)}
                    className="rounded border-border bg-background text-primary focus:ring-primary/20 h-4 w-4"
                  />
                  Hub Active
                </label>

                <div className="flex items-center gap-2">
                  {editingHubId && (
                    <button
                      type="button"
                      onClick={resetHubForm}
                      className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
                  >
                    {editingHubId ? 'Update Hub' : 'Save Hub'}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          {/* Hubs Table (Order #2: Connected Routes Count & Table) */}
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search hub name, city, or state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <span className="text-xs font-semibold text-muted-foreground">
                Showing {filteredHubs.length} of {hubs.length} hubs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Hub Name</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Address</th>
                    <th className="px-5 py-3.5">Hub Type</th>
                    <th className="px-5 py-3.5">Price Modifier</th>
                    <th className="px-5 py-3.5">Connected Routes</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredHubs.length > 0 ? (
                    filteredHubs.map((hub) => {
                      const connectedRoutesCount = routes.filter(
                        (r) => r.originHubId === hub.id || r.destinationHubId === hub.id
                      ).length;
                      const isOrphaned = connectedRoutesCount === 0;

                      return (
                        <tr key={hub.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-foreground">
                            {hub.name}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {hub.city}, {hub.state}
                          </td>

                          {/* Address with Placeholder Data Warning Flag */}
                          <td className="px-5 py-3.5 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[150px]" title={hub.address}>
                                {hub.address}
                              </span>
                              {hub.address.toLowerCase().includes('hausawa') && (
                                <span
                                  title="Placeholder duplicate address flagged for correction"
                                  className="cursor-help text-amber-500"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 inline" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Hub Type Normalized Display */}
                          <td className="px-5 py-3.5 text-xs">
                            <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-medium text-foreground">
                              {formatHubTypeLabel(hub.type)}
                            </span>
                          </td>

                          {/* Price Modifier */}
                          <td className="px-5 py-3.5 font-mono font-bold">
                            {hub.basePricingModifier ?? 1.0}x
                          </td>

                          {/* Connected Routes Count (Surfaces Orphaned Hubs - Order #2) */}
                          <td className="px-5 py-3.5 whitespace-nowrap font-mono">
                            {isOrphaned ? (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                Orphaned (0 Routes)
                              </Badge>
                            ) : (
                              <span className="font-bold text-foreground">
                                {connectedRoutesCount} route(s)
                              </span>
                            )}
                          </td>

                          {/* Color-Coded Status Badge */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleHubActiveClick(hub)}
                              className="focus:outline-none"
                            >
                              {hub.isActive ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium hover:bg-emerald-500/20 cursor-pointer">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-muted text-muted-foreground border-border font-medium hover:bg-muted/80 cursor-pointer">
                                  Inactive
                                </Badge>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditHubClick(hub)}
                              className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <p className="text-sm font-semibold">No hubs configured yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: INTERSTATE ROUTES MANAGEMENT */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          {/* Route Form & Live Pricing Preview (Order #3) */}
          <Card className="p-5 border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                {editingRouteId ? 'Edit Interstate Route' : 'Configure New Interstate Route'}
              </h3>
              {editingRouteId && (
                <button
                  type="button"
                  onClick={resetRouteForm}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Cancel Edit
                </button>
              )}
            </div>

            {/* Non-Blocking Duplicate Route Warning Note */}
            {isDuplicateRouteExisting && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-500 shrink-0" />
                A route between this exact origin and destination hub pair already exists. Editing the existing route is recommended.
              </div>
            )}

            <form onSubmit={handleSubmitRoute} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Origin Hub */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Origin Hub <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={originHubId}
                    onChange={(e) => setOriginHubId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">-- Select Origin Hub --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                  {routeValidationErrors.originHubId && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{routeValidationErrors.originHubId}</p>
                  )}
                </div>

                {/* Destination Hub */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Destination Hub <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={destHubId}
                    onChange={(e) => setDestHubId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">-- Select Destination Hub --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                  {routeValidationErrors.destHubId && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{routeValidationErrors.destHubId}</p>
                  )}
                </div>

                {/* Base Route Fare (₦) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Base Route Fare (₦) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">₦</span>
                    <input
                      type="number"
                      min="1"
                      value={routeBaseFare}
                      onChange={(e) => setRouteBaseFare(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-background/50 pl-8 pr-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="15000"
                    />
                  </div>
                  {routeValidationErrors.baseFare && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{routeValidationErrors.baseFare}</p>
                  )}
                </div>

                {/* Est. Transit Days (1 - 14) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Est. Transit Time (Days: 1–14) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={routeEstDays}
                    onChange={(e) => setRouteEstDays(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="1"
                  />
                  {routeValidationErrors.estimatedDays && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">{routeValidationErrors.estimatedDays}</p>
                  )}
                </div>
              </div>

              {/* Live Distance & Suggested Fare Preview Widget (Order #3) */}
              {routePreviewDistanceAndFare && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary flex items-center gap-1.5">
                      <Navigation className="h-4 w-4" /> Live Route Distance Preview
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Straight-line distance between <strong>{routePreviewDistanceAndFare.originName}</strong> and{' '}
                      <strong>{routePreviewDistanceAndFare.destName}</strong>: ~
                      <span className="font-mono font-bold text-foreground">
                        {routePreviewDistanceAndFare.distanceKm} km
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Suggested Fare:</span>
                      <span className="font-mono font-bold text-base text-primary">
                        ₦{routePreviewDistanceAndFare.calculatedFare.toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRouteBaseFare(routePreviewDistanceAndFare.calculatedFare)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
                    >
                      Use Suggested
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={routeActive}
                    onChange={(e) => setRouteActive(e.target.checked)}
                    className="rounded border-border bg-background text-primary focus:ring-primary/20 h-4 w-4"
                  />
                  Route Active
                </label>

                <div className="flex items-center gap-2">
                  {editingRouteId && (
                    <button
                      type="button"
                      onClick={resetRouteForm}
                      className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
                  >
                    {editingRouteId ? 'Update Route' : 'Save Route'}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          {/* Routes Table */}
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Origin Hub</th>
                    <th className="px-5 py-3.5">Destination Hub</th>
                    <th className="px-5 py-3.5">Base Route Fare</th>
                    <th className="px-5 py-3.5">Est. Transit Time</th>
                    <th className="px-5 py-3.5">Reverse Route?</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {routes.map((route) => {
                    const origin = hubs.find((h) => h.id === route.originHubId);
                    const dest = hubs.find((h) => h.id === route.destinationHubId);

                    // Reverse route existence check
                    const reverseExists = routes.some(
                      (r) => r.originHubId === route.destinationHubId && r.destinationHubId === route.originHubId
                    );

                    return (
                      <tr key={route.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-foreground">
                          {origin ? `${origin.name} (${origin.city})` : 'Unknown Hub'}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-foreground">
                          {dest ? `${dest.name} (${dest.city})` : 'Unknown Hub'}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold tabular-nums">
                          ₦{Number(route.baseFare).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-muted-foreground">
                          {route.estimatedDays} day(s)
                        </td>

                        {/* Reverse Route Symmetry Check */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {reverseExists ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Two-Way
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                              Reverse Missing
                            </Badge>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {route.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground border-border font-medium">
                              Inactive
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleEditRouteClick(route)}
                            className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: GLOBAL AUDIT HISTORY LOG (Order #6) */}
      {activeTab === 'audit' && (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <div className="p-4 border-b border-border bg-card">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <History className="h-4 w-4 text-primary" />
              Audit Log of Hub Modifiers & Route Rate Edits
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Entity / City</th>
                  <th className="px-5 py-3">Admin Actor</th>
                  <th className="px-5 py-3">Field Modified</th>
                  <th className="px-5 py-3">Previous Value</th>
                  <th className="px-5 py-3">New Value</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono">
                {globalAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground font-sans">
                      No price modifier or route fare edits logged yet.
                    </td>
                  </tr>
                ) : (
                  globalAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-semibold font-sans text-foreground">{log.cityName}</td>
                      <td className="px-5 py-3 font-sans text-muted-foreground">{log.adminName}</td>
                      <td className="px-5 py-3 font-semibold text-primary">{log.field}</td>
                      <td className="px-5 py-3 text-rose-500">{String(log.oldValue)}</td>
                      <td className="px-5 py-3 text-emerald-500 font-bold">{String(log.newValue)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{log.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* HUB DEACTIVATION WARNING MODAL (Order #2) */}
      {deactivatingHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Deactivate Hub — {deactivatingHub.name}?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Deactivating this hub will impact all connected routes touching{' '}
                  <strong className="text-foreground">{deactivatingHub.city}</strong>.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                  Are you sure you want to deactivate {deactivatingHub.name}?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeactivatingHub(null)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => toggleHubStatus(deactivatingHub.id)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                Deactivate Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
