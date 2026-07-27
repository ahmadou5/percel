import { Suspense } from 'react';
import Link from 'next/link';
import { Radar, Package } from 'lucide-react';

import { loadDashboardOrders } from '@/lib/admin-data';
import { OrderRegistryTable } from '@/components/order-registry-table';

export default async function OrdersPage() {
  const rows = await loadDashboardOrders();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Order Registry</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete shipment ledger, live status badges, dispute tracking, pricing analytics, and driver assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orders/live-map"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary shadow-xs transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Radar className="h-4 w-4 animate-pulse text-primary" /> 📡 Open Live Fleet Radar Map
          </Link>
        </div>
      </div>

      {/* Main Order Registry Table with Suspense for URL Query Params */}
      <Suspense
        fallback={
          <div className="h-96 w-full rounded-2xl border border-border bg-card/50 animate-pulse flex items-center justify-center text-sm font-bold text-muted-foreground">
            Loading Order Registry...
          </div>
        }
      >
        <OrderRegistryTable initialOrders={rows} />
      </Suspense>
    </div>
  );
}
