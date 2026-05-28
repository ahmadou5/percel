import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RevenueChart, StatusDonut } from '@/components/ui/charts';
import { StatCard } from '@/components/ui/stat-card';
import { loadDashboardSnapshot } from '@/lib/admin-data';

export default async function DashboardPage() {
  const data = await loadDashboardSnapshot();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <RevenueChart />
        <StatusDonut />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent orders</h2>
            <p className="text-sm text-muted-foreground">Latest dispatch activity across the platform</p>
          </div>
          <Badge>Live snapshot</Badge>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
                  <tr key={order.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-5 py-4 font-mono text-xs tabular-nums text-foreground">
                      <Link className="hover:text-primary" href={`/orders/${order.id}`}>
                        {order.trackingCode}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{order.user}</td>
                    <td className="px-5 py-4 text-muted-foreground">{order.driver}</td>
                    <td className="px-5 py-4"><span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">{order.status}</span></td>
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
