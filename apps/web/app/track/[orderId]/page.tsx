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
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Share2,
  Copy,
  Check,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

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

    // Auto-poll every 15 seconds if order is active (not DELIVERED or CANCELLED)
    const interval = setInterval(() => {
      if (order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
        loadOrder();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loadOrder, order?.status]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Fetching live tracking data for #{orderId}…
        </p>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 space-y-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-destructive/10 text-destructive border border-destructive/30">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">Order Not Found</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {error || `No delivery order matched tracking code "${orderId}".`}
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/track"
            className="rounded-2xl border border-border bg-card px-6 py-3 text-xs font-bold text-foreground hover:bg-muted"
          >
            Try Another Tracking Code
          </Link>
          <button
            onClick={() => {
              setLoading(true);
              loadOrder();
            }}
            className="rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-glow-primary hover:bg-primary/90"
          >
            Retry Fetching
          </button>
        </div>
      </div>
    );
  }

  // 3. Success State with Live Map & Details
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header Navigation & Refresh Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Track Search</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground font-mono">
              #{order.trackingCode}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                order.status === 'DELIVERED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : order.status === 'CANCELLED'
                  ? 'bg-destructive/20 text-destructive border border-destructive/40'
                  : 'bg-primary/20 text-primary border border-primary/40'
              }`}
            >
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Created on {formatDate(order.createdAt)} • {order.deliveryType} Delivery
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted shadow-xs transition-all"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Copied Link</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-primary" />
                <span>Share Tracking</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => loadOrder(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-accent ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Live Map + Details */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Live Map & Driver Card */}
        <div className="space-y-6 lg:col-span-7">
          {/* Live Google Map */}
          <OrderMap order={order} />

          {/* Addresses Card */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground/80">
              Delivery Addresses
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary font-bold text-xs border border-primary/40 mt-0.5">
                  A
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pickup Location</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{order.pickupFormattedAddress}</p>
                </div>
              </div>

              <div className="ml-3 h-4 border-l-2 border-dashed border-border/80" />

              <div className="flex items-start gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/40 mt-0.5">
                  B
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destination</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{order.deliveryFormattedAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Courier Card */}
          <DriverCard driver={order.driver} order={order} />
        </div>

        {/* Right Column: Order Timeline Stepper */}
        <div className="space-y-6 lg:col-span-5">
          <OrderTimeline
            currentStatus={order.status}
            history={order.statusHistory}
            cancelReason={order.cancelReason}
          />
        </div>
      </div>
    </div>
  );
}
