import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { FleetMapCanvas } from '@/components/fleet-map-canvas';
import { loadDashboardDrivers, loadDashboardOrders, loadConnectedUsers, loadDashboardWallet } from '@/lib/admin-data';
import { Radar, Users, Package, Wifi, ArrowLeft } from 'lucide-react';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session';

export default async function LiveFleetMapPage() {
  const [drivers, orders, connectedUsers, walletData] = await Promise.all([
    loadDashboardDrivers(),
    loadDashboardOrders(),
    loadConnectedUsers(),
    loadDashboardWallet(),
  ]);

  const token = (await cookies()).get(SESSION_COOKIE)?.value || '';

  const activeOrders = orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'ACCEPTED');
  const onlineCount = connectedUsers.filter((u) => u.status === 'ONLINE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Radar className="h-6 w-6 text-primary animate-pulse" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Live Fleet Radar</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE GPS & WEBSOCKET
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Interactive real-time fleet map showing active couriers, route polylines, connected users, and live wallet transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orders"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Order Registry
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Active Couriers</p>
            <Radar className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-foreground">{drivers.length}</p>
          <p className="mt-1 text-xs text-emerald-400 font-semibold">100% connected</p>
        </Card>

        <Card className="border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">In-Transit Deliveries</p>
            <Package className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-foreground">{activeOrders.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Live GPS routes active</p>
        </Card>

        <Card className="border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Connected Users</p>
            <Wifi className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-foreground">{connectedUsers.length}</p>
          <p className="mt-1 text-xs text-sky-400 font-semibold">{onlineCount} online right now</p>
        </Card>

        <Card className="border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Logistics Hubs</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-foreground">5 Hubs</p>
          <p className="mt-1 text-xs text-primary font-semibold">Lagos, Abuja, PH, Kano, Ibadan</p>
        </Card>
      </div>

      {/* Fleet Map Canvas Wrapped in Suspense Boundary */}
      <Suspense fallback={<div className="h-[600px] w-full rounded-2xl bg-muted/20 animate-pulse flex items-center justify-center text-sm font-bold text-muted-foreground">Loading Live Fleet Radar Map...</div>}>
        <FleetMapCanvas
          drivers={drivers}
          orders={orders}
          connectedUsers={connectedUsers}
          walletTransactions={walletData.transactions}
          token={token}
        />
      </Suspense>
    </div>
  );
}
