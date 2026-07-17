'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import type { AdminHub, AdminRoute } from '@/lib/admin-data';

interface HubsListProps {
  initialHubs: AdminHub[];
  initialRoutes: AdminRoute[];
}

export function HubsList({ initialHubs, initialRoutes }: HubsListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'hubs' | 'routes'>('hubs');

  // ── Hub CRUD States ────────────────────────────────────────────────────────
  const [hubs, setHubs] = useState<AdminHub[]>(initialHubs);
  const [editingHubId, setEditingHubId] = useState<string | null>(null);
  const [hubName, setHubName] = useState('');
  const [hubCity, setHubCity] = useState('');
  const [hubState, setHubState] = useState('');
  const [hubAddress, setHubAddress] = useState('');
  const [hubLat, setHubLat] = useState(0);
  const [hubLng, setHubLng] = useState(0);
  const [hubType, setHubType] = useState<'office' | 'agent' | 'partner_park'>('office');
  const [hubPhone, setHubPhone] = useState('');
  const [hubActive, setHubActive] = useState(true);
  const [hubBaseModifier, setHubBaseModifier] = useState(0);

  // ── Route CRUD States ──────────────────────────────────────────────────────
  const [routes, setRoutes] = useState<AdminRoute[]>(initialRoutes);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeOriginId, setRouteOriginId] = useState('');
  const [routeDestId, setRouteDestId] = useState('');
  const [routeBaseFare, setRouteBaseFare] = useState(0);
  const [routeEstDays, setRouteEstDays] = useState(1);
  const [routeActive, setRouteActive] = useState(true);

  // ── Shared States ──────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetHubForm = () => {
    setEditingHubId(null);
    setHubName('');
    setHubCity('');
    setHubState('');
    setHubAddress('');
    setHubLat(0);
    setHubLng(0);
    setHubType('office');
    setHubPhone('');
    setHubActive(true);
    setHubBaseModifier(0);
    setError(null);
  };

  const resetRouteForm = () => {
    setEditingRouteId(null);
    setRouteOriginId('');
    setRouteDestId('');
    setRouteBaseFare(0);
    setRouteEstDays(1);
    setRouteActive(true);
    setError(null);
  };

  const handleEditHub = (hub: AdminHub) => {
    setEditingHubId(hub.id);
    setHubName(hub.name);
    setHubCity(hub.city);
    setHubState(hub.state);
    setHubAddress(hub.address);
    setHubLat(hub.lat);
    setHubLng(hub.lng);
    setHubType(hub.type);
    setHubPhone(hub.contactPhone ?? '');
    setHubActive(hub.isActive);
    setHubBaseModifier(hub.basePricingModifier);
  };

  const handleEditRoute = (route: AdminRoute) => {
    setEditingRouteId(route.id);
    setRouteOriginId(route.originHubId);
    setRouteDestId(route.destinationHubId);
    setRouteBaseFare(Number(route.baseFare));
    setRouteEstDays(route.estimatedDays);
    setRouteActive(route.isActive);
  };

  const handleHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingHubId ? `/api/admin/hubs/${editingHubId}` : '/api/admin/hubs';
      const method = editingHubId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hubName,
          city: hubCity,
          state: hubState,
          address: hubAddress,
          lat: Number(hubLat),
          lng: Number(hubLng),
          type: hubType,
          contactPhone: hubPhone || null,
          isActive: hubActive,
          basePricingModifier: Number(hubBaseModifier),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Operation failed');
      }

      resetHubForm();
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (routeOriginId === routeDestId) {
      setError('Origin hub and destination hub cannot be the same');
      setIsSubmitting(false);
      return;
    }

    try {
      const url = editingRouteId ? `/api/admin/routes/${editingRouteId}` : '/api/admin/routes';
      const method = editingRouteId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originHubId: routeOriginId,
          destinationHubId: routeDestId,
          baseFare: Number(routeBaseFare),
          estimatedDays: Number(routeEstDays),
          isActive: routeActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Operation failed');
      }

      resetRouteForm();
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHub = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hub? All connecting routes will also be affected.')) return;
    try {
      const response = await fetch(`/api/admin/hubs/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      const response = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-border/80">
        <button
          onClick={() => { setActiveTab('hubs'); setError(null); }}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'hubs'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Hubs Management
        </button>
        <button
          onClick={() => { setActiveTab('routes'); setError(null); }}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'routes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Interstate Routes Configuration
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* HUBS TAB CONTENT */}
      {activeTab === 'hubs' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              {editingHubId ? 'Edit Network Hub' : 'Add New Network Hub'}
            </h3>
            <form onSubmit={handleHubSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Hub Name</label>
                  <input
                    type="text"
                    required
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Lagos Mainland Hub"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={hubCity}
                    onChange={(e) => setHubCity(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Ikeja"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={hubState}
                    onChange={(e) => setHubState(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Lagos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Hub Type</label>
                  <select
                    value={hubType}
                    onChange={(e) => setHubType(e.target.value as any)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="office">Office Station</option>
                    <option value="agent">Agent Outlet</option>
                    <option value="partner_park">Partner Park</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={hubAddress}
                    onChange={(e) => setHubAddress(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. 12 Herbert Macaulay Way"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={hubPhone}
                    onChange={(e) => setHubPhone(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. +2348012345678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Base Price Modifier (₦)</label>
                  <input
                    type="number"
                    value={hubBaseModifier}
                    onChange={(e) => setHubBaseModifier(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0000001"
                    required
                    value={hubLat}
                    onChange={(e) => setHubLat(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. 6.5244"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0000001"
                    required
                    value={hubLng}
                    onChange={(e) => setHubLng(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. 3.3792"
                  />
                </div>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hubActive}
                      onChange={(e) => setHubActive(e.target.checked)}
                      className="rounded border-input bg-background text-primary focus:ring-primary"
                    />
                    <span>Active Station</span>
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  {editingHubId && (
                    <button
                      type="button"
                      onClick={resetHubForm}
                      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Hub'}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4">Hub Name</th>
                    <th className="px-5 py-4">Location</th>
                    <th className="px-5 py-4">Address</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Price Modifier</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                        No active hubs configured. Add some hubs above.
                      </td>
                    </tr>
                  ) : (
                    hubs.map((hub) => (
                      <tr key={hub.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4 font-semibold text-foreground">{hub.name}</td>
                        <td className="px-5 py-4">{hub.city}, {hub.state}</td>
                        <td className="px-5 py-4 max-w-[180px] truncate" title={hub.address}>{hub.address}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${
                            hub.type === 'office' ? 'bg-blue-500/10 text-blue-500' :
                            hub.type === 'agent' ? 'bg-purple-500/10 text-purple-500' : 'bg-green-500/10 text-green-500'
                          }`}>
                            {hub.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono font-medium text-foreground">₦{Number(hub.basePricingModifier).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${hub.isActive ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground border'}`}>
                            {hub.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditHub(hub)}
                            className="text-primary hover:underline text-sm font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteHub(hub.id)}
                            className="text-destructive hover:underline text-sm font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ROUTES TAB CONTENT */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              {editingRouteId ? 'Edit Interstate Route' : 'Establish New Connecting Route'}
            </h3>
            <form onSubmit={handleRouteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Origin Hub</label>
                  <select
                    required
                    value={routeOriginId}
                    onChange={(e) => setRouteOriginId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Origin Hub --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>{h.state} • {h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Destination Hub</label>
                  <select
                    required
                    value={routeDestId}
                    onChange={(e) => setRouteDestId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Destination Hub --</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>{h.state} • {h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Base Price / Route Fare (₦)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={routeBaseFare}
                    onChange={(e) => setRouteBaseFare(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Transit Time (Days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={routeEstDays}
                    onChange={(e) => setRouteEstDays(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={routeActive}
                      onChange={(e) => setRouteActive(e.target.checked)}
                      className="rounded border-input bg-background text-primary focus:ring-primary"
                    />
                    <span>Active Route</span>
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  {editingRouteId && (
                    <button
                      type="button"
                      onClick={resetRouteForm}
                      className="rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    {isSubmitting ? 'Saving Route...' : 'Save Route'}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4">From</th>
                    <th className="px-5 py-4">To</th>
                    <th className="px-5 py-4">Base Route Fare</th>
                    <th className="px-5 py-4">Est. Transit Time</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                        No interstate routes configured yet.
                      </td>
                    </tr>
                  ) : (
                    routes.map((route) => {
                      const origin = hubs.find((h) => h.id === route.originHubId);
                      const dest = hubs.find((h) => h.id === route.destinationHubId);
                      return (
                        <tr key={route.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-semibold text-foreground">{origin ? origin.name : 'Unknown Hub'}</span>
                            <span className="block text-xs text-muted-foreground">{origin ? `${origin.city}, ${origin.state}` : ''}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-foreground">{dest ? dest.name : 'Unknown Hub'}</span>
                            <span className="block text-xs text-muted-foreground">{dest ? `${dest.city}, ${dest.state}` : ''}</span>
                          </td>
                          <td className="px-5 py-4 font-mono font-medium text-foreground">₦{Number(route.baseFare).toLocaleString()}</td>
                          <td className="px-5 py-4">{route.estimatedDays} {route.estimatedDays === 1 ? 'day' : 'days'}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${route.isActive ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground border'}`}>
                              {route.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleEditRoute(route)}
                              className="text-primary hover:underline text-sm font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(route.id)}
                              className="text-destructive hover:underline text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
