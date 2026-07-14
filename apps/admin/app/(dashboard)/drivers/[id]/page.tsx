import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { getDriverDetail } from '@/lib/admin-data';

const kycTone: Record<string, string> = {
  APPROVED: 'border-success/20 bg-success/10 text-success',
  SUBMITTED: 'border-warning/25 bg-warning/10 text-warning',
  PENDING: 'border-muted bg-muted text-muted-foreground',
  REJECTED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriverDetail(id);
  if (!driver) notFound();

  const initial = driver.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const isSuspended = driver.status === 'SUSPENDED';
  const kycPending = driver.kyc === 'SUBMITTED' || driver.kyc === 'PENDING';

  const actions = [
    ...(kycPending ? [
      { label: 'Approve KYC', tone: 'default' as const, actionUrl: `/api/admin/drivers/${id}/approve-kyc`, successMessage: `${driver.name} KYC approved.` },
      { label: 'Reject KYC', tone: 'danger' as const, prompt: 'Rejection reason', actionUrl: `/api/admin/drivers/${id}/reject-kyc`, successMessage: `${driver.name} KYC rejected.` },
    ] : []),
    ...(isSuspended ? [
      { label: 'Reactivate driver', tone: 'secondary' as const, actionUrl: `/api/admin/drivers/${id}/reactivate`, successMessage: `${driver.name} reactivated.` },
    ] : [
      { label: 'Suspend driver', tone: 'danger' as const, prompt: 'Suspension reason', actionUrl: `/api/admin/drivers/${id}/suspend`, successMessage: `${driver.name} suspended.` },
    ]),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl shrink-0 bg-success/10 border border-success/20 flex items-center justify-center font-bold text-success text-xl overflow-hidden">
            {driver.avatarUrl ? (
              <img src={driver.avatarUrl} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${driver.status === 'ACTIVE' ? 'border-success/20 bg-success/10 text-success' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}>
                {driver.status}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kycTone[driver.kyc] ?? 'border-border bg-muted text-muted-foreground'}`}>
                KYC {driver.kyc}
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{driver.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{driver.email} · {driver.phone} · {driver.vehicle}</p>
          </div>
        </div>
        <DetailActions actions={actions} />
      </div>

      {/* Content */}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* KYC documents */}
        <Card className="space-y-4 p-5">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">KYC documents</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Submitted identity and vehicle records</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(driver.kycDocuments ?? []).map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</div>
                <div className="mt-2 font-medium text-sm break-all">{item.value}</div>
              </div>
            ))}
          </div>
          {driver.kycReason && (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {driver.kycReason}
            </p>
          )}
        </Card>

        {/* Reviews and assigned orders */}
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <h3 className="text-lg font-semibold tracking-tight">Customer reviews</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {(driver.reviews ?? []).length > 0 ? (driver.reviews ?? []).map((review) => (
                <div key={review.id} className="rounded-2xl border border-border p-4 bg-muted/20">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-sm">{review.user}</div>
                    <div className="flex items-center gap-1 font-mono text-sm text-warning">
                      <span className="font-semibold">{review.rating}</span>
                      <span>★</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground py-3 text-center">No reviews yet.</p>
              )}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="text-lg font-semibold tracking-tight">Assigned orders</h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {(driver.assignedOrders ?? []).length > 0 ? (driver.assignedOrders ?? []).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-2xl border border-border p-3.5 text-sm bg-muted/20">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-mono font-medium text-primary hover:underline">
                      {order.trackingCode}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">{order.status} · {order.date}</div>
                  </div>
                  <div className="font-mono tabular-nums">{order.price}</div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground py-3 text-center">
                  No assigned orders recorded.
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
