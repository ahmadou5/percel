import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { loadDashboardOrders } from '@/lib/admin-data';

export default async function OrdersPage() {
  const rows = await loadDashboardOrders();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Order management</h2>
        <p className="mt-1 text-sm text-muted-foreground">Live shipment status, prices, disputes, and delivery history from the Percel API.</p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr><th className="px-5 py-4">Tracking</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">User</th><th className="px-5 py-4">Driver</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Details</th></tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4 font-mono tabular-nums">{order.trackingCode}</td>
                <td className="px-5 py-4"><Badge>{order.status}</Badge></td>
                <td className="px-5 py-4 text-muted-foreground">{order.user}</td>
                <td className="px-5 py-4 text-muted-foreground">{order.driver}</td>
                <td className="px-5 py-4 font-mono tabular-nums">{order.price}</td>
                <td className="px-5 py-4"><Link className="text-primary hover:underline" href={`/orders/${order.id}`}>Open order</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
