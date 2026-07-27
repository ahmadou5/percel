'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';

interface HubCoordinatePickerProps {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  onChange: (lat: number, lng: number) => void;
}

// Preset City Center Coordinates in Nigeria for Quick Pick
const NIGERIAN_CITY_PRESETS: Record<string, [number, number]> = {
  'abuja': [9.0765, 7.3986],
  'lagos': [6.5244, 3.3792],
  'kano': [12.0022, 8.592],
  'port harcourt': [4.8156, 7.0498],
  'ibadan': [7.3775, 3.947],
  'kaduna': [10.5105, 7.4165],
  'enugu': [6.4584, 7.5464],
  'benin': [6.335, 5.6037],
  'jos': [9.8965, 8.8583],
};

export function HubCoordinatePicker({ lat, lng, city = '', state = '', onChange }: HubCoordinatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initial center default (Lagos/Abuja or current lat/lng)
  const currentLat = lat && lat !== 0 ? lat : 9.0765;
  const currentLng = lng && lng !== 0 ? lng : 7.3986;

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Load Leaflet CSS dynamically if not present
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
          center: [currentLat, currentLng],
          zoom: lat && lng && lat !== 0 ? 13 : 6,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        // Custom Marker Icon
        const pinIcon = L.divIcon({
          className: 'custom-hub-picker-pin',
          html: `<div style="background: #0284C7; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([currentLat, currentLng], {
          draggable: true,
          icon: pinIcon,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        });

        map.on('click', (e: any) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          marker.setLatLng([clickLat, clickLng]);
          onChange(Number(clickLat.toFixed(6)), Number(clickLng.toFixed(6)));
        });

        markerRef.current = marker;
        setMapLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync marker position when parent props change
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat && lng && lat !== 0 && lng !== 0) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  // Quick preset button click
  const handleQuickPreset = (key: string) => {
    const coords = NIGERIAN_CITY_PRESETS[key.toLowerCase()];
    if (coords) {
      onChange(coords[0], coords[1]);
      if (mapRef.current && markerRef.current) {
        markerRef.current.setLatLng(coords);
        mapRef.current.setView(coords, 12);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Hub Map Pin & Coordinates <span className="text-rose-500">*</span>
        </label>
        <span className="text-xs font-mono text-foreground font-bold">
          {lat && lng && lat !== 0 ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Click map to drop pin'}
        </span>
      </div>

      {/* Embedded Map Canvas */}
      <div className="relative rounded-xl border border-border overflow-hidden bg-muted/40 h-44 shadow-inner">
        <div ref={containerRef} className="w-full h-full z-0" />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs text-muted-foreground">
            Loading interactive map...
          </div>
        )}
      </div>

      {/* Preset Location Shortcuts */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Navigation className="h-3 w-3 text-primary" /> Quick Center:
        </span>
        {Object.keys(NIGERIAN_CITY_PRESETS).map((cityName) => (
          <button
            key={cityName}
            type="button"
            onClick={() => handleQuickPreset(cityName)}
            className="capitalize rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            {cityName}
          </button>
        ))}
      </div>
    </div>
  );
}
