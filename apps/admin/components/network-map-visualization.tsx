'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Layers, MapPin, Truck, RefreshCw } from 'lucide-react';
import type { AdminHub, AdminRoute } from '@/lib/admin-data';

interface NetworkMapVisualizationProps {
  hubs: AdminHub[];
  routes: AdminRoute[];
  onSelectHub?: (hubId: string) => void;
}

export function NetworkMapVisualization({ hubs, routes, onSelectHub }: NetworkMapVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Load Leaflet CSS dynamically
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [9.0765, 7.3986], // Centered on Nigeria
          zoom: 6,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
      }

      const map = mapRef.current;

      // Clear existing layers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      const bounds: [number, number][] = [];

      // 1. Draw Route Lines (Polylines)
      routes.forEach((route) => {
        const originHub = hubs.find((h) => h.id === route.originHubId);
        const destHub = hubs.find((h) => h.id === route.destinationHubId);

        if (
          originHub &&
          destHub &&
          originHub.lat &&
          originHub.lng &&
          destHub.lat &&
          destHub.lng &&
          originHub.lat !== 0 &&
          destHub.lat !== 0
        ) {
          const originCoords: [number, number] = [originHub.lat, originHub.lng];
          const destCoords: [number, number] = [destHub.lat, destHub.lng];

          const polyline = L.polyline([originCoords, destCoords], {
            color: route.isActive ? '#0284C7' : '#94A3B8',
            weight: route.isActive ? 3 : 1.5,
            dashArray: route.isActive ? undefined : '5, 5',
            opacity: 0.8,
          }).addTo(map);

          polyline.bindPopup(`
            <div style="font-family: system-ui, sans-serif; font-size: 12px;">
              <strong style="color: #0284C7;">Interstate Route</strong><br/>
              <b>${originHub.name}</b> → <b>${destHub.name}</b><br/>
              <span>Base Fare: ₦${Number(route.baseFare).toLocaleString()}</span><br/>
              <span>Est. Transit: ${route.estimatedDays} day(s)</span><br/>
              <span style="color: ${route.isActive ? '#10B981' : '#EF4444'}; font-weight: bold;">
                ${route.isActive ? '● Active Route' : '○ Inactive Route'}
              </span>
            </div>
          `);
        }
      });

      // 2. Draw Hub Markers
      hubs.forEach((hub) => {
        const hubLat = hub.lat && hub.lat !== 0 ? hub.lat : 9.0765;
        const hubLng = hub.lng && hub.lng !== 0 ? hub.lng : 7.3986;

        const connectedCount = routes.filter((r) => r.originHubId === hub.id || r.destinationHubId === hub.id).length;
        const isOrphaned = connectedCount === 0;

        bounds.push([hubLat, hubLng]);

        const typeColor = hub.type === 'partner_park' ? '#8B5CF6' : hub.type === 'agent' ? '#F59E0B' : '#0284C7';
        const typeLabel = hub.type === 'partner_park' ? 'Partner Park' : hub.type === 'agent' ? 'Agent' : 'Office Station';

        const hubIcon = L.divIcon({
          className: 'custom-network-hub-icon',
          html: `<div style="background: ${typeColor}; color: white; border-radius: 12px; padding: 4px 10px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space: nowrap; display: flex; align-items: center; gap: 4px;">
            <span>${hub.name}</span>
            <span style="background: rgba(255,255,255,0.3); padding: 0 4px; border-radius: 6px; font-size: 10px;">${connectedCount}</span>
          </div>`,
          iconSize: [120, 28],
          iconAnchor: [60, 14],
        });

        const marker = L.marker([hubLat, hubLng], { icon: hubIcon }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 180px;">
            <strong style="font-size: 13px; color: ${typeColor};">${hub.name}</strong><br/>
            <span style="color: #64748B;">${hub.city}, ${hub.state}</span><br/>
            <span style="font-size: 11px;">Type: <b>${typeLabel}</b></span><br/>
            <span style="font-size: 11px;">Connected Routes: <b>${connectedCount}</b></span><br/>
            ${isOrphaned ? '<span style="color: #F59E0B; font-weight: bold;">⚠ Orphaned Hub (No Routes)</span><br/>' : ''}
            <span style="font-size: 11px;">Address: ${hub.address}</span>
          </div>
        `);

        if (onSelectHub) {
          marker.on('click', () => onSelectHub(hub.id));
        }
      });

      if (bounds.length > 0 && mapRef.current) {
        try {
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
        } catch (e) {
          // Fallback center
        }
      }

      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [hubs, routes]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm space-y-0">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Interstate Logistics Network Topology Map
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> Office Station
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Partner Park
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Agent Hub
          </span>
        </div>
      </div>

      <div className="relative w-full h-80 bg-muted/40">
        <div ref={containerRef} className="w-full h-full z-0" />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs text-muted-foreground">
            Loading logistics network topology...
          </div>
        )}
      </div>
    </div>
  );
}
