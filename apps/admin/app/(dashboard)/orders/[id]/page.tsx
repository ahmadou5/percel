import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { getOrderDetail } from '@/lib/admin-data';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = getOrderDetail(params.id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge>{order.status}</Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{order.trackingCode}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{order.user} · {order.driver} · {order.date}</p>
        </div>
        <DetailActions
          actions={[
            { label: 'Force cancel', tone: 'danger', prompt: 'Reason for force cancel', successMessage: `${order.trackingCode} cancellation recorded in the admin shell.` },
            { label: 'Resolve dispute', tone: 'default', successMessage: `${order.trackingCode} marked as resolved in the admin shell.` },
            { label: 'Refund payment', tone: 'secondary', successMessage: `Refund for ${order.trackingCode} queued in the admin shell.` },
          ]}
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Route and payment</h3>
          <div className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Pickup</span><div className="font-medium">{order.pickup}</div></div>
            <div><span className="text-muted-foreground">Delivery</span><div className="font-medium">{order.dropoff}</div></div>
            <div><span className="text-muted-foreground">Payment</span><div className="font-medium">{order.payment}</div></div>
            <div><span className="text-muted-foreground">Risk level</span><div className="font-medium">{order.riskLevel}</div></div>
            <div><span className="text-muted-foreground">Customer note</span><div className="font-medium">{order.customerNote}</div></div>
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Timeline and items</h3>
          <div className="space-y-3">
            {order.timeline.map((item) => (
              <div key={`${item.status}-${item.at}`} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium">{item.status}</div>
                  <span className="text-xs text-muted-foreground">{item.at}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">Items: {order.items.join(', ')}</div>
        </Card>
      </section>
    </div>
  );
}
