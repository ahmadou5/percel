import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RevenueChart, StatusDonut } from '@/components/ui/charts';
import { StatCard } from '@/components/ui/stat-card';
import { loadDashboardSnapshot } from '@/lib/admin-data';

const statusTone: Record<string, string> = {
  COMPLETED: 'border-primary/20 bg-primary/10 text-primary',
  IN_TRANSIT: 'border-success/20 bg-success/10 text-success',
  PENDING_MATCH: 'border-warning/25 bg-warning/10 text-warning',
  DISPUTED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export default async function DashboardPage() {
  const data = await loadDashboardSnapshot();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge>Live operations</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Percel control center</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Metrics are calculated from the current admin order, user, driver, wallet, and notification records.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/70 bg-muted/40 p-2 text-center text-xs text-muted-foreground">
            <div className="rounded-md bg-card px-3 py-2"><span className="block font-mono text-base font-semibold text-foreground">{data.userRows.length}</span>Users</div>
            <div className="rounded-md bg-card px-3 py-2"><span className="block font-mono text-base font-semibold text-foreground">{data.driverRows.length}</span>Drivers</div>
            <div className="rounded-md bg-card px-3 py-2"><span className="block font-mono text-base font-semibold text-foreground">{data.notificationRows.length}</span>Alerts</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <RevenueChart data={data.revenueSeries} />
        <StatusDonut data={data.orderStatusBreakdown} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent orders</h2>
            <p className="mt-1 text-sm text-muted-foreground">Latest dispatch activity across the platform</p>
          </div>
          <Badge>Derived snapshot</Badge>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Tracking</th>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Driver</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border/70 motion-safe:transition-colors hover:bg-muted/35 last:border-b-0">
                    <td className="px-5 py-4 font-mono text-xs tabular-nums text-foreground">
                      <Link className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/orders/${order.id}`}>
                        {order.trackingCode}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{order.user}</td>
                    <td className="px-5 py-4 text-muted-foreground">{order.driver}</td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[order.status] ?? 'border-border bg-muted text-muted-foreground'}`}>{order.status.replaceAll('_', ' ')}</span></td>
                    <td className="px-5 py-4 font-mono tabular-nums">{order.price}</td>
                    <td className="px-5 py-4 text-muted-foreground">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
