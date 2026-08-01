'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchTrackedOrder, TrackedOrder } from '@/lib/api';
import { OrderMap } from '@/components/tracking/OrderMap';
import { OrderTimeline } from '@/components/tracking/OrderTimeline';
import { DriverCard } from '@/components/tracking/DriverCard';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Phone,
  Copy,
  Check,
  Package,
  MapPin,
  Navigation,
  Clock,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  CREATED:       { label: 'Order Placed',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  PENDING_MATCH: { label: 'Finding Rider',    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  MATCHED:       { label: 'Rider Assigned',   color: 'bg-violet-500/20 text-violet-400 border-violet-500/40' },
  PICKED_UP:     { label: 'Picked Up',        color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
  IN_TRANSIT:    { label: 'In Transit',       color: 'bg-primary/20 text-primary border-primary/40' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  DELIVERED:     { label: 'Delivered ✓',      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  CANCELLED:     { label: 'Cancelled',        color: 'bg-destructive/20 text-destructive border-destructive/40' },
};

export default function TrackDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadOrder = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      setError(null);
      const data = await fetchTrackedOrder(orderId);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tracking information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(() => {
      setOrder((prev) => {
        if (prev && prev.status !== 'DELIVERED' && prev.status !== 'CANCELLED') {
          loadOrder();
        }
        return prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [loadOrder]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center space-y-6">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="space-y-1">
          <p className="text-base font-extrabold text-foreground">Fetching live data…</p>
          <p className="text-xs text-muted-foreground animate-pulse font-mono">#{orderId}</p>
        </div>
      </div>
    );
  }

  // ── Error / Not Found State ──
  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 space-y-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-destructive/10 text-destructive border border-destructive/30">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">Order Not Found</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {error || `No delivery matched tracking code "${orderId}". Please verify the code and try again.`}
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/track"
            className="rounded-2xl border border-border bg-card px-6 py-3 text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            Try Another Code
          </Link>
          <button
            onClick={() => { setLoading(true); loadOrder(); }}
            className="rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] ?? { label: order.status.replace('_', ' '), color: 'bg-muted text-muted-foreground border-border' };
  const isActive = order.status !== 'DELIVERED' && order.status !== 'CANCELLED';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pt-24 sm:pt-28 sm:px-6 lg:px-8 space-y-8">

      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1.5">
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Search</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-foreground font-mono">
              #{order.trackingCode}
            </h1>
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            {isActive && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Placed {formatDate(order.createdAt)} · {order.deliveryType?.replace('_', '-') ?? ''} Delivery
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Call Driver — quick access in header if driver has phone */}
          {order.driver?.phone && (
            <a
              href={`tel:${order.driver.phone}`}
              className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all"
            >
              <Phone className="h-4 w-4" />
              <span>Call Driver</span>
            </a>
          )}
          {/* Call Recipient — quick access */}
          {order.recipientPhone && (
            <a
              href={`tel:${order.recipientPhone}`}
              className="flex items-center gap-2 rounded-xl bg-violet-500/15 border border-violet-500/40 px-3.5 py-2 text-xs font-bold text-violet-400 hover:bg-violet-500/25 transition-all"
            >
              <Phone className="h-4 w-4" />
              <span>Call Recipient</span>
            </a>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-all"
          >
            {copied ? (
              <><Check className="h-4 w-4 text-emerald-400" /><span>Copied!</span></>
            ) : (
              <><Copy className="h-4 w-4 text-primary" /><span>Share</span></>
            )}
          </button>
          <button
            type="button"
            onClick={() => loadOrder(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <MapPin className="h-4 w-4" />, label: 'Distance', value: `${Number(order.distanceKm).toFixed(1)} km` },
          { icon: <Clock className="h-4 w-4" />, label: 'Est. Duration', value: order.estimatedDurationMin ? `~${order.estimatedDurationMin} min` : 'N/A' },
          { icon: <Package className="h-4 w-4" />, label: 'Size', value: order.size },
          { icon: <Navigation className="h-4 w-4" />, label: order.etaMinutes ? 'ETA' : 'Delivery Type', value: order.etaMinutes ? `~${order.etaMinutes} min` : (order.deliveryType?.replace('_', '-') ?? '—') },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
            <div className="text-primary">{stat.icon}</div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-xs font-extrabold text-foreground mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

        {/* Left Column: Map + Addresses */}
        <div className="space-y-6 lg:col-span-7">
          {/* Live Google Map */}
          <OrderMap order={order} />

          {/* Addresses Card */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground/80">
              Delivery Route
            </h3>
            <div className="space-y-3">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary font-bold text-xs border border-primary/40 mt-0.5">
                  A
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pickup</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5 leading-snug">{order.pickupFormattedAddress}</p>
                </div>
              </div>
              <div className="ml-3 h-5 border-l-2 border-dashed border-border/60" />
              {/* Delivery */}
              <div className="flex items-start gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/40 mt-0.5">
                  B
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destination</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5 leading-snug">{order.deliveryFormattedAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline + Driver + Receiver + Items */}
        <div className="space-y-6 lg:col-span-5">
          <OrderTimeline
            currentStatus={order.status}
            history={order.statusHistory}
            cancelReason={order.cancelReason}
          />
          <DriverCard driver={order.driver} order={order} />
        </div>
      </div>
    </div>
  );
}
