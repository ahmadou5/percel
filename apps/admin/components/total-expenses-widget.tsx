'use client';

import { MoreVertical } from 'lucide-react';

export function TotalExpensesWidget() {
  const allocation = [
    { label: 'Fuel', amount: '₦12,121,000', percent: '37%', color: 'bg-primary' },
    { label: 'Highway', amount: '₦9,931,000', percent: '30%', color: 'bg-sky-500' },
    { label: 'Logistics', amount: '₦5,388,000', percent: '16%', color: 'bg-success' },
    { label: 'Resting', amount: '₦5,415,000', percent: '17%', color: 'bg-warning' },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Logistics Expenses</h3>
        <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div>
        <p className="font-mono text-3xl font-bold tracking-tight text-foreground">₦32,855,000.00</p>
        <p className="text-xs text-muted-foreground mt-1">Expenses Allocation breakdown</p>
      </div>

      {/* Multi-Color Segmented Allocation Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5 gap-1">
        <div className="h-full rounded-l-full bg-primary" style={{ width: '37%' }} />
        <div className="h-full bg-sky-500" style={{ width: '30%' }} />
        <div className="h-full bg-success" style={{ width: '16%' }} />
        <div className="h-full rounded-r-full bg-warning" style={{ width: '17%' }} />
      </div>

      {/* Breakdown Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {allocation.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${item.color}`} />
              <span>{item.label}</span>
            </div>
            <p className="font-mono text-sm font-bold text-foreground">{item.amount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
