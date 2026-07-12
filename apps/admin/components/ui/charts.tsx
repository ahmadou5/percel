import { Card } from './card';

type RevenuePoint = { day: string; value: number };
type StatusPoint = { label: string; value: number; color: string };

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="overflow-hidden p-5">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Revenue trend</h2>
          <p className="mt-1 text-sm text-muted-foreground">Paid order value derived from current operations</p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{currency.format(total)}</span>
      </div>
      <div className="grid h-60 grid-cols-7 items-end gap-3" aria-label="Revenue trend chart">
        {data.map((item) => (
          <div key={item.day} className="group flex h-full min-w-0 flex-col justify-end gap-2">
            <div className="flex h-full items-end rounded-lg bg-muted/70 p-1 ring-1 ring-border/60">
              <div
                className="w-full rounded-md bg-gradient-to-t from-primary to-accent shadow-sm motion-safe:origin-bottom motion-safe:animate-[bar-rise_600ms_cubic-bezier(0,0,0.2,1)_both]"
                style={{ height: `${Math.max((item.value / max) * 100, item.value > 0 ? 12 : 2)}%` }}
                title={`${item.day}: ${currency.format(item.value)}`}
              />
            </div>
            <div className="truncate text-center text-xs font-medium text-muted-foreground">{item.day}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function StatusDonut({ data }: { data: StatusPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const stops: string[] = [];
  let cursor = 0;
  for (const item of data) {
    const next = cursor + (item.value / Math.max(total, 1)) * 100;
    stops.push(`${item.color} ${cursor}% ${next}%`);
    cursor = next;
  }

  return (
    <Card className="p-5">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Order pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">Current status mix from tracked orders</p>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-40 w-40 shrink-0 rounded-full ring-1 ring-border" style={{ background: `conic-gradient(${stops.join(', ')})` }} aria-label="Order status breakdown chart">
          <div className="absolute inset-8 grid place-items-center rounded-full bg-card text-center shadow-sm">
            <span className="font-mono text-2xl font-semibold tabular-nums">{total}</span>
            <span className="text-xs text-muted-foreground">orders</span>
          </div>
        </div>
        <div className="grid flex-1 gap-3 text-sm">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/35 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
              <span className="font-mono font-semibold tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
