'use client';

import { useEffect, useRef } from 'react';
import { MoreVertical, Plus, Info } from 'lucide-react';
import type { AdminOrder } from '@/lib/admin-data';

export function DeliveringProcessWidget({ activeOrder }: { activeOrder?: AdminOrder }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const pickup = activeOrder?.pickup ?? 'Erdberg, Lagos';
  const dropoff = activeOrder?.dropoff ?? 'Wuse 2, Abuja';
  const tracking = activeOrder?.trackingCode ?? 'PCL-998241';
  const driverName = activeOrder?.driver ?? 'Arthur Sjorgen';

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

      const pCoords: [number, number] = [6.6018, 3.3515];
      const dCoords: [number, number] = [9.0765, 7.3986];
      const cCoords: [number, number] = [7.3775, 3.9470];

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [7.8, 5.2],
          zoom: 6.5,
          zoomControl: false,
          attributionControl: false,
        });

        // Dark theme map tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
      }

      const map = mapRef.current;

      // Polyline glowing route
      L.polyline([pCoords, cCoords, dCoords], {
        color: '#6366F1',
        weight: 3.5,
        opacity: 0.9,
      }).addTo(map);

      // Driver Pulse Node
      const driverIcon = L.divIcon({
        className: 'onecargo-driver-node',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #6366F1; opacity: 0.4; animation: pulse 2s infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #6366F1; border: 2.5px solid #FFFFFF; box-shadow: 0 0 12px #6366F1;"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker(cCoords, { icon: driverIcon }).addTo(map).bindPopup(`<b>${driverName}</b><br/>${tracking}`);
    });

    return () => {
      isMounted = false;
    };
  }, [activeOrder, driverName, tracking]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">Delivering Process</h3>
          <p className="text-xs text-muted-foreground">Real-time tracking of your goods shipment</p>
        </div>
        <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Embedded OneCargo Dark Vector Map */}
      <div className="relative h-[220px] w-full overflow-hidden rounded-xl border border-border/80 bg-black/40 shadow-inner">
        <div ref={containerRef} className="h-full w-full z-0" />
        <div className="absolute top-3 left-3 z-10 rounded-lg bg-card/90 border border-border/80 px-2.5 py-1 text-[10px] font-bold text-foreground backdrop-blur-md">
          <span>📦 {tracking}</span>
        </div>
      </div>

      {/* Delivery Informations */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <span>Delivery Informations</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            Add Record
          </button>
        </div>

        {/* Timeline Entries */}
        <div className="space-y-3 pt-2 text-xs">
          <div className="flex items-start justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-success shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Origin</span>
                <p className="font-bold text-foreground">{pickup}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-success/15 border border-success/30 px-2 py-0.5 text-[10px] font-bold text-success">
                Good Condition
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">Today, 14:20</p>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Destination</span>
                <p className="font-bold text-foreground">{dropoff}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
                In Transit
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">Est. 17:45</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
