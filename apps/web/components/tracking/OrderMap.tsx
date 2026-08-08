'use client';

import { useEffect, useMemo } from 'react';
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { TrackedOrder } from '@/lib/api';
import { MapPin } from 'lucide-react';

interface OrderMapProps {
  order: TrackedOrder;
}

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function PolylineOverlay({
  pickup,
  delivery,
  courier,
}: {
  pickup: { lat: number; lng: number };
  delivery: { lat: number; lng: number };
  courier?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core'); // LatLngBounds lives here in Maps JS API v3.55+

  useEffect(() => {
    if (!map || !mapsLib || !coreLib) return;

    const path = courier ? [pickup, courier, delivery] : [pickup, delivery];

    const polyline = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: '#6366F1',
      strokeOpacity: 0.85,
      strokeWeight: 4,
    });
    polyline.setMap(map);

    // Fit map bounds to show all markers
    const bounds = new coreLib.LatLngBounds();
    path.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLib, coreLib, pickup, delivery, courier]);

  return null;
}

export function OrderMap({ order }: OrderMapProps) {
  const pickup = useMemo(
    () => ({ lat: Number(order.pickupLat), lng: Number(order.pickupLng) }),
    [order.pickupLat, order.pickupLng]
  );
  const delivery = useMemo(
    () => ({ lat: Number(order.deliveryLat), lng: Number(order.deliveryLng) }),
    [order.deliveryLat, order.deliveryLng]
  );

  const courier = useMemo(() => {
    if (order.courierLat != null && order.courierLng != null) {
      return { lat: Number(order.courierLat), lng: Number(order.courierLng) };
    }
    return pickup;
  }, [order.courierLat, order.courierLng, pickup]);

  const defaultCenter = courier || pickup;

  if (!MAPS_API_KEY) {
    return (
      <div className="relative flex h-[380px] w-full flex-col items-center justify-center rounded-3xl border border-border/80 bg-slate-900/90 p-6 text-center shadow-xl">
        <MapPin className="h-10 w-10 text-primary mb-2 animate-bounce" />
        <h3 className="text-base font-bold text-foreground">Interactive Delivery Map</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-md">
          Pickup: <span className="text-foreground font-semibold">{order.pickupFormattedAddress}</span>
        </p>
        <p className="text-xs text-muted-foreground max-w-md mt-0.5">
          Delivery: <span className="text-foreground font-semibold">{order.deliveryFormattedAddress}</span>
        </p>
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-mono text-primary">
          Google Maps Key pending in .env.local
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-border/80 shadow-2xl">
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="h-full w-full"
        >
          {/* Pickup Marker */}
          <Marker position={pickup} title={`Pickup: ${order.pickupFormattedAddress}`} />

          {/* Delivery Marker */}
          <Marker position={delivery} title={`Destination: ${order.deliveryFormattedAddress}`} />

          {/* Courier Live Marker if active */}
          {courier && (
            <Marker position={courier} title={`Courier Location (${order.driver?.fullName ?? 'Rider'})`} />
          )}

          <PolylineOverlay pickup={pickup} delivery={delivery} courier={courier} />
        </Map>
      </APIProvider>

      {/* Floating Status Bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between rounded-2xl border border-border/80 bg-slate-950/85 px-4 py-2.5 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-xs font-extrabold text-foreground">
            {order.status === 'DELIVERED'
              ? 'Package Delivered'
              : order.status === 'IN_TRANSIT'
              ? 'Courier in Transit'
              : order.status === 'PICKED_UP'
              ? 'Picked Up by Rider'
              : 'Order Active'}
          </span>
        </div>
        {order.etaMinutes && (
          <span className="rounded-full bg-primary/20 border border-primary/40 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
            ETA: ~{order.etaMinutes} mins
          </span>
        )}
      </div>
    </div>
  );
}
