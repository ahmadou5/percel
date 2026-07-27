'use client';

import { TrendingUp, DollarSign, Wallet, ArrowUpRight, Percent } from 'lucide-react';
import type { AdminDashboardSnapshot } from '@/lib/admin-data';

export function FinancialAnalyticsCard({ walletStats }: { walletStats?: Array<{ label: string; value: string; delta: string }> }) {
  const platformBalance = walletStats?.find((s) => s.label.toLowerCase().includes('platform'))?.value ?? '₦3,855,200';
  const commissionEarned = walletStats?.find((s) => s.label.toLowerCase().includes('commission'))?.value ?? '₦488,400';
  const pendingSettlement = walletStats?.find((s) => s.label.toLowerCase().includes('pending'))?.value ?? '₦247,900';
  const refundReserve = walletStats?.find((s) => s.label.toLowerCase().includes('refund'))?.value ?? '₦52,000';

  const incomeSources = [
    { name: 'Customer Delivery Fares', amount: '₦2,450,000', percent: 62, color: 'bg-primary' },
    { name: 'Platform Commission (10%)', amount: commissionEarned, percent: 22, color: 'bg-emerald-400' },
    { name: 'Driver Earnings Settlement', amount: pendingSettlement, percent: 11, color: 'bg-amber-400' },
    { name: 'Refund & Dispute Reserve', amount: refundReserve, percent: 5, color: 'bg-sky-400' },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-5">
      {/* Header & Balance Overview */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Financial Intelligence</span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              +14.2% MoM Growth
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-foreground tracking-tight mt-1">Platform Income & Flow Breakdown</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Platform Vault</p>
            <p className="font-mono text-xl font-extrabold text-foreground">{platformBalance}</p>
          </div>
        </div>
      </div>

      {/* Income Breakdown Bar Graph & Metrics (Matching Image #2 Reference) */}
      <div className="grid gap-6 md:grid-cols-2 items-center">
        {/* Left: Ranked Income Sources */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Revenue Channel Share</p>
          {incomeSources.map((item, idx) => (
            <div key={item.name} className="space-y-1.5 rounded-xl border border-border/50 bg-muted/20 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-muted-foreground text-[10px]">0{idx + 1}</span>
                  <span className="font-bold text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-extrabold text-foreground">{item.amount}</span>
                  <span className="text-muted-foreground text-[11px]">({item.percent}%)</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Revenue Trend & Quick Metrics */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monthly Flow Curve</p>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>

          {/* Glowing Minimal Visual Line Representation */}
          <div className="h-28 w-full flex items-end justify-between gap-1.5 pt-4 px-1 border-b border-border/60 pb-2">
            {[35, 50, 42, 68, 75, 60, 82, 95, 88, 100].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary/30 to-primary transition-all duration-300 group-hover:to-emerald-400"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Commission Margin</span>
              <p className="font-mono font-extrabold text-emerald-400 text-sm">10.0% fixed</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Payout Speed</span>
              <p className="font-mono font-extrabold text-foreground text-sm">Instant NIP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
