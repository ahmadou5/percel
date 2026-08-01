'use client';

import { TrackedOrder } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  ShieldCheck,
  Phone,
  Bike,
  Car,
  Package,
  User,
  Star,
  MapPin,
  Clock,
  Weight,
  AlertTriangle,
} from 'lucide-react';

interface DriverCardProps {
  driver?: TrackedOrder['driver'];
  order: TrackedOrder;
}

function VehicleIcon({ type }: { type?: string }) {
  const t = (type || '').toUpperCase();
  if (t.includes('CAR') || t.includes('VAN')) return <Car className="h-5 w-5" />;
  return <Bike className="h-5 w-5" />;
}

export function DriverCard({ driver, order }: DriverCardProps) {
  const recipient = order.recipientName || order.recipientPhone;

  return (
    <div className="space-y-4">
      {/* ──── COURIER CARD ──── */}
      <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              Assigned Courier
            </span>
            <h3 className="text-sm font-extrabold text-foreground mt-0.5">
              {driver ? driver.fullName : 'Searching for Courier…'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>KYC Verified</span>
          </div>
        </div>

        {driver ? (
          <div className="space-y-4">
            {/* Driver Avatar + Info Row */}
            <div className="flex items-center gap-4">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 text-primary font-black text-xl">
                {driver.fullName.charAt(0).toUpperCase()}
                {/* Online dot */}
                {driver.isOnline && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-foreground truncate">{driver.fullName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{driver.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">rating</span>
                </div>
              </div>

              {/* Call Driver Button */}
              {driver.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call</span>
                </a>
              )}
            </div>

            {/* Vehicle Details */}
            <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-slate-900/60 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30">
                <VehicleIcon type={driver.vehicleType} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">
                  {driver.vehicleModel || driver.vehicleType || 'Delivery Bike'}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {driver.vehiclePlate ? `Plate: ${driver.vehiclePlate}` : 'Plate: N/A'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            A KYC-verified rider is being assigned. You'll see their vehicle plate and live map location here as soon as they accept the delivery.
          </p>
        )}

        {/* Package Specs */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-xl border border-border/60 bg-slate-900/40 p-2.5 space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground">Package Size</p>
            <p className="text-xs font-extrabold text-foreground">{order.size}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-slate-900/40 p-2.5 space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground">Delivery Fare</p>
            <p className="text-xs font-extrabold text-primary">{formatCurrency(order.price, order.currency)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-slate-900/40 p-2.5 space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground">Distance</p>
            <p className="text-xs font-extrabold text-foreground">{Number(order.distanceKm).toFixed(1)} km</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-slate-900/40 p-2.5 space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground">Est. Duration</p>
            <p className="text-xs font-extrabold text-foreground">
              {order.estimatedDurationMin ? `~${order.estimatedDurationMin} min` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* ──── RECEIVER CARD ──── */}
      {recipient && (
        <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
              <User className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              Recipient / Receiver
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {order.recipientName && (
                <p className="text-sm font-extrabold text-foreground">{order.recipientName}</p>
              )}
              {order.recipientPhone && (
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{order.recipientPhone}</p>
              )}
              {order.notes && (
                <p className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 leading-relaxed border border-border/60">
                  📝 {order.notes}
                </p>
              )}
            </div>

            {/* Call Recipient Button */}
            {order.recipientPhone && (
              <a
                href={`tel:${order.recipientPhone}`}
                className="flex shrink-0 items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-500/25 transition-all"
              >
                <Phone className="h-4 w-4" />
                <span>Call</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ──── PACKAGE ITEMS CARD ──── */}
      {order.items && order.items.length > 0 && (
        <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              Package Contents
            </span>
          </div>

          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={item.id || i} className="flex items-center gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.description}
                    className="h-10 w-10 shrink-0 rounded-xl object-cover border border-border/60"
                  />
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted/60 border border-border/60 text-muted-foreground">
                    <Package className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">Qty: {item.quantity}</span>
                    {item.weightKg && (
                      <span className="text-[10px] text-muted-foreground">· {item.weightKg}kg</span>
                    )}
                    {item.fragile && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Fragile
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
