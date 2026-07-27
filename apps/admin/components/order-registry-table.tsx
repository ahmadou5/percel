'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Download,
  Filter,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Wallet,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  X,
  Truck,
  User,
  Info,
  MapPin,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { AdminOrder } from '@/lib/admin-data';

// Cancellation Reason Options
const CANCELLATION_REASONS = [
  'Driver Delayed / No Match',
  'Customer Changed Mind',
  'Address Out of Delivery Zone',
  'Pricing / Payment Issue',
  'Duplicate Order',
  'Other',
];

type StatusFilter = 'ALL' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
type DateRangeFilter = 'all' | 'today' | '7d' | '30d';
type SortField = 'date' | 'price' | 'status' | 'trackingCode';
type SortDirection = 'asc' | 'desc';

// Helper to parse price string like "₦12,500" into a number
function parsePrice(priceStr?: string): number {
  if (!priceStr) return 0;
  const numeric = priceStr.replace(/[^0-9.]/g, '');
  return parseFloat(numeric) || 0;
}

// Helper to infer or format relative time
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    return dateStr;
  }
  const now = new Date();
  const diffMs = now.getTime() - parsedDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Helper to determine order type (Intra-state vs Interstate)
function getOrderType(pickup?: string, dropoff?: string): 'Intra-state' | 'Interstate' {
  if (!pickup || !dropoff) return 'Intra-state';
  const pickupParts = pickup.split(',').map((s) => s.trim().toLowerCase());
  const dropoffParts = dropoff.split(',').map((s) => s.trim().toLowerCase());

  const pickupState = pickupParts[pickupParts.length - 1] || '';
  const dropoffState = dropoffParts[dropoffParts.length - 1] || '';

  if (pickupState && dropoffState && pickupState !== dropoffState) {
    return 'Interstate';
  }
  return 'Intra-state';
}

export function OrderRegistryTable({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for orders to support quick actions like cancellation
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);

  // URL state synchronization
  const currentStatus = (searchParams.get('status')?.toUpperCase() as StatusFilter) || 'ALL';
  const currentRange = (searchParams.get('range') as DateRangeFilter) || 'all';
  const currentQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '25', 10);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(currentStatus);
  const [rangeFilter, setRangeFilter] = useState<DateRangeFilter>(currentRange);
  const [searchQuery, setSearchQuery] = useState<string>(currentQuery);
  const [page, setPage] = useState<number>(currentPage);
  const [pageSize, setPageSize] = useState<number>(currentLimit);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Cancellation Modal State
  const [cancelingOrder, setCancelingOrder] = useState<AdminOrder | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [cancelNotes, setCancelNotes] = useState<string>('');

  // Sync state changes with URL query parameters
  const updateUrlParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === '' || val === 'ALL' || val === 'all' || (key === 'page' && val === 1)) {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Handle Filter Chip click
  const handleStatusTabChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
    updateUrlParams({ status, page: 1 });
  };

  // Handle Date Range change
  const handleRangeChange = (range: DateRangeFilter) => {
    setRangeFilter(range);
    setPage(1);
    updateUrlParams({ range, page: 1 });
  };

  // Handle Search input change
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
    updateUrlParams({ q, page: 1 });
  };

  // Handle Sorting toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      const nextDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(nextDir);
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Filter orders based on Date Range
  const dateFilteredOrders = useMemo(() => {
    if (rangeFilter === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return orders.filter((order) => {
      const orderDate = new Date(order.date).getTime();
      if (isNaN(orderDate)) return true;

      if (rangeFilter === 'today') {
        return orderDate >= startOfToday;
      }
      if (rangeFilter === '7d') {
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        return orderDate >= sevenDaysAgo;
      }
      if (rangeFilter === '30d') {
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        return orderDate >= thirtyDaysAgo;
      }
      return true;
    });
  }, [orders, rangeFilter]);

  // Compute live counts for status filter tabs (date range sensitive)
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: dateFilteredOrders.length,
      ACCEPTED: 0,
      IN_TRANSIT: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      DISPUTED: 0,
    };
    dateFilteredOrders.forEach((o) => {
      if (o.status === 'ACCEPTED') counts.ACCEPTED++;
      else if (o.status === 'IN_TRANSIT') counts.IN_TRANSIT++;
      else if (o.status === 'COMPLETED') counts.COMPLETED++;
      else if (o.status === 'CANCELLED') counts.CANCELLED++;
      else if (o.status === 'DISPUTED') counts.DISPUTED++;
    });
    return counts;
  }, [dateFilteredOrders]);

  // Compute KPI Summary Stats (date range sensitive)
  const summaryStats = useMemo(() => {
    const total = dateFilteredOrders.length;
    const completed = statusCounts.COMPLETED;
    const cancelled = statusCounts.CANCELLED;
    const active = statusCounts.ACCEPTED + statusCounts.IN_TRANSIT;

    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
    const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0.0';

    // Revenue sum of completed orders
    const totalRevenueNgn = dateFilteredOrders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + parsePrice(o.price), 0);

    // Cancellation Reason Breakdown for tooltip / card
    const reasonCounts: Record<string, number> = {};
    dateFilteredOrders
      .filter((o) => o.status === 'CANCELLED')
      .forEach((o) => {
        const r = o.cancellationReason || o.customerNote || 'Driver Delayed / No Match';
        reasonCounts[r] = (reasonCounts[r] || 0) + 1;
      });

    const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

    return {
      total,
      completionRate,
      cancellationRate,
      isCancellationHigh: parseFloat(cancellationRate) >= 10.0,
      totalRevenue: `₦${totalRevenueNgn.toLocaleString('en-NG')}`,
      active,
      cancellationBreakdown: sortedReasons,
    };
  }, [dateFilteredOrders, statusCounts]);

  // Filter orders based on status & search query
  const filteredOrders = useMemo(() => {
    let result = dateFilteredOrders;

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Scoped Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.trackingCode?.toLowerCase().includes(q) ||
          o.user?.toLowerCase().includes(q) ||
          o.userEmail?.toLowerCase().includes(q) ||
          o.driver?.toLowerCase().includes(q) ||
          o.pickup?.toLowerCase().includes(q) ||
          o.dropoff?.toLowerCase().includes(q) ||
          o.cancellationReason?.toLowerCase().includes(q)
      );
    }

    // Sorting
    return [...result].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'price') {
        valA = parsePrice(a.price);
        valB = parsePrice(b.price);
      } else if (sortField === 'date') {
        valA = new Date(a.date).getTime() || 0;
        valB = new Date(b.date).getTime() || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dateFilteredOrders, statusFilter, searchQuery, sortField, sortDir]);

  // Pagination calculation
  const totalFiltered = filteredOrders.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, startIndex, pageSize]);

  // Handle Order Cancellation submission
  const handleConfirmCancel = () => {
    if (!cancelingOrder) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === cancelingOrder.id
          ? {
            ...o,
            status: 'CANCELLED',
            cancellationReason: selectedCancelReason,
            customerNote: cancelNotes ? `${selectedCancelReason}: ${cancelNotes}` : selectedCancelReason,
            timeline: [
              ...(o.timeline || []),
              {
                status: 'CANCELLED',
                note: `Cancelled by Admin (${selectedCancelReason})`,
                at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          }
          : o
      )
    );

    setCancelingOrder(null);
    setCancelNotes('');
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const headers = [
      'Tracking Code',
      'Status',
      'Sender Name',
      'Sender Email',
      'Driver Name',
      'Price',
      'Date Placed',
      'Order Type',
      'Disputed',
      'Cancellation Reason',
      'Pickup Location',
      'Dropoff Location',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.trackingCode || ''}"`,
      `"${o.status || ''}"`,
      `"${o.user || ''}"`,
      `"${o.userEmail || ''}"`,
      `"${o.driver || ''}"`,
      `"${o.price || ''}"`,
      `"${o.date || ''}"`,
      `"${getOrderType(o.pickup, o.dropoff)}"`,
      `"${o.status === 'DISPUTED' ? 'Yes' : 'No'}"`,
      `"${o.cancellationReason || ''}"`,
      `"${(o.pickup || '').replace(/"/g, '""')}"`,
      `"${(o.dropoff || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `percel_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total Orders</p>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-foreground tabular-nums">{summaryStats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">In selected date window</p>
        </Card>

        <Card className="border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Completion Rate</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-emerald-400 tabular-nums">{summaryStats.completionRate}%</p>
          <p className="mt-1 text-xs text-emerald-400/80 font-semibold">{statusCounts.COMPLETED} orders delivered</p>
        </Card>

        <Card className={`group relative border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md ${summaryStats.isCancellationHigh ? 'border-destructive/40 bg-destructive/5' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Cancellation Rate</p>
            <XCircle className={`h-4 w-4 ${summaryStats.isCancellationHigh ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`mt-3 font-mono text-3xl font-extrabold tabular-nums ${summaryStats.isCancellationHigh ? 'text-destructive' : 'text-foreground'}`}>
              {summaryStats.cancellationRate}%
            </p>
            {summaryStats.isCancellationHigh && (
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                High Alert
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{statusCounts.CANCELLED} cancelled orders</p>

          {/* Cancellation Reasons Hover Tooltip Card */}
          {summaryStats.cancellationBreakdown.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 hidden rounded-xl border border-border bg-card p-3 shadow-xl group-hover:block transition-all animate-fade-in">
              <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-primary" /> Top Cancellation Reasons
              </p>
              <div className="space-y-1 text-xs">
                {summaryStats.cancellationBreakdown.slice(0, 4).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-muted-foreground">
                    <span className="truncate max-w-[170px]">{reason}</span>
                    <span className="font-mono font-bold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total Revenue</p>
            <Wallet className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-3 font-mono text-2xl font-extrabold text-foreground tabular-nums truncate">{summaryStats.totalRevenue}</p>
          <p className="mt-1 text-xs text-sky-400 font-semibold">From completed orders</p>
        </Card>

        <Card className="border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Active Now</p>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-amber-400 tabular-nums">{summaryStats.active}</p>
          <p className="mt-1 text-xs text-amber-400/80 font-semibold">Accepted + In-Transit</p>
        </Card>
      </div>

      {/* 2. Controls Bar: Status Filter Tabs, Date Range, Search & CSV Export */}
      <Card className="p-4 space-y-4 border-border/80 bg-card/90 backdrop-blur-md">
        {/* Top Row: Filter Tabs matching Live Fleet Radar style */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="mr-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filter Status:
            </span>

            {(['ALL', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'DISPUTED'] as StatusFilter[]).map((st) => {
              const count = statusCounts[st];
              const isActive = statusFilter === st;

              let activeBg = 'bg-primary text-primary-foreground font-bold shadow-xs';
              if (st === 'IN_TRANSIT') activeBg = 'bg-amber-500 text-white font-bold shadow-xs';
              if (st === 'COMPLETED') activeBg = 'bg-emerald-500 text-white font-bold shadow-xs';
              if (st === 'CANCELLED') activeBg = 'bg-destructive text-destructive-foreground font-bold shadow-xs';
              if (st === 'DISPUTED') activeBg = 'bg-rose-600 text-white font-bold shadow-xs';
              if (st === 'ACCEPTED') activeBg = 'bg-sky-500 text-white font-bold shadow-xs';

              return (
                <button
                  key={st}
                  onClick={() => handleStatusTabChange(st)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all duration-200 cursor-pointer ${isActive ? activeBg : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'
                    }`}
                >
                  {st === 'IN_TRANSIT' && isActive && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                  <span>{st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${isActive ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary shadow-xs transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>

        {/* Bottom Row: Scoped Search + Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tracking, sender, driver, location..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-full rounded-xl border border-input bg-background/80 pl-9 pr-8 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Range:</span>
              <select
                value={rangeFilter}
                onChange={(e) => handleRangeChange(e.target.value as DateRangeFilter)}
                className="h-9 rounded-xl border border-input bg-background/80 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const size = parseInt(e.target.value, 10);
                  setPageSize(size);
                  setPage(1);
                  updateUrlParams({ limit: size, page: 1 });
                }}
                className="h-9 rounded-xl border border-input bg-background/80 px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Main Orders Table */}
      <Card className="overflow-hidden border-border/80 shadow-sm bg-card/95 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              <tr>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('trackingCode')}>
                  <div className="flex items-center gap-1.5">
                    <span>Tracking Code</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Sender</th>
                <th className="px-5 py-4">Driver</th>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1.5">
                    <span>Price</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1.5">
                    <span>Date Placed</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedOrders.map((order) => {
                const isUnassigned = !order.driver || order.driver === 'Unassigned';
                const orderType = getOrderType(order.pickup, order.dropoff);
                const isDisputed = order.status === 'DISPUTED';

                return (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    {/* Tracking Code & Dispute Flag */}
                    <td className="px-5 py-4 font-mono text-xs font-bold text-foreground tabular-nums">
                      <div className="flex items-center gap-2">
                        <Link href={`/orders/${order.id}`} className="hover:text-primary hover:underline">
                          {order.trackingCode}
                        </Link>
                        {isDisputed && (
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/20"
                            title="Dispute Open on Order"
                          >
                            <ShieldAlert className="h-3 w-3" /> Dispute
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      {order.status === 'CANCELLED' ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive self-start">
                            <XCircle className="h-3 w-3" /> Cancelled
                          </span>
                          {order.cancellationReason && (
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[140px]" title={order.cancellationReason}>
                              {order.cancellationReason}
                            </span>
                          )}
                        </div>
                      ) : order.status === 'IN_TRANSIT' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          In Transit
                        </span>
                      ) : order.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : order.status === 'ACCEPTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Accepted
                        </span>
                      ) : order.status === 'DISPUTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
                          <ShieldAlert className="h-3 w-3" /> Disputed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
                          <Clock className="h-3 w-3" /> {order.status?.replace('_', ' ') || 'Pending'}
                        </span>
                      )}
                    </td>

                    {/* Order Type Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${orderType === 'Interstate'
                          ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                          : 'border-border bg-muted/50 text-muted-foreground'
                          }`}
                      >
                        {orderType}
                      </span>
                    </td>

                    {/* Sender */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{order.user}</div>
                      {order.userEmail && <div className="text-xs text-muted-foreground truncate max-w-[160px]">{order.userEmail}</div>}
                    </td>

                    {/* Driver - visually distinct if unassigned */}
                    <td className="px-5 py-4">
                      {isUnassigned ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 italic bg-muted/40 px-2.5 py-1 rounded-lg border border-dashed border-border/80">
                          <User className="h-3 w-3" /> Unassigned
                        </span>
                      ) : (
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-emerald-400" />
                            {order.driver}
                          </div>
                          {order.driverVehicle && <div className="text-xs text-muted-foreground">{order.driverVehicle}</div>}
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4 font-mono font-semibold tabular-nums text-foreground">{order.price}</td>

                    {/* Date Placed with hover relative time tooltip */}
                    <td className="px-5 py-4 text-xs text-muted-foreground" title={order.date}>
                      <div className="font-medium text-foreground">{formatRelativeTime(order.date)}</div>
                      <div className="text-[10px] text-muted-foreground/80">{order.date}</div>
                    </td>

                    {/* Action Column */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">

                        <Link href={`/orders/${order.id}`} className="text-xs font-semibold text-primary hover:underline">
                          View
                        </Link>
                        {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                          <button
                            onClick={() => setCancelingOrder(order)}
                            className="rounded-xl border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">No logistics orders found matching current filters.</p>
                    <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or selecting &quot;All Orders&quot;.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border px-5 py-4 bg-muted/30">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-mono font-bold text-foreground">{totalFiltered > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-mono font-bold text-foreground">{Math.min(startIndex + pageSize, totalFiltered)}</span> of{' '}
            <span className="font-mono font-bold text-foreground">{totalFiltered}</span> orders
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                const prev = Math.max(1, page - 1);
                setPage(prev);
                updateUrlParams({ page: prev });
              }}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>

            <span className="text-xs font-mono font-bold text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                updateUrlParams({ page: next });
              }}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* 5. Cancellation Reason Modal Dialog */}
      {cancelingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive font-extrabold text-base">
                <AlertTriangle className="h-5 w-5" /> Cancel Order #{cancelingOrder.trackingCode}
              </div>
              <button onClick={() => setCancelingOrder(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Please select a cancellation reason to update logistics telemetry and issue automatic refund processing.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Required Cancellation Reason
              </label>
              <select
                value={selectedCancelReason}
                onChange={(e) => setSelectedCancelReason(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50"
              >
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block pt-2">
                Additional Notes (Optional)
              </label>
              <textarea
                placeholder="Provide context or support note for customer..."
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelingOrder(null)}
                className="rounded-xl border border-border bg-muted/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCancel}
                className="rounded-xl border border-destructive/40 bg-destructive text-destructive-foreground px-4 py-2 text-xs font-bold hover:bg-destructive/90 transition-all cursor-pointer shadow-xs"
              >
                Confirm Cancellation & Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
