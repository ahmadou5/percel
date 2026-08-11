'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import type { AdminOrder, AdminDriver, AdminUser, AdminNotification } from '@/lib/admin-data';

// ─── 1. Top 5 Executive Metric Cards Bar ─────────────────────────────────────
export function TopExecutiveMetricCards({
  orders,
  drivers,
  users,
  kpis,
}: {
  orders: AdminOrder[];
  drivers: AdminDriver[];
  users: AdminUser[];
  kpis?: Array<{ label: string; value: string; delta: string; tone: string }>;
}) {
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');

  const now = new Date();
  const parseAmount = (val?: string) => {
    if (!val) return 0;
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const filteredOrders = orders.filter((o) => {
    if (!o.date) return true;
    const orderDate = new Date(o.date);
    if (isNaN(orderDate.getTime())) return true;
    const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    if (range === '24h') return diffHours <= 24;
    if (range === '7d') return diffHours <= 24 * 7;
    return diffHours <= 24 * 30;
  });

  const filteredUsers = users.filter((u) => {
    const joinedStr = (u as any).joined || (u as any).createdAt;
    if (!joinedStr) return true;
    const userDate = new Date(joinedStr);
    if (isNaN(userDate.getTime())) return true;
    const diffHours = (now.getTime() - userDate.getTime()) / (1000 * 60 * 60);
    if (range === '24h') return diffHours <= 24;
    if (range === '7d') return diffHours <= 24 * 7;
    return diffHours <= 24 * 30;
  });

  const activeDeliveries = filteredOrders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'ACCEPTED').length;
  const pendingKycCount = drivers.filter((d) => d.kyc !== 'VERIFIED').length;
  const computedRevenue = filteredOrders.reduce((sum, o) => sum + parseAmount(o.price), 0);

  const ordersKpi = kpis?.find((k) => k.label.toLowerCase().includes('orders'));
  const revenueKpi = kpis?.find((k) => k.label.toLowerCase().includes('revenue'));

  const displayOrders = range === '24h' ? (ordersKpi?.value ?? filteredOrders.length) : filteredOrders.length;
  const displayRevenue = range === '24h' ? (revenueKpi?.value ?? `₦${computedRevenue.toLocaleString()}`) : `₦${computedRevenue.toLocaleString()}`;

  return (
    <div className="space-y-4">
      {/* Timeframe Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground tracking-tight">Executive Summary</h2>
        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs font-semibold">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                range === r ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Metric 1: Total Orders */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="glass-card rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Orders {range}</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="font-mono text-2xl font-extrabold text-foreground">{displayOrders}</p>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">{range === '24h' ? ordersKpi?.delta : ''}</span>
            <span className="text-muted-foreground text-[10px]">volume</span>
          </div>
        </motion.div>

        {/* Metric 2: Active Deliveries */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="glass-card rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 transition-colors hover:border-sky-500/40"
        >
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
        </motion.div>

        {/* Metric 3: Revenue */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="glass-card rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 transition-colors hover:border-emerald-500/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue {range}</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="font-mono text-2xl font-extrabold text-foreground">{displayRevenue}</p>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-emerald-400 font-bold">{range === '24h' ? revenueKpi?.delta : ''}</span>
            <span className="text-muted-foreground text-[10px]">gross amount</span>
          </div>
        </motion.div>

        {/* Metric 4: New Signups */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="glass-card rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">User Base {range}</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="font-mono text-2xl font-extrabold text-foreground">{filteredUsers.length}</p>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-primary font-bold">active</span>
            <span className="text-muted-foreground text-[10px]">registered</span>
          </div>
        </motion.div>

        {/* Metric 5: Pending KYC Reviews */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        >
          <Link href="/drivers" className="glass-card block rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2 hover:border-amber-500/50 transition-all group">
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
        </motion.div>
      </div>
    </div>
  );
}

// ─── 2. Orders Status Funnel & Order Type Split Widget ───────────────────────
export function OrdersStatusBreakdownWidget({ orders }: { orders: AdminOrder[] }) {
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');

  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (!o.date) return true;
    const orderDate = new Date(o.date);
    if (isNaN(orderDate.getTime())) return true;

    const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    if (range === '24h') return diffHours <= 24;
    if (range === '7d') return diffHours <= 24 * 7;
    return diffHours <= 24 * 30;
  });

  const pending = filteredOrders.filter((o) => o.status === 'PENDING_MATCH').length;
  const assigned = filteredOrders.filter((o) => o.status === 'ACCEPTED').length;
  const inTransit = filteredOrders.filter((o) => o.status === 'IN_TRANSIT').length;
  const delivered = filteredOrders.filter((o) => o.status === 'COMPLETED').length;
  const cancelled = filteredOrders.filter((o) => o.status === 'CANCELLED' || o.status === 'DISPUTED').length;

  const total = pending + assigned + inTransit + delivered + cancelled || 1;

  const stages = [
    { label: 'Pending', count: pending, color: 'bg-amber-400', textColor: 'text-amber-400' },
    { label: 'Assigned', count: assigned, color: 'bg-sky-400', textColor: 'text-sky-400' },
    { label: 'In Transit', count: inTransit, color: 'bg-primary', textColor: 'text-primary' },
    { label: 'Delivered', count: delivered, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
    { label: 'Cancelled', count: cancelled, color: 'bg-rose-400', textColor: 'text-rose-400' },
  ];

  let intraCount = 0;
  let interCount = 0;

  filteredOrders.forEach((o) => {
    if (o.pickup && o.dropoff) {
      const pState = o.pickup.split(',').pop()?.trim().toLowerCase();
      const dState = o.dropoff.split(',').pop()?.trim().toLowerCase();
      if (pState && dState && pState !== dState) interCount++;
      else intraCount++;
    } else {
      intraCount++;
    }
  });

  const totalType = (intraCount + interCount) || 1;
  const intraPercent = Math.round((intraCount / totalType) * 100);
  const interPercent = Math.round((interCount / totalType) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4"
    >
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
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status Funnel Pipeline</p>
          {stages.map((stage, idx) => {
            const percent = total > 1 || stage.count > 0 ? Math.round((stage.count / total) * 100) : 0;
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
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.7, delay: idx * 0.08, ease: 'easeOut' }}
                    className={`h-full rounded-full ${stage.color}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Side-by-Side Stat Cards: Intra-State vs Interstate */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Delivery Type Split</p>
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-1 glow-primary cursor-default"
            >
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                INTRA-STATE
              </span>
              <p className="font-mono text-xl font-extrabold text-foreground mt-1">{totalType > 1 || intraCount > 0 ? intraPercent : 0}%</p>
              <p className="text-[11px] text-muted-foreground">{intraCount} orders</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-1 glow-accent cursor-default"
            >
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-extrabold text-sky-400">
                INTERSTATE
              </span>
              <p className="font-mono text-xl font-extrabold text-foreground mt-1">{totalType > 1 || interCount > 0 ? interPercent : 0}%</p>
              <p className="text-[11px] text-muted-foreground">{interCount} orders</p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 3. Riders/Couriers Panel & Leaderboard ─────────────────────────────────
export function RidersFleetPanel({ drivers }: { drivers: AdminDriver[] }) {
  const activeCount = drivers.filter((d) => d.status === 'ACTIVE').length;
  const onTripCount = drivers.filter((d) => Boolean(d.assignedOrders?.length)).length;

  const topRiders = [...drivers].sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
  }).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Riders & Courier Operations</h3>
          <p className="text-[11px] text-muted-foreground">{drivers.length} registered couriers in fleet</p>
        </div>
        <Truck className="h-4 w-4 text-primary animate-pulse" />
      </div>

      {/* Courier Operational Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Riders</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">{activeCount} / {drivers.length}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 glow-primary">
          <span className="text-[10px] text-primary uppercase font-bold tracking-wider">On Active Delivery</span>
          <p className="font-mono font-extrabold text-primary text-sm mt-0.5">{onTripCount} couriers</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 glow-success">
          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Avg. Delivery Time</span>
          <p className="font-mono font-extrabold text-emerald-400 text-sm mt-0.5">24.5 mins</p>
        </motion.div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Top Couriers This Week</span>
          <Link href="/drivers" className="text-[11px] font-bold text-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="space-y-1.5 text-xs">
          {topRiders.map((rider, index) => (
            <motion.div
              key={rider.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ x: 3 }}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40 hover:border-primary/30"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono font-bold text-muted-foreground text-[11px] w-4">#{index + 1}</span>
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary border border-primary/20">
                  {rider.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{rider.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{rider.vehicle} · ⭐️ {rider.rating || 'N/A'}</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                {rider.assignedOrders?.length || 0} recent
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 4. KYC Review Queue Widget ──────────────────────────────────────────────
export function KycReviewQueueWidget({ drivers }: { drivers: AdminDriver[] }) {
  const pendingSubmissions = drivers.filter((d) => d.kyc !== 'VERIFIED');
  const topPending = pendingSubmissions.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-amber-400 animate-pulse" />
          <h3 className="text-sm font-bold text-foreground tracking-tight">KYC Verification Queue</h3>
        </div>
        <Link href="/drivers" className="text-xs font-bold text-primary hover:underline">
          View All Queue →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Pending Review</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">{pendingSubmissions.length} submissions</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 glow-success">
          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Verified Drivers</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">{drivers.filter(d => d.kyc === 'VERIFIED').length}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5">
          <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Action Required</span>
          <p className="font-mono font-extrabold text-foreground text-sm mt-0.5">{pendingSubmissions.length > 0 ? 'Review now' : 'None'}</p>
        </motion.div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/70 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            <tr>
              <th className="px-3 py-2">Rider / Applicant</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {topPending.length > 0 ? topPending.map((sub: any, idx: number) => (
              <motion.tr
                key={sub.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-3 py-2.5 font-bold text-foreground">{sub.name}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
                    {sub.kyc}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">Recent</td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={`/drivers/kyc/${sub.id}`} className="font-semibold text-primary hover:underline text-xs">
                    Inspect →
                  </Link>
                </td>
              </motion.tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  No pending KYC applications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export function GeographicDistributionTable({ hubs = [], serviceAreas = [], orders = [] }: { hubs?: any[], serviceAreas?: any[], orders?: AdminOrder[] }) {
  const stateStats: Record<string, { city: string; intra: number; inter: number }> = {};

  hubs.forEach(hub => {
    if (hub.state) {
      stateStats[hub.state] = { city: hub.city || hub.name, intra: 0, inter: 0 };
    }
  });

  orders.forEach((o) => {
    const pState = o.pickup ? o.pickup.split(',').pop()?.trim() : 'Unknown';
    const dState = o.dropoff ? o.dropoff.split(',').pop()?.trim() : 'Unknown';
    
    if (pState) {
      if (!stateStats[pState]) stateStats[pState] = { city: pState + ' Region', intra: 0, inter: 0 };
      if (pState === dState) stateStats[pState].intra++;
      else stateStats[pState].inter++;
    }
    if (dState && pState !== dState) {
      if (!stateStats[dState]) stateStats[dState] = { city: dState + ' Region', intra: 0, inter: 0 };
      stateStats[dState].inter++;
    }
  });

  const totalOrders = orders.length || 1;

  const locations = Object.entries(stateStats).map(([state, stats]) => {
    const stateTotal = stats.intra + stats.inter;
    return {
      state,
      city: stats.city,
      orders: stateTotal,
      percent: Math.round((stateTotal / totalOrders) * 100),
      intra: stateTotal > 0 ? Math.round((stats.intra / stateTotal) * 100) + '%' : '0%',
      inter: stateTotal > 0 ? Math.round((stats.inter / stateTotal) * 100) + '%' : '0%',
    };
  }).sort((a, b) => b.orders - a.orders);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass-card rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground tracking-tight">Geographic Delivery Distribution</h3>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase animate-pulse">
              Live API Data
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Top hubs & state delivery volume</p>
        </div>
        <MapPin className="h-4 w-4 text-sky-400 animate-bounce" />
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
            {locations.length > 0 ? (
              locations.map((loc, idx) => (
                <motion.tr
                  key={loc.state}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors"
                >
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
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No geographic delivery data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── 6. Recent Activity & Alerts Feed ────────────────────────────────────────
export function RecentActivityAlertsFeed({ notifications = [] }: { notifications?: AdminNotification[] }) {
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [feed, setFeed] = useState<AdminNotification[]>(notifications);

  useEffect(() => {
    setFeed(notifications);
  }, [notifications]);

  const simulateSentryError = () => {
    setFeed([{
      id: `sentry-mock-${Date.now()}`,
      title: 'TypeError: undefined is not an object',
      body: 'evaluating (state.orders.map) at DashboardView (app/dashboard/page.tsx:42). This is a simulated Sentry error to test the modal integration.',
      desc: 'An unhandled exception was caught by the boundary',
      channel: 'SENTRY_ERROR',
      sentAt: 'Just now'
    }, ...feed]);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 animate-pulse" />
            <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Activity & Operational Alerts</h3>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={simulateSentryError}
              className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              Test Sentry Alert
            </motion.button>
            <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
              Live Feed
            </span>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2">
          {feed.length > 0 ? feed.map((item, idx) => {
            const isSentry = item.channel === 'SENTRY_ERROR' || item.title.includes('Error') || item.title.includes('Exception');
            const Icon = isSentry ? AlertTriangle : (item.channel === 'PAYMENT' ? CreditCard : AlertCircle);
            const colorClass = isSentry ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' : 'text-sky-400 bg-sky-500/10 border-sky-500/30';
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ scale: 1.01, x: 2 }}
                onClick={() => isSentry && setSelectedAlert(item)}
                className={`flex items-start justify-between rounded-xl border border-border/50 bg-muted/20 p-3 text-xs transition-colors ${isSentry ? 'cursor-pointer hover:bg-muted/40 hover:border-purple-500/40 group' : 'hover:bg-muted/30'}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground flex items-center gap-2">
                      {item.title}
                      {isSentry && (
                        <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-1.5 py-0 text-[8px] font-bold text-purple-400 uppercase tracking-widest group-hover:bg-purple-500/20">
                          Sentry Issue
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.body}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{item.sentAt}</span>
              </motion.div>
            );
          }) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs font-semibold text-foreground">No recent alerts</p>
              <p className="text-[10px] text-muted-foreground">All operational systems are stable.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Sentry Error Details Modal Overlay */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border/70 p-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{selectedAlert.title}</h3>
                    <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[9px] font-extrabold text-rose-400 uppercase">
                      Unhandled
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedAlert.desc}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6">
              {/* Tags Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Environment</span>
                  <p className="text-xs font-mono font-semibold">production</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Release</span>
                  <p className="text-xs font-mono font-semibold">percel-api@latest</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Channel</span>
                  <p className="text-xs font-mono font-semibold">{selectedAlert.channel || 'SENTRY_ERROR'}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Runtime</span>
                  <p className="text-xs font-mono font-semibold">Node.js</p>
                </div>
              </div>

              {/* URL */}
              <div>
                <span className="text-xs font-bold text-foreground mb-1 block">Context Title</span>
                <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 font-mono text-xs text-primary break-all">
                  {selectedAlert.title}
                </div>
              </div>

              {/* Stack Trace */}
              <div>
                <span className="text-xs font-bold text-foreground mb-2 block">Exception Details</span>
                <div className="rounded-xl border border-rose-500/20 bg-[#1e1e1e] p-4 overflow-x-auto">
                  <pre className="text-[11px] font-mono leading-relaxed text-rose-300">
                    {selectedAlert.body || 'No detailed stack trace available for this event.'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="border-t border-border/70 p-4 bg-muted/10 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedAlert(null)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                Close
              </button>
              <a 
                href={`https://sentry.io/organizations/sentry/issues/?query=${selectedAlert.title}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-4 py-2 text-xs font-bold bg-purple-500 hover:bg-purple-600 text-white transition-colors"
              >
                View in Sentry Dashboard →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
