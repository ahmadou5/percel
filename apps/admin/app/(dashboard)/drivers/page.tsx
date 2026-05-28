'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminDrivers } from '@/lib/admin-data';

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED'>('ALL');
  const [kyc, setKyc] = useState<'ALL' | 'APPROVED' | 'SUBMITTED' | 'REJECTED'>('ALL');

  const rows = useMemo(
    () =>
      adminDrivers.filter((driver) => {
        const matchesSearch = [driver.name, driver.email, driver.phone, driver.vehicle].join(' ').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'ALL' || driver.status === status;
        const matchesKyc = kyc === 'ALL' || driver.kyc === kyc;
        return matchesSearch && matchesStatus && matchesKyc;
      }),
    [search, status, kyc],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Driver management</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review KYC, ratings, availability, and vehicle details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED'] as const).map((value) => (
            <button key={value} onClick={() => setStatus(value)} className={value === status ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground' : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground'}>{value}</button>
          ))}
          {(['ALL', 'APPROVED', 'SUBMITTED', 'REJECTED'] as const).map((value) => (
            <button key={value} onClick={() => setKyc(value)} className={value === kyc ? 'rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary' : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground'}>{value}</button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search drivers, vehicles, phones, or emails" />
      </Card>

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
              <tr key={driver.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4">
                  <div className="font-medium">{driver.name}</div>
                  <div className="text-xs text-muted-foreground">{driver.email} · {driver.phone}</div>
                </td>
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
