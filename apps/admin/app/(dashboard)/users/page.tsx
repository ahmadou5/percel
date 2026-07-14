import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { loadDashboardUsers } from '@/lib/admin-data';

function AvatarCell({ name, avatarUrl, initial }: { name: string; avatarUrl?: string; initial: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
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

export default async function UsersPage() {
  const rows = await loadDashboardUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">User management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live customer accounts from the Percel API.
        </p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Joined</th>
              <th className="px-5 py-4">Orders</th>
              <th className="px-5 py-4">Wallet</th>
              <th className="px-5 py-4">Profile</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/30">
                <td className="px-5 py-3.5">
                  <AvatarCell name={user.name} avatarUrl={user.avatarUrl} initial={user.avatarInitial} />
                  <div className="mt-0.5 ml-12 text-xs text-muted-foreground">{user.email} · {user.city}</div>
                </td>
                <td className="px-5 py-3.5"><Badge>{user.status}</Badge></td>
                <td className="px-5 py-3.5 text-muted-foreground">{user.joined}</td>
                <td className="px-5 py-3.5 font-mono tabular-nums">{user.orders}</td>
                <td className="px-5 py-3.5 font-mono tabular-nums">{user.wallet}</td>
                <td className="px-5 py-3.5">
                  <Link className="text-primary hover:underline" href={`/users/${user.id}`}>View profile</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
