import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { loadDashboardUsers } from '@/lib/admin-data';

export default async function UsersPage() {
  const rows = await loadDashboardUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">User management</h2>
        <p className="mt-1 text-sm text-muted-foreground">Live customer accounts from the Percel API.</p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Orders</th><th className="px-5 py-4">Wallet</th><th className="px-5 py-4">Profile</th></tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4"><div className="font-medium">{user.name}</div><div className="text-xs text-muted-foreground">{user.email} · {user.city}</div></td>
                <td className="px-5 py-4"><Badge>{user.status}</Badge></td>
                <td className="px-5 py-4 text-muted-foreground">{user.joined}</td>
                <td className="px-5 py-4 font-mono tabular-nums">{user.orders}</td>
                <td className="px-5 py-4 font-mono tabular-nums">{user.wallet}</td>
                <td className="px-5 py-4"><Link className="text-primary hover:underline" href={`/users/${user.id}`}>View profile</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
