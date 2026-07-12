import { Card } from './card';
import { cn } from '@/lib/cn';

export function StatCard({ label, value, delta, tone = 'muted' }: { label: string; value: string; delta: string; tone?: 'primary' | 'success' | 'warning' | 'muted' }) {
  const toneClass = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    success: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/25',
    muted: 'text-muted-foreground bg-muted border-border',
  }[tone];

  return (
    <Card className="group overflow-hidden p-5 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', toneClass)}>{delta}</span>
      </div>
      <p className="mt-5 font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
    </Card>
  );
}
