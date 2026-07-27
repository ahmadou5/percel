'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Package,
  Truck,
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  ArrowUpRight,
  MapPin,
  DollarSign,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import type { AdminOrder, AdminDriver, AdminUser } from '@/lib/admin-data';

// ─── 1. Top 5 Executive Metric Cards Bar ─────────────────────────────────────
export function TopExecutiveMetricCards({
  orders,
  drivers,
  users,
}: {
  orders: AdminOrder[];
  drivers: AdminDriver[];
  users: AdminUser[];
}) {
  const activeDeliveries = orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'ACCEPTED').length;
  const pendingKycCount = drivers.filter((d) => d.kyc !== 'VERIFIED').length || 3;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Metric 1: Total Orders Today */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Orders Today</span>
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Package className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="font-mono text-2xl font-extrabold text-foreground">{orders.length}</p>
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-emerald-400 font-bold flex items-center gap-0.5">+12.4%</span>
          <span className="text-muted-foreground text-[10px]">vs yesterday</span>
        </div>
      </div>

      {/* Metric 2: Active Deliveries */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Deliveries</span>
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="font-mono text-2xl font-extrabold text-foreground">{activeDeliveries}</p>
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-sky-400 font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" /> Live Tracking
          </span>
          <span className="text-muted-foreground text-[10px]">in transit</span>
        </div>
      </div>

      {/* Metric 3: Revenue Today / MTD */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Today</span>
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="font-mono text-2xl font-extrabold text-foreground">₦328,500</p>
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-emerald-400 font-bold">MTD: ₦3.8M</span>
          <span className="text-muted-foreground text-[10px]">paid orders</span>
        </div>
      </div>

      {/* Metric 4: New Signups Today */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">New Signups</span>
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Users className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="font-mono text-2xl font-extrabold text-foreground">{users.length}</p>
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-primary font-bold">+18 today</span>
          <span className="text-muted-foreground text-[10px]">registered</span>
        </div>
      </div>

      {/* Metric 5: Pending KYC Reviews (Badge Highlighted) */}
      <Link href="/drivers" className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 hover:border-amber-500/50 transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending KYC</span>
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
            <FileCheck className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-2xl font-extrabold text-amber-400">{pendingKycCount}</p>
          {pendingKycCount > 0 && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-extrabold text-amber-400 animate-pulse">
              Needs Review
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-amber-400 font-bold flex items-center gap-1">Review Queue →</span>
          <span className="text-muted-foreground text-[10px]">docs</span>
        </div>
      </Link>
    </div>
  );
}

// ─── 2. Orders Status Funnel & Order Type Split Widget ───────────────────────
export function OrdersStatusBreakdownWidget({ orders }: { orders: AdminOrder[] }) {
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');

  const pending = orders.filter((o) => o.status === 'PENDING_MATCH').length || 3;
  const assigned = orders.filter((o) => o.status === 'ACCEPTED').length || 4;
  const inTransit = orders.filter((o) => o.status === 'IN_TRANSIT').length || 8;
  const delivered = orders.filter((o) => o.status === 'COMPLETED').length || 14;
  const cancelled = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'DISPUTED').length || 2;

  const total = pending + assigned + inTransit + delivered + cancelled || 1;

  const stages = [
    { label: 'Pending', count: pending, color: 'bg-amber-400', textColor: 'text-amber-400' },
    { label: 'Assigned', count: assigned, color: 'bg-sky-400', textColor: 'text-sky-400' },
    { label: 'In Transit', count: inTransit, color: 'bg-primary', textColor: 'text-primary' },
    { label: 'Delivered', count: delivered, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
    { label: 'Cancelled', count: cancelled, color: 'bg-rose-400', textColor: 'text-rose-400' },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      {/* Header & Range Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Orders Lifecycle & Type Split</h3>
          <p className="text-[11px] text-muted-foreground">Fulfillment status funnel across delivery stages</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs font-semibold">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                range === r ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Left Lifecycle Funnel + Right Intra vs Interstate Split */}
      <div className="grid gap-6 md:grid-cols-2 items-center">
        {/* Status Funnel Bars */}
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Status Funnel Pipeline</p>
          {stages.map((stage) => {
            const percent = Math.round((stage.count / total) * 100);
            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{stage.label}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-foreground">{stage.count}</span>
                    <span className="text-muted-foreground text-[11px]">({percent}%)</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${stage.color}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Side-by-Side Stat Cards: Intra-State vs Interstate */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Delivery Type Split</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-1">
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                INTRA-STATE
              </span>
              <p className="font-mono text-xl font-extrabold text-foreground mt-1">72%</p>
              <p className="text-[11px] text-muted-foreground">18 orders (City Dispatch)</p>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-1">
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-extrabold text-sky-400">
                INTERSTATE
              </span>
              <p className="font-mono text-xl font-extrabold text-foreground mt-1">28%</p>
              <p className="text-[11px] text-muted-foreground">6 orders (State Terminal)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Riders/Couriers Panel & Leaderboard ─────────────────────────────────
export function RidersFleetPanel({ drivers }: { drivers: AdminDriver[] }) {
  const activeCount = drivers.filter((d) => d.status === 'ACTIVE').length || drivers.length;
  const onTripCount = drivers.filter((d) => Boolean(d.assignedOrders?.length)).length || Math.round(activeCount * 0.6);

  const topRiders = drivers.slice(0, 5).map((d, i) => ({
    ...d,
    completedThisWeek: 28 - i * 4,
    rating: d.rating || (4.9 - i * 0.1).toFixed(1),
  }));

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Riders & Courier Operations</h3>
          <p className="text-[11px] text-muted-foreground">{drivers.length} registered couriers in fleet</p>
        </div>
        <Truck className="h-4 w-4 text-primary" />
      </div>

      {/* Courier Operational Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Active Riders</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">{activeCount} / {drivers.length}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5">
          <span className="text-[10px] text-primary uppercase font-bold">On Active Delivery</span>
          <p className="font-mono font-extrabold text-primary text-sm mt-0.5">{onTripCount} couriers</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <span className="text-[10px] text-emerald-400 uppercase font-bold">Avg. Delivery Time</span>
          <p className="font-mono font-extrabold text-emerald-400 text-sm mt-0.5">24.5 mins</p>
        </div>
      </div>

      {/* Top 5 Leaderboard */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Top Couriers This Week</span>
          <Link href="/drivers" className="text-[11px] font-bold text-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="space-y-1.5 text-xs">
          {topRiders.map((rider, index) => (
            <div key={rider.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono font-bold text-muted-foreground text-[11px] w-4">#{index + 1}</span>
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary border border-primary/20">
                  {rider.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{rider.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{rider.vehicle} · ⭐️ {rider.rating}</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                {rider.completedThisWeek} completed
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 4. KYC Review Queue Widget ──────────────────────────────────────────────
export function KycReviewQueueWidget({ drivers }: { drivers: AdminDriver[] }) {
  const pendingSubmissions = drivers.filter((d) => d.kyc !== 'VERIFIED').slice(0, 5);

  const sampleSubmissions = pendingSubmissions.length > 0 ? pendingSubmissions : [
    { id: 'kyc_1', name: 'Kabiru Hassan', submittedAt: '10 mins ago', docType: 'NIN & Driving License', status: 'PENDING' },
    { id: 'kyc_2', name: 'Olamide Bakare', submittedAt: '25 mins ago', docType: 'BVN & Vehicle Registration', status: 'PENDING' },
    { id: 'kyc_3', name: 'Emeka Chukwuma', submittedAt: '1 hour ago', docType: 'Selfie Verification', status: 'PENDING' },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-foreground tracking-tight">KYC Verification Queue</h3>
        </div>
        <Link href="/drivers" className="text-xs font-bold text-primary hover:underline">
          View All Queue →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
          <span className="text-[10px] text-amber-400 uppercase font-bold">Pending Review</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">3 submissions</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <span className="text-[10px] text-emerald-400 uppercase font-bold">Verified Today</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">14 drivers</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5">
          <span className="text-[10px] text-rose-400 uppercase font-bold">Rejected Docs</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">1 resubmitted</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/70 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            <tr>
              <th className="px-3 py-2">Rider / Applicant</th>
              <th className="px-3 py-2">Document Type</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sampleSubmissions.map((sub: any) => (
              <tr key={sub.id} className="border-b border-border/40 last:border-b-0 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-bold text-foreground">{sub.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground text-[11px]">{sub.docType ?? 'NIN / License'}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{sub.submittedAt ?? 'Today'}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={`/drivers/${sub.id}`} className="font-semibold text-primary hover:underline text-xs">
                    Inspect →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 5. Geographic Distribution Table ──────────────────────────────────────
export function GeographicDistributionTable() {
  const locations = [
    { state: 'Lagos State', city: 'Ikeja / Victoria Island', orders: 1420, percent: 52, intra: '85%', inter: '15%' },
    { state: 'FCT Abuja', city: 'Wuse 2 / Maitama', orders: 680, percent: 25, intra: '60%', inter: '40%' },
    { state: 'Rivers State', city: 'Port Harcourt Gateway', orders: 340, percent: 12, intra: '70%', inter: '30%' },
    { state: 'Kano State', city: 'Kano Commercial Depot', orders: 190, percent: 7, intra: '50%', inter: '50%' },
    { state: 'Oyo State', city: 'Ibadan Logistics Station', orders: 110, percent: 4, intra: '80%', inter: '20%' },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Geographic Delivery Distribution</h3>
          <p className="text-[11px] text-muted-foreground">Top Nigerian hubs & state delivery volume this month</p>
        </div>
        <MapPin className="h-4 w-4 text-sky-400" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/70 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-2.5">State / Location</th>
              <th className="px-4 py-2.5">Key City Depot</th>
              <th className="px-4 py-2.5">Monthly Volume</th>
              <th className="px-4 py-2.5">Intra vs Interstate</th>
              <th className="px-4 py-2.5 text-right">Share (%)</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.state} className="border-b border-border/40 last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-bold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {loc.state}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{loc.city}</td>
                <td className="px-4 py-3 font-mono font-extrabold text-foreground">{loc.orders.toLocaleString()} orders</td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                  <span className="text-primary font-bold">{loc.intra}</span> intra / <span className="text-sky-400 font-bold">{loc.inter}</span> inter
                </td>
                <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-400">{loc.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 6. Recent Activity & Alerts Feed ────────────────────────────────────────
export function RecentActivityAlertsFeed() {
  const alerts = [
    { id: 'alt_1', type: 'PAYMENT_FAILED', title: 'Payment Gate Timeout', desc: 'Monnify web-hook failed for order #PCL-88123', time: '5m ago', icon: CreditCard, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { id: 'alt_2', type: 'DELAY', title: 'Delivery Traffic Delay', desc: 'Rider Arthur Sjorgen delayed by traffic on Third Mainland Bridge', time: '18m ago', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'alt_3', type: 'DISPUTE', title: 'Customer Support Dispute', desc: 'Customer logged item damaged complaint for order #PCL-773120', time: '42m ago', icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { id: 'alt_4', type: 'SUSPICIOUS', title: 'Flagged High-Value Order', desc: 'Electronics package worth ₦450,000 flagged for manual verification', time: '1h ago', icon: ShieldAlert, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Activity & Operational Alerts</h3>
        </div>
        <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
          Live Feed
        </span>
      </div>

      <div className="space-y-2.5">
        {alerts.map((item) => (
          <div key={item.id} className="flex items-start justify-between rounded-xl border border-border/50 bg-muted/20 p-3 text-xs hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground shrink-0">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
