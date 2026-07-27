'use client';

import { MoreVertical, Navigation } from 'lucide-react';

export function TravelDistanceWidget() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monthly Travel Distance</h3>
        <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div>
        <p className="font-mono text-3xl font-bold tracking-tight text-foreground">6,792.88 Km</p>
        <p className="text-xs text-muted-foreground mt-1">10th, January 2025 · Active fleet logs</p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Delivery Route</span>
            <p className="text-xs font-bold text-foreground">Lagos - Abuja Corridor</p>
          </div>
        </div>
        <span className="rounded-lg bg-card border border-border/80 px-2.5 py-1 font-mono text-xs font-bold text-foreground">
          705 Km
        </span>
      </div>
    </div>
  );
}
