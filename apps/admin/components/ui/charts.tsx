import { Card } from './card';
import { orderStatusBreakdown, revenueSeries } from '@/lib/mock-data';

export function RevenueChart() {
  const max = Math.max(...revenueSeries.map((item) => item.value));

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Revenue over time</h2>
          <p className="text-sm text-muted-foreground">Last 7 days of completed order value</p>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">NGN</span>
      </div>
      <div className="grid h-56 grid-cols-7 items-end gap-3">
        {revenueSeries.map((item) => (
          <div key={item.day} className="flex h-full flex-col justify-end gap-2">
            <div className="flex h-full items-end rounded-2xl bg-muted p-1">
              <div className="w-full rounded-xl bg-gradient-to-t from-primary to-accent" style={{ height: `${Math.max((item.value / max) * 100, 10)}%` }} />
            </div>
            <div className="text-center text-xs text-muted-foreground">{item.day}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function StatusDonut() {
  const total = orderStatusBreakdown.reduce((sum, item) => sum + item.value, 0);
  const stops: string[] = [];
  let cursor = 0;
  for (const item of orderStatusBreakdown) {
    const next = cursor + (item.value / total) * 100;
    stops.push(`${item.color} ${cursor}% ${next}%`);
    cursor = next;
  }

  return (
    <Card className="p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight">Order status mix</h2>
        <p className="text-sm text-muted-foreground">Current state of the active order pipeline</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-40 w-40 rounded-full" style={{ background: `conic-gradient(${stops.join(', ')})` }} aria-label="Order status breakdown chart" />
        <div className="space-y-3 text-sm">
          {orderStatusBreakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-28 text-muted-foreground">{item.label}</span>
              <span className="font-mono tabular-nums">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
