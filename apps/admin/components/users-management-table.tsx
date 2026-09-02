'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Wallet,
  ExternalLink,
  MoreVertical,
  Activity,
  UserCheck,
  TrendingUp,
  FileText,
  User,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminUser, AdminWalletTransaction } from '@/lib/admin-data';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'SYSTEM';
type SortField = 'joined' | 'orders' | 'wallet';
type SortDirection = 'asc' | 'desc';
type SignupWindow = '7d' | '30d';

// Helper to parse currency string e.g. "₦1,250,000" into a raw number
function parseMoney(moneyStr?: string, rawNum?: number): number {
  if (typeof rawNum === 'number' && !isNaN(rawNum)) return rawNum;
  if (!moneyStr) return 0;
  const numeric = moneyStr.replace(/[^0-9.]/g, '');
  return parseFloat(numeric) || 0;
}

// Format number into NGN currency string
function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Compact format NGN for summary stats e.g. ₦12.5M
function formatCompactNaira(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `₦${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `₦${(amount / 1_000).toFixed(1)}K`;
  }
  return `₦${amount.toLocaleString()}`;
}

// Helper to detect if account is an internal system account
function isSystemAccount(user: AdminUser): boolean {
  if (user.isSystem || user.role === 'SYSTEM') return true;
  const nameLower = (user.name || '').toLowerCase();
  const emailLower = (user.email || '').toLowerCase();
  return (
    user.id === '00000000-0000-0000-0000-000000000000' ||
    nameLower.includes('percel system') ||
    nameLower.includes('system platform') ||
    emailLower.includes('system@percel')
  );
}

// Helper to detect wallet balance anomaly relative to order count/status
function isWalletAnomaly(user: AdminUser): { isAnomaly: boolean; reason?: string } {
  // System accounts naturally hold system liquidity pool
  if (isSystemAccount(user)) return { isAnomaly: false };

  const balance = parseMoney(user.wallet, user.rawWalletBalance);
  const orderCount = parseInt(user.orders || '0', 10);

  // Anomaly rule: Balance > ₦1M with 0-1 orders, OR balance > ₦5M
  if (balance >= 1_000_000 && orderCount <= 1) {
    return {
      isAnomaly: true,
      reason: `High balance (${formatNaira(balance)}) with only ${orderCount} order(s). Possible test/seed credit or integrity anomaly.`,
    };
  }
  if (balance >= 5_000_000 && orderCount < 5) {
    return {
      isAnomaly: true,
      reason: `Unusually high wallet balance (${formatNaira(balance)}) for ${orderCount} total order(s).`,
    };
  }

  return { isAnomaly: false };
}

// User Avatar component
function AvatarCell({ name, avatarUrl, initial }: { name: string; avatarUrl?: string; initial: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
        {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : initial || name.charAt(0).toUpperCase()}
      </div>
      <div>
        <span className="font-medium text-foreground">{name}</span>
      </div>
    </div>
  );
}

export function UsersManagementTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [users] = useState<AdminUser[]>(initialUsers);

  // URL Query parameter sync
  const currentStatus = (searchParams.get('status')?.toUpperCase() as StatusFilter) || 'ALL';
  const currentQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '25', 10);

  // Local state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(currentStatus);
  const [searchQuery, setSearchQuery] = useState<string>(currentQuery);
  const [page, setPage] = useState<number>(currentPage);
  const [pageSize, setPageSize] = useState<number>(currentLimit);

  // 7d / 30d signup toggle
  const [signupWindow, setSignupWindow] = useState<SignupWindow>('7d');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('joined');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Selected user for quick wallet ledger drawer modal
  const [selectedLedgerUser, setSelectedLedgerUser] = useState<AdminUser | null>(null);

  // Sync state changes with URL
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

  const handleStatusTabChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
    updateUrlParams({ status, page: 1 });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
    updateUrlParams({ q, page: 1 });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Live status tab counts
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: 0,
      ACTIVE: 0,
      PENDING_VERIFICATION: 0,
      SUSPENDED: 0,
      SYSTEM: 0,
    };

    users.forEach((u) => {
      if (isSystemAccount(u)) {
        counts.SYSTEM++;
      } else {
        counts.ALL++;
        if (u.status === 'ACTIVE') counts.ACTIVE++;
        else if (u.status === 'PENDING_VERIFICATION') counts.PENDING_VERIFICATION++;
        else if (u.status === 'SUSPENDED') counts.SUSPENDED++;
      }
    });

    return counts;
  }, [users]);

  // KPI Summary calculations
  const summaryStats = useMemo(() => {
    const customerUsers = users.filter((u) => !isSystemAccount(u));
    const systemUsers = users.filter((u) => isSystemAccount(u));

    const totalUsersCount = customerUsers.length;
    const activeCount = statusCounts.ACTIVE;
    const pendingCount = statusCounts.PENDING_VERIFICATION;

    // Signup counts (7d vs 30d)
    const now = new Date();
    let signups7d = 0;
    let signups30d = 0;

    customerUsers.forEach((u) => {
      const createdStr = u.createdAt || u.joined;
      if (!createdStr) return;
      const createdDate = new Date(createdStr);
      if (isNaN(createdDate.getTime())) return;

      const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) signups7d++;
      if (diffDays <= 30) signups30d++;
    });

    // Customer wallet liquidity sum
    let customerLiquidity = 0;
    let outlierCount = 0;
    const balances: number[] = [];

    customerUsers.forEach((u) => {
      const bal = parseMoney(u.wallet, u.rawWalletBalance);
      customerLiquidity += bal;
      balances.push(bal);
      if (isWalletAnomaly(u).isAnomaly) {
        outlierCount++;
      }
    });

    // System liquidity sum
    let systemLiquidity = 0;
    systemUsers.forEach((u) => {
      systemLiquidity += parseMoney(u.wallet, u.rawWalletBalance);
    });

    return {
      totalUsersCount,
      activeCount,
      pendingCount,
      signups7d,
      signups30d,
      customerLiquidity,
      systemLiquidity,
      outlierCount,
      hasPendingUrgency: pendingCount > 0,
    };
  }, [users, statusCounts]);

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    let result = users;

    // Status / System filter
    if (statusFilter === 'SYSTEM') {
      result = result.filter(isSystemAccount);
    } else {
      // Exclude system accounts from normal customer filters
      result = result.filter((u) => !isSystemAccount(u));

      if (statusFilter === 'ACTIVE') {
        result = result.filter((u) => u.status === 'ACTIVE');
      } else if (statusFilter === 'PENDING_VERIFICATION') {
        result = result.filter((u) => u.status === 'PENDING_VERIFICATION');
      } else if (statusFilter === 'SUSPENDED') {
        result = result.filter((u) => u.status === 'SUSPENDED');
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.city?.toLowerCase().includes(q)
      );
    }

    // Sorting
    return [...result].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'wallet') {
        valA = parseMoney(a.wallet, a.rawWalletBalance);
        valB = parseMoney(b.wallet, b.rawWalletBalance);
      } else if (sortField === 'orders') {
        valA = parseInt(a.orders || '0', 10);
        valB = parseInt(b.orders || '0', 10);
      } else if (sortField === 'joined') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : a.joined || '';
        valB = b.createdAt ? new Date(b.createdAt).getTime() : b.joined || '';
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, statusFilter, searchQuery, sortField, sortDir]);

  // Pagination calculation
  const totalFilteredCount = filteredUsers.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  const startRecord = totalFilteredCount > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(safePage * pageSize, totalFilteredCount);

  return (
    <div className="space-y-6">
      {/* 1. Summary Stats Row (Matching Orders/Drivers style) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Stat Card */}
        <Card className="group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-border/80 bg-card/90 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-xs">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Users</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {summaryStats.totalUsersCount}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary shadow-xs">
              Customer Accounts
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Excludes {statusCounts.SYSTEM} internal system platform account(s)
          </p>
        </Card>

        {/* Active vs Pending Card */}
        <Card className="group relative overflow-hidden py-4 px-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-border/80 bg-card/90 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl border shadow-xs ${summaryStats.hasPendingUrgency
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                }`}>
                {summaryStats.hasPendingUrgency ? <AlertTriangle className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">status</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {summaryStats.activeCount} </p>
              </div>
            </div>
            {summaryStats.pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 shadow-xs animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {summaryStats.pendingCount} Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 shadow-xs">
                All Verified
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {summaryStats.pendingCount} account(s) currently awaiting ID verification
          </p>
        </Card>

        {/* New Signups with 7d / 30d Toggle */}
        <Card className="group relative overflow-hidden py-4 px-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-border/80 bg-card/90 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">New Signups</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {signupWindow === '7d' ? summaryStats.signups7d : summaryStats.signups30d}
                </p>
              </div>
            </div>
            {/* 7d / 30d Toggle Buttons */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSignupWindow('7d')}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${signupWindow === '7d' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setSignupWindow('30d')}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${signupWindow === '30d' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                30d
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Signups registered in the last {signupWindow === '7d' ? '7 days' : '30 days'}
          </p>
        </Card>

        {/* Total Wallet Liquidity Card */}
        <Card className="group relative overflow-hidden py-4 px-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-border/80 bg-card/90 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-warning/30 bg-warning/10 text-warning shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Liquidity</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {formatCompactNaira(summaryStats.customerLiquidity)}
                </p>
              </div>
            </div>
            {summaryStats.outlierCount > 0 ? (
              <span
                title="1 or more accounts have an unusually high wallet balance relative to order count"
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 shadow-xs"
              >
                <AlertTriangle className="h-3 w-3" />
                {summaryStats.outlierCount} Outlier
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 shadow-xs">
                Balanced
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            System reserve: {formatCompactNaira(summaryStats.systemLiquidity)} (separated)
          </p>
        </Card>
      </div>

      {/* Main Table Card Container */}
      <Card className="overflow-hidden border-border/80 shadow-sm">
        {/* Controls Bar: Search & Status Filter Chips */}
        <div className="border-b border-border bg-card p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/50 pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Chips with Live Counts */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => handleStatusTabChange('ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              All Users
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'ALL' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'}`}>
                {statusCounts.ALL}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusTabChange('ACTIVE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
              <span className="ml-1 rounded-full bg-background/40 px-1.5 py-0.2 text-[10px]">
                {statusCounts.ACTIVE}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusTabChange('PENDING_VERIFICATION')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'PENDING_VERIFICATION'
                ? 'bg-amber-600 text-white shadow-xs font-semibold'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                }`}
            >
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Pending
              <span className="ml-1 rounded-full bg-background/40 px-1.5 py-0.2 text-[10px]">
                {statusCounts.PENDING_VERIFICATION}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusTabChange('SUSPENDED')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === 'SUSPENDED'
                ? 'bg-rose-600 text-white shadow-xs font-semibold'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                }`}
            >
              Suspended
              <span className="ml-1 rounded-full bg-background/40 px-1.5 py-0.2 text-[10px]">
                {statusCounts.SUSPENDED}
              </span>
            </button>

            {/* Separate System Accounts Filter Chip */}
            <button
              type="button"
              onClick={() => handleStatusTabChange('SYSTEM')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-dashed ${statusFilter === 'SYSTEM'
                ? 'bg-purple-600 text-white border-purple-500 shadow-xs font-semibold'
                : 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'
                }`}
            >
              <ShieldCheck className="h-3 w-3 text-purple-500" />
              System Accounts
              <span className="ml-1 rounded-full bg-background/40 px-1.5 py-0.2 text-[10px]">
                {statusCounts.SYSTEM}
              </span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Account Type</th>
                <th className="px-5 py-3.5">Status</th>

                <th className="px-5 py-3.5 cursor-pointer hover:text-foreground" onClick={() => handleSort('orders')}>
                  <div className="flex items-center gap-1">
                    Orders
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-foreground" onClick={() => handleSort('wallet')}>
                  <div className="flex items-center gap-1">
                    Wallet Balance
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-5 py-3.5">KYC / Address</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-medium">No users found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search query or status filter chips.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const anomaly = isWalletAnomaly(user);
                  const isPending = user.status === 'PENDING_VERIFICATION';
                  const isSystem = isSystemAccount(user);

                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors border-b border-border/70 last:border-b-0 ${isPending
                        ? 'bg-amber-500/[0.08] ring-1 ring-inset ring-amber-500/30'
                        : isSystem
                          ? 'bg-purple-500/[0.03] hover:bg-purple-500/[0.06] border-l-2 border-l-purple-500/50'
                          : 'hover:bg-muted/40'
                        }`}
                    >
                      {/* Name & Contact */}
                      <td className="px-5 py-3.5">
                        <AvatarCell name={user.name} avatarUrl={user.avatarUrl} initial={user.avatarInitial} />

                      </td>

                      {/* Account Type / Role */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isSystem ? (
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[11px] font-semibold">
                            System Platform
                          </Badge>
                        ) : user.isDriver || user.accountType === 'Driver-linked' ? (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30 text-[11px]">
                            Driver-Linked
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-border text-[11px]">
                            Customer
                          </Badge>
                        )}
                      </td>

                      {/* Status Badge + Urgency Signal */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {user.status === 'ACTIVE' && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            ACTIVE
                          </Badge>
                        )}
                        {user.status === 'PENDING_VERIFICATION' && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold inline-flex items-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mr-1 shrink-0 animate-pulse" />
                            PENDING
                          </Badge>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium">
                            SUSPENDED
                          </Badge>
                        )}
                      </td>




                      {/* Orders Count */}
                      <td className="px-5 py-3.5 font-mono tabular-nums font-medium">
                        {user.orders}
                      </td>

                      {/* Wallet Balance + Anomaly Flag & Quick Ledger Link */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold tabular-nums text-foreground">
                            {user.wallet}
                          </span>

                          {/* Subtle Anomaly Warning Flag */}
                          {anomaly.isAnomaly && (
                            <div className="relative group inline-block">
                              <span className="cursor-help grid place-items-center rounded-full bg-amber-500/20 p-1 text-amber-600 hover:bg-amber-500/30 transition-colors">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              </span>
                              {/* Tooltip on Hover */}
                              <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover:block w-64 rounded-lg bg-popover border border-border p-2.5 text-xs shadow-xl z-50 text-popover-foreground">
                                <p className="font-semibold text-amber-600 flex items-center gap-1 mb-1">
                                  <AlertTriangle className="h-3.5 w-3.5" /> High Wallet Balance Flag
                                </p>
                                <p className="text-[11px] leading-tight text-muted-foreground">
                                  {anomaly.reason}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* View Ledger Quick Action Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedLedgerUser(user)}
                          className="mt-1 text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          <FileText className="h-3 w-3" />
                          View Ledger
                        </button>
                      </td>

                      {/* KYC / Address Completeness */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {user.kycStatus === 'COMPLETE' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                          </Badge>
                        ) : user.city && user.city !== 'Not set' ? (
                          <div className="text-xs text-foreground truncate max-w-[130px]" title={user.city}>
                            {user.city}
                          </div>
                        ) : (
                          <Badge className="bg-amber-500/5 text-amber-600 border-amber-500/30 text-[10px]">
                            Incomplete
                          </Badge>
                        )}
                      </td>

                      {/* Profile Link */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors border border-primary/20"
                          href={`/users/${user.id}`}
                        >
                          View profile

                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Pagination Bar */}
        <div className="border-t border-border bg-muted/30 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{startRecord}</strong> to{' '}
              <strong className="text-foreground">{endRecord}</strong> of{' '}
              <strong className="text-foreground">{totalFilteredCount}</strong> users
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value, 10);
                  setPageSize(newLimit);
                  setPage(1);
                  updateUrlParams({ limit: newLimit, page: 1 });
                }}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                const prev = safePage - 1;
                setPage(prev);
                updateUrlParams({ page: prev });
              }}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>

            <span className="px-3 text-xs font-semibold text-foreground">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                const next = safePage + 1;
                setPage(next);
                updateUrlParams({ page: next });
              }}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </Card>

      {/* Quick Action Wallet Ledger Drawer/Modal */}
      {selectedLedgerUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Wallet className="h-5 w-5 text-primary" />
                  Wallet Ledger — {selectedLedgerUser.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Account ID: <span className="font-mono">{selectedLedgerUser.id}</span> · Current Balance:{' '}
                  <strong className="font-mono text-foreground">{selectedLedgerUser.wallet}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerUser(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Wallet Anomaly Warning Banner inside Modal */}
            {isWalletAnomaly(selectedLedgerUser).isAnomaly && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Ops Investigation Flag</p>
                  <p className="mt-0.5 text-[11px] leading-tight">
                    {isWalletAnomaly(selectedLedgerUser).reason} Check with backend team if this is seeded dev credit or an unverified wallet top-up.
                  </p>
                </div>
              </div>
            )}

            {/* Ledger Transactions Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Transactions Ledger
              </h4>

              {selectedLedgerUser.walletTransactions && selectedLedgerUser.walletTransactions.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/50 text-[10px] uppercase font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 font-mono">
                      {selectedLedgerUser.walletTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{tx.category}</td>
                          <td className="px-3 py-2">
                            <span className={tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-bold">{tx.amount}</td>
                          <td className="px-3 py-2">{tx.status}</td>
                          <td className="px-3 py-2 text-muted-foreground">{tx.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  No recorded ledger transactions for this account in current view.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Link
                href={`/users/${selectedLedgerUser.id}`}
                className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Go to full user profile <ExternalLink className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedLedgerUser(null)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
