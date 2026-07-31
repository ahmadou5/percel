import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { OrderDispatchMap } from '@/components/order-dispatch-map';
import { getOrderDetail } from '@/lib/admin-data';

const statusTone: Record<string, string> = {
  COMPLETED: 'border-success/20 bg-success/10 text-success',
  IN_TRANSIT: 'border-primary/20 bg-primary/10 text-primary',
  PENDING_MATCH: 'border-warning/25 bg-warning/10 text-warning',
  CANCELLED: 'border-muted bg-muted text-muted-foreground',
  DISPUTED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

function PartyCard({
  role,
  name,
  email,
  phone,
  sub,
  avatarUrl,
  profileHref,
  accentClass,
}: {
  role: string;
  name: string;
  email?: string;
  phone?: string;
  sub?: string;
  avatarUrl?: string;
  profileHref?: string;
  accentClass: string;
}) {
  const initial = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${accentClass}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{role}</div>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center font-bold text-lg overflow-hidden border bg-muted/40">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-foreground/60">{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{name}</p>
          {email && <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>}
          {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
      {profileHref && name !== 'Unassigned' && (
        <Link href={profileHref} className="text-xs text-primary hover:underline self-start">
          View full profile →
        </Link>
      )}
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const actions = [
    { label: 'Force cancel', tone: 'danger' as const, prompt: 'Reason for cancellation', actionUrl: `/api/admin/orders/${id}/cancel`, successMessage: `${order.trackingCode} cancelled and refunded.` },
    { label: 'Resolve dispute', tone: 'default' as const, actionUrl: `/api/admin/orders/${id}/resolve-dispute`, successMessage: `Dispute on ${order.trackingCode} resolved.` },
    { label: 'Refund payment', tone: 'secondary' as const, actionUrl: `/api/admin/orders/${id}/refund`, successMessage: `Refund for ${order.trackingCode} processed.` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[order.status] ?? 'border-border bg-muted text-muted-foreground'}`}>
              {order.status?.replaceAll('_', ' ') ?? 'UNKNOWN'}
            </span>
            {order.riskLevel === 'High' && (
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                High risk
              </span>
            )}
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight font-mono">{order.trackingCode}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{order.date} · {order.payment}</p>
        </div>
        <DetailActions actions={actions} />
      </div>

      {/* Sender + Driver + Recipient parties */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Parties involved</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <PartyCard
            role="Sender"
            name={order.user}
            email={order.userEmail}
            phone={order.userPhone}
            avatarUrl={order.userAvatarUrl}
            profileHref={order.userId ? `/users/${order.userId}` : undefined}
            accentClass="border-primary/20 bg-primary/5"
          />
          <PartyCard
            role="Assigned driver"
            name={order.driver}
            email={order.driverEmail}
            phone={order.driverPhone}
            sub={[order.driverVehicle, order.driverRating ? `${order.driverRating} ★` : ''].filter(Boolean).join(' · ')}
            avatarUrl={order.driverAvatarUrl}
            profileHref={order.driverId ? `/drivers/${order.driverId}` : undefined}
            accentClass="border-success/20 bg-success/5"
          />
          <PartyCard
            role="Recipient (Drop-off)"
            name={order.recipientName || 'Unspecified'}
            phone={order.recipientPhone || undefined}
            sub="Delivery point contact"
            accentClass="border-warning/20 bg-warning/5"
          />
        </div>
      </section>

      {/* Route Map & Dispatch View */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Order Dispatch Map & Live GPS</h3>
          <Link href="/orders/live-map" className="text-xs font-semibold text-primary hover:underline">
            Open Full Fleet Radar →
          </Link>
        </div>
        <OrderDispatchMap order={order} />
      </section>

      {/* Route, payment, timeline */}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Route & payment</h3>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-start">
              <span className="text-muted-foreground pt-0.5">Pickup</span>
              <div className="font-medium">{order.pickup}</div>
              <span className="text-muted-foreground pt-0.5">Delivery</span>
              <div className="font-medium">{order.dropoff}</div>
              <span className="text-muted-foreground">Price</span>
              <div className="font-mono font-semibold">{order.price}</div>
              <span className="text-muted-foreground">Payment</span>
              <div className="font-medium">{order.payment}</div>
            </div>
            {order.customerNote && order.customerNote !== 'No incidents logged.' && (
              <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
                <span className="font-semibold block mb-0.5">Note</span>
                {order.customerNote}
              </div>
            )}
          </div>
          {/* Items & Photos */}
          {order.items.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Parcel Items & Photos</h4>
              <div className="space-y-2">
                {order.items.map((item: string, idx: number) => (
                  <div key={idx} className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">{item}</div>
                ))}
              </div>
            </div>
          )}
          {order.packageImages && order.packageImages.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Attached Package Photos</h4>
              <div className="flex flex-wrap gap-2">
                {order.packageImages.map((img: string, idx: number) => (
                  <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-xl border border-border hover:opacity-90">
                    <img src={img} alt={`Package photo ${idx + 1}`} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Status timeline</h3>
          <div className="relative space-y-0">
            {order.timeline.map((item: { status: string; note: string; at: string }, idx: number) => (
              <div key={`${item.status}-${item.at}`} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Vertical line */}
                {idx < order.timeline.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                )}
                <div className="w-6 h-6 rounded-full border-2 border-primary bg-card shrink-0 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{item.status?.replaceAll('_', ' ') ?? item.status}</div>
                    <span className="text-xs text-muted-foreground shrink-0">{item.at}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                </div>
              </div>
            ))}
            {order.timeline.length === 0 && (
              <p className="text-sm text-muted-foreground py-3 text-center">No timeline events recorded.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
