import { DriverDetails, TrackedOrder } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { User, ShieldCheck, Phone, Bike, Car, Package, DollarSign } from 'lucide-react';

interface DriverCardProps {
  driver?: DriverDetails | null;
  order: TrackedOrder;
}

export function DriverCard({ driver, order }: DriverCardProps) {
  return (
    <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl space-y-5">
      {/* Header Info */}
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
          <ShieldCheck className="h-4 w-4" />
          <span>KYC Verified</span>
        </div>
      </div>

      {driver ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-slate-900/60 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40">
                <Bike className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {driver.vehicleModel || driver.vehicleType || 'Delivery Bike'}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Plate: {driver.vehiclePlate || 'N/A'} • Rating ★{driver.rating.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          A KYC-verified rider is currently being assigned to pickup your package. You will see rider vehicle plate and live map location here as soon as matched.
        </p>
      )}

      {/* Package Specs Summary */}
      <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
        <div className="rounded-xl border border-border/60 bg-slate-900/40 p-2.5">
          <p className="text-[10px] font-medium text-muted-foreground">Package Size</p>
          <p className="font-extrabold text-foreground mt-0.5">{order.size} Package</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-slate-900/40 p-2.5">
          <p className="text-[10px] font-medium text-muted-foreground">Delivery Fare</p>
          <p className="font-extrabold text-primary mt-0.5">{formatCurrency(order.price, order.currency)}</p>
        </div>
      </div>
    </div>
  );
}
