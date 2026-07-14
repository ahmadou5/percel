import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { loadDashboardOrders } from '@/lib/admin-data';

const statusTone: Record<string, string> = {
  COMPLETED: 'border-success/20 bg-success/10 text-success',
  IN_TRANSIT: 'border-primary/20 bg-primary/10 text-primary',
  PENDING_MATCH: 'border-warning/25 bg-warning/10 text-warning',
  CANCELLED: 'border-muted bg-muted text-muted-foreground',
  DISPUTED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export default async function OrdersPage() {
  const rows = await loadDashboardOrders();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Order management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live shipment status, prices, disputes, and delivery history from the Percel API.
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Tracking</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Sender</th>
                <th className="px-5 py-4">Driver</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/30">
                  <td className="px-5 py-4 font-mono text-xs tabular-nums text-foreground">{order.trackingCode}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[order.status] ?? 'border-border bg-muted text-muted-foreground'}`}>
                      {order.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium">{order.user}</div>
                    {order.userEmail && <div className="text-xs text-muted-foreground">{order.userEmail}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium">{order.driver}</div>
                    {order.driverVehicle && <div className="text-xs text-muted-foreground">{order.driverVehicle}</div>}
                  </td>
                  <td className="px-5 py-4 font-mono tabular-nums">{order.price}</td>
                  <td className="px-5 py-4">
                    <Link className="text-primary hover:underline" href={`/orders/${order.id}`}>Open order</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
