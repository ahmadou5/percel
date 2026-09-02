import { OrderStatus, OrderStatusHistoryItem } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, Clock, Truck, PackageCheck, AlertCircle, XCircle } from 'lucide-react';

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  history?: OrderStatusHistoryItem[];
  cancelReason?: string | null;
}

const STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'CREATED', label: 'Order Placed', desc: 'Delivery request submitted' },
  { status: 'PENDING_MATCH', label: 'Matching Rider', desc: 'Broadcasting to nearby verified couriers' },
  { status: 'MATCHED', label: 'Rider Assigned', desc: 'Courier accepted & heading to pickup' },
  { status: 'PICKED_UP', label: 'Package Picked Up', desc: 'Item safely in courier possession' },
  { status: 'IN_TRANSIT', label: 'In Transit', desc: 'En route to destination' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Delivery confirmed & completed' },
];

export function OrderTimeline({ currentStatus, history, cancelReason }: OrderTimelineProps) {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-destructive font-medium">
        <div className="flex items-center gap-2 font-bold text-sm">
          <XCircle className="h-5 w-5" />
          <span>Order Cancelled</span>
        </div>
        <p className="mt-1 text-xs text-destructive/80">
          Reason: {cancelReason || 'This order was cancelled before pickup.'}
        </p>
      </div>
    );
  }

  // Determine current step index
  const statusOrder: OrderStatus[] = [
    'CREATED',
    'PENDING_MATCH',
    'MATCHED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
  ];

  const currentIdx = statusOrder.indexOf(currentStatus);

  return (
    <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl space-y-6">
      <h3 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground/80">
        Delivery Timeline
      </h3>

      <div className="relative space-y-6 pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIdx || currentStatus === 'DELIVERED';
          const isCurrent = idx === currentIdx && currentStatus !== 'DELIVERED';
          const isPending = idx > currentIdx && currentStatus !== 'DELIVERED';

          // Find history entry if present
          const histItem = history?.find((h) => h.status === step.status);

          return (
            <div key={step.status} className="relative flex items-start gap-4">
              {/* Icon Marker */}
              <div
                className={`absolute -left-6 grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-md ring-4 ring-emerald-500/20'
                    : isCurrent
                    ? 'bg-primary text-white shadow-glow-primary ring-4 ring-primary/30 animate-pulse'
                    : 'bg-slate-800 text-muted-foreground border border-border/80'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Truck className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[10px]">{idx + 1}</span>
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-xs font-extrabold ${
                      isDone
                        ? 'text-foreground'
                        : isCurrent
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {histItem && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatDate(histItem.createdAt)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {histItem?.note || step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
