import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { getUserDetail } from '@/lib/admin-data';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUserDetail(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge>{user.status}</Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{user.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{user.email} · {user.phone} · {user.city}</p>
        </div>
        <DetailActions
          actions={[
            { label: 'Suspend', tone: 'danger', prompt: 'Reason for suspension', successMessage: `${user.name} has been suspended in the admin shell.` },
            { label: 'Reactivate', tone: 'secondary', successMessage: `${user.name} has been reactivated in the admin shell.` },
            { label: 'View wallet', tone: 'ghost', successMessage: `Wallet for ${user.name} opened.` },
          ]}
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Profile summary</h3>
          <p className="text-sm text-muted-foreground">Joined {user.joined} · {user.orders} orders · Wallet {user.walletBalance}</p>
          <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">{user.supportNote}</p>
        </Card>
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Recent activity</h3>
          <div className="space-y-3">
            {user.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-2xl border border-border p-4 text-sm">
                <div>
                  <div className="font-medium">{order.trackingCode}</div>
                  <div className="text-xs text-muted-foreground">{order.status} · {order.date}</div>
                </div>
                <div className="font-mono tabular-nums">{order.price}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
