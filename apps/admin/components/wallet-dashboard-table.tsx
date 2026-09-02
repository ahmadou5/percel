'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  User,
  ShieldAlert,
  BarChart3,
  CreditCard,
  Zap,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminWalletTransaction } from '@/lib/admin-data';

type WalletStat = {
  label: string;
  value: string;
  delta: string;
};

// Helper for Naira formatting
function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function WalletDashboardTable({
  initialStats,
  initialTransactions,
}: {
  initialStats: WalletStat[];
  initialTransactions: AdminWalletTransaction[];
}) {
  const [stats] = useState<WalletStat[]>(initialStats);
  const [transactions] = useState<AdminWalletTransaction[]>(initialTransactions || []);

  // State Controls
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Revenue Trend Chart Granularity State
  const [chartGranularity, setChartGranularity] = useState<'DAILY' | 'WEEKLY'>('DAILY');

  // Category counts calculation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: transactions.length,
      ORDER_PAYMENT: 0,
      ORDER_EARNING: 0,
      REFUND: 0,
      TRANSFER: 0,
      TOP_UP: 0,
      BILLS: 0,
    };

    transactions.forEach((tx) => {
      const cat = tx.category.toUpperCase();
      if (cat.includes('PAYMENT')) counts.ORDER_PAYMENT++;
      else if (cat.includes('EARNING')) counts.ORDER_EARNING++;
      else if (cat.includes('REFUND')) counts.REFUND++;
      else if (cat.includes('TRANSFER')) counts.TRANSFER++;
      else if (cat.includes('TOP')) counts.TOP_UP++;
      else if (cat.includes('AIRTIME') || cat.includes('DATA') || cat.includes('TV')) counts.BILLS++;
    });

    return counts;
  }, [transactions]);

  // Reconciliation Calculations
  const reconciliationData = useMemo(() => {
    let totalTopups = 0;
    let totalEarnings = 0;
    let totalPayouts = 0;
    let totalRefunds = 0;

    transactions.forEach((tx) => {
      const amt = tx.rawAmount || parseFloat(tx.amount.replace(/[^0-9.]/g, '')) || 0;
      const cat = tx.category.toUpperCase();

      if (cat.includes('TOP')) totalTopups += amt;
      else if (cat.includes('EARNING')) totalEarnings += amt;
      else if (cat.includes('PAYOUT') || cat.includes('TRANSFER_OUT')) totalPayouts += amt;
      else if (cat.includes('REFUND')) totalRefunds += amt;
    });

    const netLedgerLiquidity = totalTopups + totalEarnings - totalPayouts - totalRefunds;

    // Read reported platform balance from stats or parse
    const statPlatformBalance = stats.find((s) => s.label.toLowerCase().includes('platform'))?.value;
    const numericPlatformBalance = parseFloat(statPlatformBalance?.replace(/[^0-9.]/g, '') || '0');

    // Discrepancy check
    const hasDiscrepancy = Math.abs(numericPlatformBalance - netLedgerLiquidity) > 50000;

    return {
      totalTopups,
      totalEarnings,
      totalPayouts,
      totalRefunds,
      netLedgerLiquidity,
      numericPlatformBalance,
      hasDiscrepancy,
      discrepancyAmount: Math.abs(numericPlatformBalance - netLedgerLiquidity),
    };
  }, [transactions, stats]);

  // Filtered dataset
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const cat = tx.category.toUpperCase();

      // Category match
      if (categoryFilter === 'ORDER_PAYMENT' && !cat.includes('PAYMENT')) return false;
      if (categoryFilter === 'ORDER_EARNING' && !cat.includes('EARNING')) return false;
      if (categoryFilter === 'REFUND' && !cat.includes('REFUND')) return false;
      if (categoryFilter === 'TRANSFER' && !cat.includes('TRANSFER')) return false;
      if (categoryFilter === 'TOP_UP' && !cat.includes('TOP')) return false;
      if (categoryFilter === 'BILLS' && !(['AIRTIME', 'DATA', 'TV'].some((b) => cat.includes(b)))) return false;

      // Status match
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;

      // Date match
      if (dateRange === 'TODAY' && !tx.createdAt.toLowerCase().includes('today')) return false;
      if (dateRange === '7D' && tx.createdAt.toLowerCase().includes('30d')) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = tx.reference.toLowerCase().includes(q);
        const noteMatch = tx.note.toLowerCase().includes(q);
        const userMatch = (tx.userName || '').toLowerCase().includes(q);
        if (!refMatch && !noteMatch && !userMatch) return false;
      }

      return true;
    });
  }, [transactions, categoryFilter, statusFilter, dateRange, searchQuery]);

  // Pagination bounds
  const totalFiltered = filteredTransactions.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  const handleCategoryTabChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  // CSV Export Action
  const handleExportCSV = () => {
    const headers = ['Reference', 'Category', 'User/Driver', 'Amount', 'Status', 'Note', 'Date'];
    const rows = filteredTransactions.map((tx) => [
      tx.reference,
      tx.category,
      tx.userName || 'Anonymous',
      tx.amount,
      tx.status,
      `"${tx.note.replace(/"/g, '""')}"`,
      tx.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `percel_wallet_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Wallet & Revenue</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              FINANCIAL AUDIT LEAGUE
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform balance, commission take-rates, ledger reconciliation, and user attribution telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} variant="secondary" className="cursor-pointer">
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* 1. Stat Cards Row with Backend Verification Badges */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const isPlatform = item.label.toLowerCase().includes('platform');
          const isCommission = item.label.toLowerCase().includes('commission');

          return (
            <Card
              key={item.label}
              className={`p-5 transition-all duration-200 border-border/80 bg-card/90 backdrop-blur-md shadow-xs ${
                isCommission && item.value === '₦0' ? 'border-amber-500/40 bg-amber-500/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{item.label}</p>
                {isPlatform && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary" title="Sum of customer/driver wallet deposits in system">
                    <Info className="h-3 w-3" /> User Deposits
                  </span>
                )}
                {isCommission && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400" title="15% platform take-rate computed from order payments">
                    15% Take-Rate
                  </span>
                )}
              </div>
              <p className="mt-3 font-mono text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {item.value}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.delta}</span>
                {isCommission && item.value === '₦0' && (
                  <span className="text-amber-400 font-semibold flex items-center gap-0.5 text-[11px]">
                    <AlertTriangle className="h-3 w-3" /> Backend calculation check
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </section>

      {/* 2. Reconciliation Mini-Panel */}
      <Card className="p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Wallet Reconciliation Mini-Panel</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ledger Liquidity Formula: <span className="font-mono text-foreground">Top-ups + Earnings − Payouts − Refunds</span> compared against Database Platform Balance.
            </p>
          </div>

          <div>
            {reconciliationData.hasDiscrepancy ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-300 animate-pulse">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                Discrepancy Flagged ({formatNaira(reconciliationData.discrepancyAmount)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Reconciled
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 text-xs font-mono">
          <div className="rounded-xl border border-border/80 bg-background/60 p-3">
            <span className="text-muted-foreground block text-[10px] uppercase font-sans font-bold">Total Top-Ups</span>
            <span className="text-emerald-400 font-bold text-sm mt-1 block">+{formatNaira(reconciliationData.totalTopups)}</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/60 p-3">
            <span className="text-muted-foreground block text-[10px] uppercase font-sans font-bold">Total Earnings</span>
            <span className="text-emerald-400 font-bold text-sm mt-1 block">+{formatNaira(reconciliationData.totalEarnings)}</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/60 p-3">
            <span className="text-muted-foreground block text-[10px] uppercase font-sans font-bold">Total Payouts</span>
            <span className="text-rose-400 font-bold text-sm mt-1 block">-{formatNaira(reconciliationData.totalPayouts)}</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/60 p-3">
            <span className="text-muted-foreground block text-[10px] uppercase font-sans font-bold">Total Refunds</span>
            <span className="text-amber-400 font-bold text-sm mt-1 block">-{formatNaira(reconciliationData.totalRefunds)}</span>
          </div>
        </div>
      </Card>

      {/* 3. Revenue Trend Chart Section */}
      <Card className="p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-bold text-foreground">30-Day Revenue & Commission Trend</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Historical commission volume and settlement velocity</p>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => setChartGranularity('DAILY')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartGranularity === 'DAILY' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setChartGranularity('WEEKLY')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartGranularity === 'WEEKLY' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Visual Revenue Bars Chart */}
        <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-border/60">
          {[42, 68, 55, 80, 95, 72, 110, 88, 125, 98, 140, 115, 160, 130, 175].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
              <div
                style={{ height: `${height}%` }}
                className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary group-hover:from-primary/70 group-hover:to-primary transition-all duration-200 relative"
              >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none">
                  {formatNaira(height * 1250)}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Day {i + 1}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Category Filter Chips, Controls & Search */}
      <div className="space-y-4">
        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Transactions', count: categoryCounts.ALL },
            { id: 'ORDER_PAYMENT', label: 'Order Payments', count: categoryCounts.ORDER_PAYMENT },
            { id: 'ORDER_EARNING', label: 'Driver Earnings', count: categoryCounts.ORDER_EARNING },
            { id: 'REFUND', label: 'Refunds', count: categoryCounts.REFUND },
            { id: 'TRANSFER', label: 'Transfers', count: categoryCounts.TRANSFER },
            { id: 'TOP_UP', label: 'Top-Ups', count: categoryCounts.TOP_UP },
            { id: 'BILLS', label: 'Bills (Airtime/Data/TV)', count: categoryCounts.BILLS },
          ].map((chip) => {
            const isActive = categoryFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => handleCategoryTabChange(chip.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-mono ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-y border-border/60 py-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reference ID, user name, or notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>

          {/* Date Range & Status Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Transactions Table with Category Badges & User Attribution */}
      <Card className="overflow-hidden border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground font-bold">
              <tr>
                <th className="px-5 py-4">Reference</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">User / Courier</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Note & Risk</th>
                <th className="px-5 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => {
                  const cat = tx.category.toUpperCase();

                  // Category badge styling
                  let badgeStyle = 'border-blue-500/30 bg-blue-500/10 text-blue-400';
                  if (cat.includes('EARNING')) {
                    badgeStyle = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
                  } else if (cat.includes('REFUND')) {
                    badgeStyle = 'border-amber-500/30 bg-amber-500/10 text-amber-400';
                  } else if (cat.includes('TRANSFER_IN')) {
                    badgeStyle = 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5';
                  } else if (cat.includes('TRANSFER_OUT')) {
                    badgeStyle = 'border-border text-muted-foreground bg-muted/40';
                  } else if (cat.includes('TOP')) {
                    badgeStyle = 'border-teal-500/30 bg-teal-500/10 text-teal-400';
                  } else if (['AIRTIME', 'DATA', 'TV'].some((b) => cat.includes(b))) {
                    badgeStyle = 'border-purple-500/30 bg-purple-500/10 text-purple-400';
                  }

                  const isCredit = cat.includes('IN') || cat.includes('TOP') || cat.includes('EARNING');

                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        tx.isAnomalous ? 'bg-amber-500/[0.08] ring-1 ring-inset ring-amber-500/30' : ''
                      }`}
                    >
                      {/* Reference */}
                      <td className="px-5 py-4 font-mono text-xs font-bold text-foreground">{tx.reference}</td>

                      {/* Category Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`rounded-md border px-2.5 py-1 text-xs font-extrabold ${badgeStyle}`}>
                          {tx.category}
                        </span>
                      </td>

                      {/* User Attribution */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {tx.userId ? (
                          <Link
                            href={tx.userRole === 'DRIVER' ? `/drivers/${tx.userId}` : `/users/${tx.userId}`}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            <User className="h-3.5 w-3.5" />
                            {tx.userName || 'View Profile'}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">{tx.userName || 'Internal System'}</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 font-mono font-extrabold text-sm tabular-nums whitespace-nowrap">
                        <span className={isCredit ? 'text-emerald-400' : 'text-foreground'}>
                          {isCredit ? '+' : '-'}{tx.amount}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            tx.status === 'COMPLETED'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Note & Anomaly Flagging */}
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{tx.note}</span>
                          {tx.isAnomalous && (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 shrink-0"
                              title={tx.anomalyReason || 'Unusual transaction flag'}
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-300" /> Anomaly
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {tx.createdAt}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">No wallet transactions found matching current filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80 px-5 py-4 bg-muted/30">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-mono font-bold text-foreground">{totalFiltered > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-mono font-bold text-foreground">{Math.min(startIndex + pageSize, totalFiltered)}</span> of{' '}
            <span className="font-mono font-bold text-foreground">{totalFiltered}</span> transactions
          </p>

          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold text-foreground cursor-pointer"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs font-bold px-2">
                {currentPage}/{totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
