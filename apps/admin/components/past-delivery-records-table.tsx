'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AdminOrder } from '@/lib/admin-data';

export function PastDeliveryRecordsTable({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState<'ALL' | 'HEAVY' | 'MEDIUM' | 'LIGHT'>('ALL');

  const formattedRows = orders.map((order, idx) => {
    const isTruck = idx % 3 === 0;
    const isVan = idx % 3 === 1;
    const vehicleEmoji = isTruck ? '🚚' : isVan ? '🚐' : '🛵';
    const weightType = isTruck ? 'HEAVY' : isVan ? 'MEDIUM' : 'LIGHT';
    const distanceKm = 120 + (idx * 145) % 800;
    const pricePerKm = 85;
    const statusText = order.status === 'COMPLETED' ? 'Finished' : order.status === 'IN_TRANSIT' ? 'On Progress' : 'Pending';

    return {
      ...order,
      vehicleEmoji,
      weightType,
      distanceKm: `${distanceKm} Km`,
      pricePerKm: `₦${pricePerKm}`,
      statusText,
    };
  });

  const filteredRows = formattedRows.filter((r) => {
    if (filter === 'ALL') return true;
    return r.weightType === filter;
  });

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm space-y-4 p-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Past Delivery Record</h3>
          <p className="text-xs text-muted-foreground">Look back at your completed submissions and active dispatches</p>
        </div>

        {/* OneCargo Filter Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs font-semibold">
          <button
            onClick={() => setFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${filter === 'ALL' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All Weight
          </button>
          <button
            onClick={() => setFilter('HEAVY')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${filter === 'HEAVY' ? 'bg-card text-foreground shadow-xs border border-border/80' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Heavy Weight
          </button>
          <button
            onClick={() => setFilter('MEDIUM')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${filter === 'MEDIUM' ? 'bg-card text-foreground shadow-xs border border-border/80' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Medium Weight
          </button>
          <button
            onClick={() => setFilter('LIGHT')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${filter === 'LIGHT' ? 'bg-card text-foreground shadow-xs border border-border/80' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Light Weight
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/80 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Delivery Start</th>
              <th className="px-4 py-3">Delivery Destination</th>
              <th className="px-4 py-3">Delivery Status</th>
              <th className="px-4 py-3">Total Distance</th>
              <th className="px-4 py-3">Rate / Km</th>
              <th className="px-4 py-3">Total Fare</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 transition-colors hover:bg-muted/30 last:border-b-0">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted/60 text-sm border border-border/60">
                      {row.vehicleEmoji}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{row.pickup.split(',')[0]}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">{row.trackingCode}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-medium text-foreground">
                  {row.dropoff.split(',')[0]}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      row.statusText === 'Finished'
                        ? 'border border-success/30 bg-success/10 text-success'
                        : row.statusText === 'On Progress'
                        ? 'border border-primary/30 bg-primary/10 text-primary'
                        : 'border border-warning/30 bg-warning/10 text-warning'
                    }`}
                  >
                    {row.statusText}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono font-semibold text-foreground">{row.distanceKm}</td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground">{row.pricePerKm}</td>
                <td className="px-4 py-3.5 font-mono font-bold text-foreground">{row.price}</td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/orders/${row.id}`} className="font-semibold text-primary hover:underline">
                    View Details →
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
