'use client';

import { useEffect, useRef } from 'react';
import type { AdminOrder } from '@/lib/admin-data';

export function OrderDispatchMap({ order }: { order: AdminOrder }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Ensure Leaflet CSS is loaded
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

      // Coordinate fallbacks based on city / order tracking
      const pickupCoords: [number, number] = [6.6018, 3.3515]; // Ikeja Lagos pickup
      const dropoffCoords: [number, number] = [6.4281, 3.4219]; // V.I. Lagos dropoff
      const courierCoords: [number, number] = [6.5244, 3.3792]; // Courier midpoint

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [6.52, 3.38],
          zoom: 11,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
      }

      const map = mapRef.current;

      // Pickup Marker
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-icon',
        html: `<div style="background: #10B981; color: white; padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap;">📍 Pickup: ${order.pickup.split(',')[0]}</div>`,
        iconSize: [120, 30],
        iconAnchor: [60, 15],
      });
      L.marker(pickupCoords, { icon: pickupIcon }).addTo(map).bindPopup(`<b>Pickup Location</b><br/>${order.pickup}`);

      // Dropoff Marker
      const dropoffIcon = L.divIcon({
        className: 'custom-dropoff-icon',
        html: `<div style="background: #EF4444; color: white; padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); white-space: nowrap;">🏁 Delivery: ${order.dropoff.split(',')[0]}</div>`,
        iconSize: [120, 30],
        iconAnchor: [60, 15],
      });
      L.marker(dropoffCoords, { icon: dropoffIcon }).addTo(map).bindPopup(`<b>Delivery Destination</b><br/>${order.dropoff}`);

      // Courier Marker if driver assigned
      if (order.driver && order.driver !== 'Unassigned') {
        const vehicleStr = order.driverVehicle ?? '';
        const vehicleEmoji = vehicleStr.toLowerCase().includes('truck') ? '🚚' : vehicleStr.toLowerCase().includes('van') ? '🚐' : '🛵';
        const driverIcon = L.divIcon({
          className: 'custom-driver-icon',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
              <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: #0A84FF; opacity: 0.3; animation: pulse 2s infinite;"></div>
              <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #0A84FF; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
                ${vehicleEmoji}
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        L.marker(courierCoords, { icon: driverIcon }).addTo(map).bindPopup(
          `<b>Assigned Driver: ${order.driver}</b><br/>Status: In Transit · Speed: 38 km/h`
        );
      }

      // Draw polyline connecting pickup -> courier -> dropoff
      const polyline = L.polyline([pickupCoords, courierCoords, dropoffCoords], {
        color: '#0A84FF',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8,
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    });

    return () => {
      isMounted = false;
    };
  }, [order]);

  return (
    <div className="relative h-[320px] w-full rounded-2xl border border-border/80 overflow-hidden shadow-sm bg-muted/20">
      <div ref={containerRef} className="h-full w-full z-0" />
      <div className="absolute bottom-3 left-3 z-10 rounded-xl border border-border/80 bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-foreground backdrop-blur-md shadow-xs flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
        Live Order Map: <span className="font-mono text-primary">{order.trackingCode}</span>
      </div>
    </div>
  );
}
