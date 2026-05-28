import { Card } from './card';
import { cn } from '@/lib/cn';

export function StatCard({ label, value, delta, tone = 'muted' }: { label: string; value: string; delta: string; tone?: 'primary' | 'success' | 'warning' | 'muted' }) {
  const toneClass = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    muted: 'text-muted-foreground',
  }[tone];

  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        <p className={cn('text-sm font-medium', toneClass)}>{delta}</p>
      </div>
    </Card>
  );
}
