'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminUsers } from '@/lib/admin-data';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'>('ALL');

  const rows = useMemo(
    () =>
      adminUsers.filter((user) => {
        const matchesSearch = [user.name, user.email, user.phone, user.city].join(' ').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'ALL' || user.status === status;
        return matchesSearch && matchesStatus;
      }),
    [search, status],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">User management</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search, review, suspend, or reactivate customer accounts.</p>
        </div>
        <div className="flex gap-3">
          {(['ALL', 'ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={value === status ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground' : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground'}
            >
              {value.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users, emails, cities, or phone numbers" />
      </Card>

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
              <tr key={user.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email} · {user.city}</div>
                </td>
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
