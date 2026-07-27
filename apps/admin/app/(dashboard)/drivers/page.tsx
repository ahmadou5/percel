import { Suspense } from 'react';
import Link from 'next/link';
import { Truck, Radar } from 'lucide-react';

import { loadDashboardDrivers } from '@/lib/admin-data';
import { DriversFleetTable } from '@/components/drivers-fleet-table';

export default async function DriversPage() {
  const rows = await loadDashboardDrivers();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Drivers Fleet</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              FLEET TELEMETRY
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Couriers list, KYC verification queue, fleet ratings, vehicle records, and wallet balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orders/live-map"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary shadow-xs transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Radar className="h-4 w-4 animate-pulse text-primary" /> 📡 Live Radar Map
          </Link>
        </div>
      </div>

      {/* Main Drivers Fleet Table with Suspense for URL Query Params */}
      <Suspense
        fallback={
          <div className="h-96 w-full rounded-2xl border border-border bg-card/50 animate-pulse flex items-center justify-center text-sm font-bold text-muted-foreground">
            Loading Drivers Fleet...
          </div>
        }
      >
        <DriversFleetTable initialDrivers={rows} />
      </Suspense>
    </div>
  );
}
