import { cn } from '@/lib/cn';
import { Card } from './card';
import { TrendingUp, Package, Wallet, Truck, Users } from 'lucide-react';

export function StatCard({
  label,
  value,
  delta,
  tone = 'muted',
}: {
  label: string;
  value: string;
  delta: string;
  tone?: 'primary' | 'success' | 'warning' | 'muted';
}) {
  const toneClass = {
    primary: 'text-primary bg-primary/10 border-primary/30',
    success: 'text-success bg-success/10 border-success/30',
    warning: 'text-warning bg-warning/10 border-warning/30',
    muted: 'text-muted-foreground bg-muted border-border',
  }[tone];

  const Icon = label.toLowerCase().includes('order')
    ? Package
    : label.toLowerCase().includes('revenue') || label.toLowerCase().includes('gross')
    ? Wallet
    : label.toLowerCase().includes('driver')
    ? Truck
    : Users;

  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-border/80 bg-card/90 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('grid h-10 w-10 place-items-center rounded-xl border transition-transform group-hover:scale-110 shadow-xs', toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-xs', toneClass)}>
          <TrendingUp className="h-3 w-3" />
          {delta}
        </span>
      </div>
    </Card>
  );
}
