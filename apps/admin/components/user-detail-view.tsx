'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminUser } from '@/lib/admin-data';

export function UserDetailView({ initialUser }: { initialUser: AdminUser }) {
  const [user, setUser] = useState<AdminUser>(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [city, setCity] = useState(user.city);
  const [status, setStatus] = useState(user.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define detail actions dynamically based on user status
  const actions = [
    ...(user.status === 'ACTIVE'
      ? [
          {
            label: 'Suspend',
            tone: 'danger' as const,
            prompt: 'Reason for suspension',
            actionUrl: `/api/admin/users/${user.id}/suspend`,
            successMessage: `${user.name} suspended successfully.`,
          },
        ]
      : [
          {
            label: 'Reactivate',
            tone: 'secondary' as const,
            actionUrl: `/api/admin/users/${user.id}/reactivate`,
            successMessage: `${user.name} reactivated successfully.`,
          },
        ]),
    {
      label: 'View wallet',
      tone: 'ghost' as const,
      onClick: () => {
        document.getElementById('wallet-section')?.scrollIntoView({ behavior: 'smooth' });
      },
      successMessage: 'Scrolling to wallet ledger...',
    },
  ];

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, address: city, status }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message ?? json?.data?.message ?? 'Failed to update user profile');
      }

      setUser(json.data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge>{user.status}</Badge>
          <div className="mt-3 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xl border border-primary/20 shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                user.avatarInitial
              )}
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{user.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{user.email} · {user.phone} · {user.city}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setIsEditing(true)} variant="secondary">
            Edit Profile
          </Button>
          <DetailActions actions={actions} />
        </div>
      </div>

      {/* Main grids */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          {/* Profile summary card */}
          <Card className="space-y-3 p-5">
            <h3 className="text-lg font-semibold tracking-tight">Profile summary</h3>
            <p className="text-sm text-muted-foreground">
              Joined {user.joined} · {user.orders} orders · Wallet {user.walletBalance}
            </p>
            <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {user.supportNote}
            </p>
          </Card>

          {/* Wallet ledger card */}
          <Card id="wallet-section" className="space-y-4 p-6 border-primary/25 bg-primary/5">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Wallet Ledger</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current Balance: <span className="font-semibold text-foreground font-mono">{user.walletBalance}</span>
              </p>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {user.walletTransactions && user.walletTransactions.length > 0 ? (
                user.walletTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 text-xs font-mono">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground">{tx.category}</div>
                      <div className="text-[10px] text-muted-foreground">{tx.createdAt} · {tx.reference}</div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={tx.type === 'CREDIT' ? 'text-success font-semibold' : 'text-foreground'}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">{tx.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No wallet transactions recorded.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Recent activity card */}
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold tracking-tight">Recent activity</h3>
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {user.recentOrders && user.recentOrders.length > 0 ? (
              user.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-2xl border border-border p-4 text-sm bg-background/50">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.trackingCode}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">{order.status} · {order.date}</div>
                  </div>
                  <div className="font-mono tabular-nums">{order.price}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No dispatch orders placed.</p>
            )}
          </div>
        </Card>
      </section>

      {/* Edit profile modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-semibold">Edit User Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Full name
                </label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Phone
                </label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  City / Address
                </label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
