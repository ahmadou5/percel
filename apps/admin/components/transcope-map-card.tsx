'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Maximize2, Plus, Minus, Filter } from 'lucide-react';
import type { AdminOrder } from '@/lib/admin-data';

export function TranscopeMapCard({ orders }: { orders: AdminOrder[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapSearch, setMapSearch] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

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
          center: [6.5244, 3.3792],
          zoom: 11,
          zoomControl: false,
          attributionControl: false,
        });

        // Dark theme map tiles matching Transcope design
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
      }

      const map = mapRef.current;

      // Sample pins matching Transcope map pins
      const pins = [
        { lat: 6.6018, lng: 3.3515, code: '#AB045861', title: 'Electronics 25kg' },
        { lat: 6.4281, lng: 3.4219, code: '#BC022341', title: 'Logistics 18kg' },
        { lat: 6.5000, lng: 3.3600, code: '#CAO12341', title: 'Sports 45kg' },
      ];

      pins.forEach((p) => {
        const pinIcon = L.divIcon({
          className: 'transcope-pin-node',
          html: `
            <div style="background: #0F131D; color: white; border: 1.5px solid #3B82F6; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="background: #3B82F6; width: 6px; height: 6px; border-radius: 50%;"></span>
              <span>${p.code}</span>
              <span style="color: #94A3B8; font-weight: 500;">${p.title}</span>
            </div>
          `,
          iconSize: [160, 32],
          iconAnchor: [80, 16],
        });

        L.marker([p.lat, p.lng], { icon: pinIcon }).addTo(map);
      });
    });

    return () => {
      isMounted = false;
    };
  }, [orders]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded-2xl border border-border/80 bg-[#0F131D] shadow-sm">
      {/* Map Search & Control Header Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-[#0F131D]/90 px-3 py-2 text-xs text-white backdrop-blur-md shadow-md flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            placeholder="Search South Bronx, New York or Ikeja, Lagos..."
            className="bg-transparent text-xs font-medium placeholder:text-muted-foreground focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-[#0F131D]/90 px-3 py-2 text-xs font-bold text-white backdrop-blur-md shadow-md">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>Sort by: <span className="text-primary">In Transit</span></span>
          </div>

          <button className="grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-[#0F131D]/90 text-white backdrop-blur-md shadow-md hover:bg-muted">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Vector Map Layer */}
      <div ref={containerRef} className="h-full w-full z-0" />

      {/* Map Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 pointer-events-auto">
        <button onClick={zoomIn} className="grid h-8 w-8 place-items-center rounded-lg border border-border/80 bg-[#0F131D]/90 text-white backdrop-blur-md shadow-sm hover:bg-muted font-bold text-sm">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={zoomOut} className="grid h-8 w-8 place-items-center rounded-lg border border-border/80 bg-[#0F131D]/90 text-white backdrop-blur-md shadow-sm hover:bg-muted font-bold text-sm">
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
