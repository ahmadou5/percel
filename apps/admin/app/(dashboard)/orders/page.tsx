'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminOrders } from '@/lib/admin-data';

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'IN_TRANSIT' | 'COMPLETED' | 'DISPUTED' | 'PENDING_MATCH'>('ALL');

  const rows = useMemo(
    () =>
      adminOrders.filter((order) => {
        const matchesSearch = [order.trackingCode, order.user, order.driver, order.price].join(' ').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'ALL' || order.status === status;
        return matchesSearch && matchesStatus;
      }),
    [search, status],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Order management</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track shipment status, prices, disputes, and the latest delivery history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'IN_TRANSIT', 'COMPLETED', 'DISPUTED', 'PENDING_MATCH'] as const).map((value) => (
            <button key={value} onClick={() => setStatus(value)} className={value === status ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground' : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground'}>{value.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tracking codes, users, drivers, or prices" />
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Tracking</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Driver</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4 font-mono tabular-nums">{order.trackingCode}</td>
                <td className="px-5 py-4"><Badge>{order.status}</Badge></td>
                <td className="px-5 py-4 text-muted-foreground">{order.user}</td>
                <td className="px-5 py-4 text-muted-foreground">{order.driver}</td>
                <td className="px-5 py-4 font-mono tabular-nums">{order.price}</td>
                <td className="px-5 py-4"><Link className="text-primary hover:underline" href={`/orders/${order.id}`}>Open order</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
