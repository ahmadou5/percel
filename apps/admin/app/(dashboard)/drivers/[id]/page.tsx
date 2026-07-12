import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { getDriverDetail } from '@/lib/admin-data';

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriverDetail(id);
  if (!driver) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge>{driver.status}</Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{driver.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{driver.email} · {driver.phone} · {driver.vehicle}</p>
        </div>
        <DetailActions
          actions={[
            { label: 'Approve KYC', tone: 'default', successMessage: `${driver.name} KYC approved in the admin shell.` },
            { label: 'Reject KYC', tone: 'danger', prompt: 'Rejection reason', successMessage: `${driver.name} KYC rejection noted in the admin shell.` },
            { label: 'Suspend driver', tone: 'secondary', prompt: 'Suspension reason', successMessage: `${driver.name} has been suspended in the admin shell.` },
          ]}
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold tracking-tight">KYC review</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(driver.kycDocuments ?? []).map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</div>
                <div className="mt-2 font-medium">{item.value}</div>
              </div>
            ))}
          </div>
          {driver.kycReason ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{driver.kycReason}</p> : null}
        </Card>
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Reviews</h3>
          {(driver.reviews ?? []).map((review) => (
            <div key={review.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="font-medium">{review.user}</div>
                <Badge>{review.rating} ★</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">Assigned orders: {driver.assignedOrders?.length ?? 0}</div>
        </Card>
      </section>
    </div>
  );
}
