import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { loadDashboardDrivers } from '@/lib/admin-data';

export default async function DriversPage() {
  const rows = await loadDashboardDrivers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Driver management</h2>
        <p className="mt-1 text-sm text-muted-foreground">Live driver, KYC, rating, and vehicle records from the Percel API.</p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr><th className="px-5 py-4">Driver</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">KYC</th><th className="px-5 py-4">Rating</th><th className="px-5 py-4">Vehicle</th><th className="px-5 py-4">Review</th></tr>
          </thead>
          <tbody>
            {rows.map((driver) => (
              <tr key={driver.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4"><div className="font-medium">{driver.name}</div><div className="text-xs text-muted-foreground">{driver.email} · {driver.phone}</div></td>
                <td className="px-5 py-4"><Badge>{driver.status}</Badge></td>
                <td className="px-5 py-4"><Badge>{driver.kyc}</Badge></td>
                <td className="px-5 py-4 font-mono tabular-nums">{driver.rating}</td>
                <td className="px-5 py-4 text-muted-foreground">{driver.vehicle}</td>
                <td className="px-5 py-4"><Link className="text-primary hover:underline" href={`/drivers/${driver.id}`}>Open review tab</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
