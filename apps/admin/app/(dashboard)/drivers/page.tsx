import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { loadDashboardDrivers } from '@/lib/admin-data';

function AvatarCell({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initial = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl shrink-0 bg-success/10 border border-success/20 flex items-center justify-center text-xs font-bold text-success overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <span className="font-medium">{name}</span>
    </div>
  );
}

const kycTone: Record<string, string> = {
  APPROVED: 'border-success/20 bg-success/10 text-success',
  SUBMITTED: 'border-warning/25 bg-warning/10 text-warning',
  PENDING: 'border-muted bg-muted text-muted-foreground',
  REJECTED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

const statusTone: Record<string, string> = {
  ACTIVE: 'border-success/20 bg-success/10 text-success',
  SUSPENDED: 'border-destructive/20 bg-destructive/10 text-destructive',
  INACTIVE: 'border-muted bg-muted text-muted-foreground',
};

export default async function DriversPage() {
  const rows = await loadDashboardDrivers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Driver management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live driver, KYC, rating, and vehicle records from the Percel API.
        </p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Driver</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">KYC</th>
              <th className="px-5 py-4">Rating</th>
              <th className="px-5 py-4">Vehicle</th>
              <th className="px-5 py-4">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((driver) => (
              <tr key={driver.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/30">
                <td className="px-5 py-3.5">
                  <AvatarCell name={driver.name} avatarUrl={driver.avatarUrl} />
                  <div className="mt-0.5 ml-12 text-xs text-muted-foreground">{driver.email} · {driver.phone}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[driver.status] ?? 'border-border bg-muted text-muted-foreground'}`}>
                    {driver.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kycTone[driver.kyc] ?? 'border-border bg-muted text-muted-foreground'}`}>
                    {driver.kyc}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-mono tabular-nums">{driver.rating}</span>
                  <span className="ml-1 text-warning text-xs">★</span>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{driver.vehicle}</td>
                <td className="px-5 py-3.5">
                  <Link className="text-primary hover:underline" href={`/drivers/${driver.id}`}>Open review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
