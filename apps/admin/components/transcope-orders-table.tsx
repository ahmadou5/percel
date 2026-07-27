'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Filter } from 'lucide-react';
import type { AdminOrder } from '@/lib/admin-data';

export function TranscopeOrdersTable({ orders }: { orders: AdminOrder[] }) {
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'RESPONSED' | 'ASSIGNED' | 'COMPLETED'>('ASSIGNED');

  const rows = orders.map((order, idx) => {
    const isTruck = idx % 3 === 0;
    const isVan = idx % 3 === 1;
    const vehicleEmoji = isTruck ? '🚚' : isVan ? '🚐' : '🛵';
    const category = isTruck ? 'Electronics' : isVan ? 'Logistics' : 'Sports';
    const weight = `${450 + (idx * 250) % 900} kg`;
    const eta = `${12 + idx} Oct, 2025`;

    return {
      ...order,
      vehicleEmoji,
      category,
      weight,
      eta,
    };
  });

  const filtered = rows.filter((r) => {
    if (tab === 'ALL') return true;
    if (tab === 'ASSIGNED') return r.status === 'IN_TRANSIT' || r.status === 'COMPLETED' || Boolean(r.driver);
    if (tab === 'PENDING') return r.status === 'PENDING_MATCH';
    if (tab === 'COMPLETED') return r.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="rounded-2xl border border-border/80 bg-[#0F131D] p-5 shadow-sm space-y-4">
      {/* Header Filter Tabs matching Transcope UI #3 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white tracking-tight mr-2">Orders</h3>
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-[#161C2B] p-1 text-xs font-semibold">
            {(['ALL', 'PENDING', 'RESPONSED', 'ASSIGNED', 'COMPLETED'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  tab === t ? 'bg-[#E5E7EB] text-[#0F131D] font-extrabold shadow-sm' : 'text-muted-foreground hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-[#161C2B] text-muted-foreground hover:text-white">
            <Calendar className="h-4 w-4" />
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-[#161C2B] text-muted-foreground hover:text-white">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/80 bg-[#161C2B]/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Weight</th>
              <th className="px-4 py-3">ETA</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-border/60 transition-colors hover:bg-[#161C2B]/60 last:border-b-0">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{row.vehicleEmoji}</span>
                    <span className="font-mono font-extrabold text-white text-xs">{row.trackingCode}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-white">{row.user}</p>
                  <p className="text-[10px] text-muted-foreground">{row.category}</p>
                </td>
                <td className="px-4 py-3.5">
                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />
                      <span className="text-muted-foreground">{row.pickup.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="font-bold text-white">{row.dropoff.split(',')[0]}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">{row.weight}</td>
                <td className="px-4 py-3.5 font-mono text-white">{row.eta}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold ${
                      row.status === 'COMPLETED'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : row.status === 'IN_TRANSIT'
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {row.status === 'COMPLETED' ? 'Delivered' : row.status === 'IN_TRANSIT' ? 'In Transit' : 'Picked Up'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/orders/${row.id}`} className="font-semibold text-primary hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
