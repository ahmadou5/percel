'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  Navigation,
  Clock,
  MapPin,
  Package,
  TrendingUp,
  Wifi,
  Wallet,
  ArrowRight,
  User,
  ShieldCheck,
  Compass,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from 'lucide-react';
import type { AdminDriver, AdminOrder, AdminConnectedUser, AdminWalletTransaction } from '@/lib/admin-data';

// Extended driver data with GPS coordinates and trip details
export type FleetDriverMarker = AdminDriver & {
  lat: number;
  lng: number;
  speedKmH: number;
  heading: string;
  lastPing: string;
  orderType: 'Intra-state' | 'Interstate';
  activeOrderCode?: string;
  activeOrderId?: string;
  pickupCity?: string;
  dropoffCity?: string;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  etaMins?: number;
  distanceKm?: number;
  hubCity: string;
};

// Nigerian State Hub Coordinates
const NIGERIA_HUBS = [
  { id: 'hub_lagos', name: 'Lagos Main Hub (Ikeja)', lat: 6.6018, lng: 3.3515, city: 'Lagos' },
  { id: 'hub_abuja', name: 'Abuja Central Terminal (Wuse 2)', lat: 9.0765, lng: 7.3986, city: 'Abuja' },
  { id: 'hub_ph', name: 'Port Harcourt Gateway Depot', lat: 4.8156, lng: 7.0498, city: 'Port Harcourt' },
  { id: 'hub_kano', name: 'Kano Commercial Depot', lat: 12.0022, lng: 8.592, city: 'Kano' },
  { id: 'hub_ibadan', name: 'Ibadan Logistics Station', lat: 7.3775, lng: 3.947, city: 'Ibadan' },
];

export function FleetMapCanvas({
  drivers,
  orders,
  connectedUsers,
  walletTransactions,
  token,
}: {
  drivers: AdminDriver[];
  orders: AdminOrder[];
  connectedUsers: AdminConnectedUser[];
  walletTransactions: AdminWalletTransaction[];
  token?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylinesRef = useRef<Record<string, any[]>>({});

  // Filter States from URL query params
  const initialStatus = (searchParams.get('status') as 'ALL' | 'IN_TRANSIT' | 'IDLE') || 'ALL';
  const initialHub = searchParams.get('hub') || 'ALL';
  const initialType = (searchParams.get('type') as 'ALL' | 'Intra-state' | 'Interstate') || 'ALL';

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_TRANSIT' | 'IDLE'>(initialStatus);
  const [hubFilter, setHubFilter] = useState<string>(initialHub);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Intra-state' | 'Interstate'>(initialType);
  const [activeSideTab, setActiveSideTab] = useState<'CONNECTED' | 'WALLET'>('CONNECTED');
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Sync state changes with URL query string
  const updateQueryParams = (newStatus: string, newHub: string, newType: string) => {
    const params = new URLSearchParams();
    if (newStatus !== 'ALL') params.set('status', newStatus);
    if (newHub !== 'ALL') params.set('hub', newHub);
    if (newType !== 'ALL') params.set('type', newType);
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : '/orders/live-map', { scroll: false });
  };

  const [liveDriversData, setLiveDriversData] = useState<FleetDriverMarker[]>(() => {
    return drivers.map((d) => {
      const activeOrder = orders.find((o) => o.driverId === d.id || o.driver === d.name);
      
      return {
        ...d,
        lat: 0,
        lng: 0,
        speedKmH: 0,
        heading: 'N/A',
        lastPing: 'Awaiting signal...',
        orderType: 'Intra-state', // Default, to be updated by real data if available
        activeOrderCode: activeOrder?.trackingCode,
        activeOrderId: activeOrder?.id,
        pickupCity: activeOrder?.pickup,
        dropoffCity: activeOrder?.dropoff,
        pickupCoords: undefined,
        dropoffCoords: undefined,
        etaMins: 0,
        distanceKm: 0,
        hubCity: 'N/A',
      };
    });
  });

  // Socket Connection for Real-Time Updates
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    let socket: any;

    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;
      socket = io('/admin', {
        auth: { token },
        path: '/socket.io',
      });

      socket.on('connect', () => setIsLiveConnected(true));
      socket.on('disconnect', () => setIsLiveConnected(false));

      socket.on('driver_location', (payload: any) => {
        setLiveDriversData(prev => prev.map(d => {
          if (d.id === payload.driverId) {
            return {
              ...d,
              lat: payload.lat,
              lng: payload.lng,
              speedKmH: payload.speed || d.speedKmH,
              heading: payload.heading || d.heading,
              lastPing: 'Just now',
            };
          }
          return d;
        }));
      });
    });

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
  }, [token]);

  const filteredDrivers = liveDriversData.filter((d) => {
    if (statusFilter === 'IN_TRANSIT' && !d.activeOrderCode) return false;
    if (statusFilter === 'IDLE' && Boolean(d.activeOrderCode)) return false;
    if (hubFilter !== 'ALL' && d.hubCity.toLowerCase() !== hubFilter.toLowerCase()) return false;
    if (typeFilter !== 'ALL' && d.orderType !== typeFilter) return false;
    return true;
  });

  const selectedDriver = liveDriversData.find(d => d.id === selectedDriverId) || null;

  const focusDriverOnMap = (driverId: string) => {
    setSelectedDriverId(driverId);
    const driver = liveDriversData.find(d => d.id === driverId);
    if (mapRef.current && driver) {
      mapRef.current.flyTo([driver.lat, driver.lng], 14, { duration: 1.2 });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let isMounted = true;

    const loadCSS = (id: string, url: string) => {
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
      }
    };

    loadCSS('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    loadCSS('leaflet-cluster-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
    loadCSS('leaflet-cluster-default-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');

    Promise.all([
      import('leaflet'),
      // @ts-ignore
      import('leaflet.markercluster')
    ]).then(([L]) => {
      if (!isMounted || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [8.5, 6.5],
          zoom: 6.5,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        // Render State Hub Markers (Unclustered)
        NIGERIA_HUBS.forEach((hub) => {
          const hubIcon = L.divIcon({
            className: 'custom-hub-icon',
            html: `<div style="background: #0EA5E9; color: white; padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap;">🏢 ${hub.city} Hub</div>`,
            iconSize: [110, 30],
            iconAnchor: [55, 15],
          });
          L.marker([hub.lat, hub.lng], { icon: hubIcon }).bindPopup(`<b>${hub.name}</b><br/>Regional Operations Hub`).addTo(map);
        });

        // Initialize MarkerClusterGroup
        // @ts-ignore
        clusterGroupRef.current = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 40,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          iconCreateFunction: (cluster: any) => {
            return L.divIcon({
              html: `<div style="background: #10B981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">${cluster.getChildCount()}</div>`,
              className: 'custom-cluster-icon',
              iconSize: L.point(32, 32, true),
            });
          }
        });
        map.addLayer(clusterGroupRef.current);
      }

      const map = mapRef.current;
      const clusterGroup = clusterGroupRef.current;

      // Track drivers currently in filteredDrivers
      const currentDriverIds = new Set(filteredDrivers.map(d => d.id));

      // Remove markers/polylines for drivers no longer in filter
      Object.keys(markersRef.current).forEach(id => {
        if (!currentDriverIds.has(id)) {
          clusterGroup.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
          if (polylinesRef.current[id]) {
            polylinesRef.current[id].forEach((p: any) => p.remove());
            delete polylinesRef.current[id];
          }
        }
      });

      filteredDrivers.forEach((driver) => {
        const isInTransit = Boolean(driver.activeOrderCode);
        const color = isInTransit ? '#6366F1' : '#10B981';
        const vehicleEmoji = driver.vehicle.toLowerCase().includes('truck') ? '🚚' : driver.vehicle.toLowerCase().includes('van') ? '🚐' : '🛵';
        const isSelected = selectedDriverId === driver.id;

        // Create or update Driver Marker
        let marker = markersRef.current[driver.id];
        if (!marker) {
          const driverIcon = L.divIcon({
            className: 'custom-driver-icon',
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; cursor: pointer;">
                <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${color}; opacity: 0.25; animation: pulse 2s infinite;"></div>
                <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: ${color}; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
                  ${vehicleEmoji}
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
          marker = L.marker([driver.lat, driver.lng], { icon: driverIcon });
          marker.on('click', () => {
            setSelectedDriverId(driver.id);
            map.flyTo([driver.lat, driver.lng], 14, { duration: 1 });
          });
          markersRef.current[driver.id] = marker;
          clusterGroup.addLayer(marker);
        } else {
          // Smoothly update position using Leaflet's built-in setLatLng
          marker.setLatLng([driver.lat, driver.lng]);
          // Update icon if selected state changed
          const driverIcon = L.divIcon({
            className: 'custom-driver-icon',
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; cursor: pointer; ${isSelected ? 'transform: scale(1.15); transition: transform 0.2s;' : ''}">
                <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${color}; opacity: 0.25; animation: pulse 2s infinite;"></div>
                <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: ${color}; border: ${isSelected ? '3px' : '2.5px'} solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
                  ${vehicleEmoji}
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
          marker.setIcon(driverIcon);
        }

        // Draw/Update Route Trails
        if (isInTransit && driver.pickupCoords && driver.dropoffCoords) {
          let lines = polylinesRef.current[driver.id];
          if (!lines) {
            const pickupMarker = L.marker(driver.pickupCoords, {
              icon: L.divIcon({ className: 'pickup-pin-icon', html: `<div style="background:#10B981; color:white; width:22px; height:22px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.4);">P</div>`, iconSize: [22, 22], iconAnchor: [11, 11] })
            }).addTo(map);

            const dropoffMarker = L.marker(driver.dropoffCoords, {
              icon: L.divIcon({ className: 'dropoff-pin-icon', html: `<div style="background:#EF4444; color:white; width:22px; height:22px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.4);">D</div>`, iconSize: [22, 22], iconAnchor: [11, 11] })
            }).addTo(map);

            const completedPolyline = L.polyline([driver.pickupCoords, [driver.lat, driver.lng]], {
              color: '#6366F1', opacity: 0.35, weight: isSelected ? 3 : 2, dashArray: '5, 8'
            }).addTo(map);

            const remainingPolyline = L.polyline([[driver.lat, driver.lng], driver.dropoffCoords], {
              color: '#6366F1', opacity: 1, weight: isSelected ? 4 : 2.5
            }).addTo(map);

            polylinesRef.current[driver.id] = [pickupMarker, dropoffMarker, completedPolyline, remainingPolyline];
          } else {
            // Update existing polylines
            const [pickup, drop, compLine, remLine] = lines;
            compLine.setLatLngs([driver.pickupCoords, [driver.lat, driver.lng]]);
            compLine.setStyle({ weight: isSelected ? 3 : 2 });
            remLine.setLatLngs([[driver.lat, driver.lng], driver.dropoffCoords]);
            remLine.setStyle({ weight: isSelected ? 4 : 2.5 });
          }
        } else if (polylinesRef.current[driver.id]) {
          // Remove if no longer in transit
          polylinesRef.current[driver.id].forEach((p: any) => p.remove());
          delete polylinesRef.current[driver.id];
        }
      });
    });

    return () => { isMounted = false; };
  }, [filteredDrivers, selectedDriverId]);

  return (
    <div className="space-y-4">
      {/* Filter Controls & Live Status Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  updateQueryParams('ALL', hubFilter, typeFilter);
                }}
                className={`rounded-lg px-3 py-1 transition-all ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                All ({liveDriversData.length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('IN_TRANSIT');
                  updateQueryParams('IN_TRANSIT', hubFilter, typeFilter);
                }}
                className={`rounded-lg px-3 py-1 transition-all ${statusFilter === 'IN_TRANSIT' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                In Transit ({liveDriversData.filter((d) => Boolean(d.activeOrderCode)).length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('IDLE');
                  updateQueryParams('IDLE', hubFilter, typeFilter);
                }}
                className={`rounded-lg px-3 py-1 transition-all ${statusFilter === 'IDLE' ? 'bg-emerald-500 text-white font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Available Idle ({liveDriversData.filter((d) => !d.activeOrderCode).length})
              </button>
            </div>
          </div>

          {/* Hub & Order Type Dropdowns */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/30 px-3 py-1.5">
              <span className="text-muted-foreground font-semibold">Hub:</span>
              <select value={hubFilter} onChange={(e) => { setHubFilter(e.target.value); updateQueryParams(statusFilter, e.target.value, typeFilter); }} className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer">
                <option value="ALL" className="bg-card text-foreground">All Hubs (5)</option>
                <option value="Lagos" className="bg-card text-foreground">Lagos Hub</option>
                <option value="Abuja" className="bg-card text-foreground">Abuja Hub</option>
                <option value="Port Harcourt" className="bg-card text-foreground">Port Harcourt</option>
                <option value="Kano" className="bg-card text-foreground">Kano Hub</option>
                <option value="Ibadan" className="bg-card text-foreground">Ibadan Station</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-muted/30 px-3 py-1.5">
              <span className="text-muted-foreground font-semibold">Type:</span>
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as any); updateQueryParams(statusFilter, hubFilter, e.target.value); }} className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer">
                <option value="ALL" className="bg-card text-foreground">All Delivery Types</option>
                <option value="Intra-state" className="bg-card text-foreground">Intra-State</option>
                <option value="Interstate" className="bg-card text-foreground">Interstate</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live WebSocket Connection Status Indicator */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'animate-ping bg-emerald-400' : 'bg-muted-foreground'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLiveConnected ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            </span>
            <span className={isLiveConnected ? "text-emerald-400 font-bold" : "text-muted-foreground font-bold"}>
              {isLiveConnected ? 'Live · Connected (WebSocket)' : 'Connecting...'}
            </span>
            <span className="text-muted-foreground font-mono">· Refreshes automatically</span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-muted-foreground text-[11px]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Active Delivery</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Available Idle</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> State Hub</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Leaflet OpenStreetMap Canvas */}
        <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-sm">
          <div ref={containerRef} className="h-full w-full z-0" />
        </div>

        {/* Inspection & Side Tabs Panel */}
        <div className="space-y-4">
          {/* Selected Courier Detail Panel */}
          {selectedDriver ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-xs uppercase tracking-wider font-bold text-foreground">Courier Inspection</span>
                </div>
                <button onClick={() => setSelectedDriverId(null)} className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground">
                  Close ✕
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/20 text-base font-extrabold text-primary border border-primary/30">
                  {selectedDriver.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-base text-foreground truncate">{selectedDriver.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{selectedDriver.phone}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${selectedDriver.activeOrderCode ? 'border-primary/40 bg-primary/10 text-primary' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'}`}>
                  {selectedDriver.activeOrderCode ? 'ACTIVE TRIP' : 'AVAILABLE'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Speed & Heading</span>
                  <p className="font-mono font-extrabold text-foreground mt-0.5">{selectedDriver.speedKmH} km/h · {selectedDriver.heading}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">GPS Location Ping</span>
                  <p className="font-mono font-bold text-emerald-400 mt-0.5">{selectedDriver.lastPing}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 text-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">GPS Coordinates</span>
                <p className="font-mono text-foreground font-bold mt-0.5">{selectedDriver.lat.toFixed(4)}° N, {selectedDriver.lng.toFixed(4)}° E</p>
              </div>

              {selectedDriver.activeOrderCode && (
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                      {selectedDriver.orderType}
                    </span>
                    <span className="font-mono font-extrabold text-primary">{selectedDriver.activeOrderCode}</span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">From: <span className="font-bold text-foreground">{selectedDriver.pickupCity}</span></p>
                    <p className="text-muted-foreground">To: <span className="font-bold text-foreground">{selectedDriver.dropoffCity}</span></p>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-primary/20 pt-2 font-mono">
                    <span className="text-muted-foreground">ETA: <strong className="text-foreground">{selectedDriver.etaMins} mins</strong></span>
                    <span className="text-muted-foreground">Distance: <strong className="text-foreground">{selectedDriver.distanceKm} km</strong></span>
                  </div>

                  <Link href={`/orders/${selectedDriver.activeOrderId}`} className="inline-flex w-full h-8 items-center justify-center gap-1.5 rounded-lg bg-primary/15 border border-primary/30 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    View Full Trip Details <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}

              <Link href={`/drivers/${selectedDriver.id}`} className="inline-flex w-full h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-xs font-bold text-foreground hover:bg-muted transition-colors">
                View Driver Profile & KYC →
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-5 text-center space-y-2">
              <Compass className="mx-auto h-8 w-8 text-primary animate-pulse" />
              <p className="font-bold text-sm text-foreground">Select a Courier Marker</p>
              <p className="text-xs text-muted-foreground">
                Click any vehicle pin on the map or a person in the Connected list below to inspect live telemetry and route trails.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="flex items-center border-b border-border/70 bg-muted/30 p-1 text-xs font-bold">
              <button onClick={() => setActiveSideTab('CONNECTED')} className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeSideTab === 'CONNECTED' ? 'bg-card text-foreground shadow-xs border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}>
                <Wifi className="h-3.5 w-3.5 text-sky-400" />
                Connected Now ({connectedUsers.length})
              </button>
              <button onClick={() => setActiveSideTab('WALLET')} className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeSideTab === 'WALLET' ? 'bg-card text-foreground shadow-xs border border-border/60' : 'text-muted-foreground hover:text-foreground'}`}>
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                Wallet Activity
              </button>
            </div>

            {activeSideTab === 'CONNECTED' && (
              <div className="divide-y divide-border/50 max-h-[360px] overflow-y-auto">
                {connectedUsers.map((u) => {
                  const isOnline = u.status === 'ONLINE';
                  const matchedDriver = liveDriversData.find((d) => d.email === u.email || d.name === u.name);
                  return (
                    <button key={u.id} onClick={() => { if (matchedDriver) focusDriverOnMap(matchedDriver.id); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                      <div className="relative shrink-0">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted border border-border/80 text-xs font-extrabold text-foreground">{u.avatarInitial}</div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.lastSeen}</p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${u.role === 'DRIVER' ? 'bg-primary/10 text-primary border-primary/20' : u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                        {u.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeSideTab === 'WALLET' && (
              <div className="divide-y divide-border/50 max-h-[360px] overflow-y-auto">
                {walletTransactions.slice(0, 8).map((tx) => {
                  const isCredit = tx.type === 'CREDIT';
                  return (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-xs hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs ${isCredit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-primary/10 text-primary border-primary/30'}`}>
                          {isCredit ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{tx.note}</p>
                          <p className="text-[10px] text-muted-foreground">{tx.createdAt}</p>
                        </div>
                      </div>
                      <span className={`font-mono font-extrabold shrink-0 ${isCredit ? 'text-emerald-400' : 'text-foreground'}`}>
                        {isCredit ? '+' : '-'}{tx.amount}
                      </span>
                    </div>
                  );
                })}
                <div className="p-3 border-t border-border/60 bg-muted/20 text-center">
                  <Link href="/wallet" className="text-xs font-bold text-primary hover:underline">
                    View Full Wallet Ledger →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
