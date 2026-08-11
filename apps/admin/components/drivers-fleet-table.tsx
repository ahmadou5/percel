'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Star,
  Truck,
  Bike,
  Car,
  ShieldAlert,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Wallet,
  ExternalLink,
  MoreVertical,
  Activity,
  Award,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { AdminDriver } from '@/lib/admin-data';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING_KYC' | 'PENDING_VEHICLE' | 'SUSPENDED';
type VehicleFilter = 'ALL' | 'Bike' | 'Car' | 'Van' | 'Truck';
type SortField = 'rating' | 'completedDeliveries' | 'lastActive' | 'name';
type SortDirection = 'asc' | 'desc';

// Helper to parse vehicle string e.g. "Honda Ace 110 - ABC-123-XY" into type
function parseVehicleType(vehicleStr?: string): 'Bike' | 'Car' | 'Van' | 'Truck' {
  if (!vehicleStr) return 'Bike';
  const str = vehicleStr.toLowerCase();
  if (str.includes('car') || str.includes('corolla') || str.includes('sedan') || str.includes('camry')) return 'Car';
  if (str.includes('van') || str.includes('sienna') || str.includes('bus')) return 'Van';
  if (str.includes('truck') || str.includes('haul') || str.includes('canter')) return 'Truck';
  return 'Bike'; // Default most common in logistics fleet
}

// Helper to format avatar initial
function getInitials(name: string): string {
  if (!name) return 'DR';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function DriversFleetTable({ initialDrivers }: { initialDrivers: AdminDriver[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local drivers state to support actions like suspend/reactivate
  const [drivers, setDrivers] = useState<AdminDriver[]>(initialDrivers);

  // URL query sync
  const currentStatus = (searchParams.get('status')?.toUpperCase() as StatusFilter) || 'ALL';
  const currentVehicle = (searchParams.get('vehicle') as VehicleFilter) || 'ALL';
  const currentQuery = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '25', 10);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(currentStatus);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>(currentVehicle);
  const [searchQuery, setSearchQuery] = useState<string>(currentQuery);
  const [page, setPage] = useState<number>(currentPage);
  const [pageSize, setPageSize] = useState<number>(currentLimit);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Suspension confirmation state
  const [suspendingDriver, setSuspendingDriver] = useState<AdminDriver | null>(null);

  // Sync state changes with URL parameters
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

  // Tab filter click handler
  const handleStatusTabChange = (st: StatusFilter) => {
    setStatusFilter(st);
    setPage(1);
    updateUrlParams({ status: st, page: 1 });
  };

  // Vehicle dropdown filter handler
  const handleVehicleChange = (v: VehicleFilter) => {
    setVehicleFilter(v);
    setPage(1);
    updateUrlParams({ vehicle: v, page: 1 });
  };

  // Search query handler
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
    updateUrlParams({ q: q || null, page: 1 });
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Live status counts
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: drivers.length,
      ACTIVE: 0,
      PENDING_KYC: 0,
      PENDING_VEHICLE: 0,
      SUSPENDED: 0,
    };
    drivers.forEach((d) => {
      if (d.status === 'ACTIVE') counts.ACTIVE++;
      else if (d.status === 'SUSPENDED') counts.SUSPENDED++;

      if (d.kyc === 'SUBMITTED' || d.kyc === 'PENDING' || d.status === 'PENDING_KYC') {
        counts.PENDING_KYC++;
      }
      if (d.vehicleStatus === 'SUBMITTED' || d.vehicleStatus === 'PENDING') {
        counts.PENDING_VEHICLE++;
      }
    });
    return counts;
  }, [drivers]);

  // Fleet Summary KPI Stats
  const summaryStats = useMemo(() => {
    const total = drivers.length;
    const activeNow = statusCounts.ACTIVE;
    const pendingKyc = statusCounts.PENDING_KYC;

    // Weighted average fleet rating: sum(rating * reviewCount) / sum(reviewCount)
    let totalWeightedRating = 0;
    let totalReviews = 0;

    const vehicleCounts: Record<string, number> = { Bike: 0, Car: 0, Van: 0, Truck: 0 };

    drivers.forEach((d) => {
      const ratingNum = parseFloat(d.rating) || 0;
      const reviewsNum = d.reviewCount ?? d.reviews?.length ?? 0;
      if (reviewsNum > 0) {
        totalWeightedRating += ratingNum * reviewsNum;
        totalReviews += reviewsNum;
      }

      const vType = d.vehicleType || parseVehicleType(d.vehicle);
      vehicleCounts[vType] = (vehicleCounts[vType] || 0) + 1;
    });

    const weightedAvgRating = totalReviews > 0 ? (totalWeightedRating / totalReviews).toFixed(2) : '4.50';

    const vehicleBreakdownStr = `${vehicleCounts.Bike || 0} bikes · ${vehicleCounts.Car || 0} cars · ${(vehicleCounts.Van || 0) + (vehicleCounts.Truck || 0)} vans/trucks`;

    const pendingVehicle = statusCounts.PENDING_VEHICLE;

    return {
      total,
      activeNow,
      pendingKyc,
      pendingVehicle,
      weightedAvgRating,
      vehicleBreakdownStr,
      isPendingKycAlert: pendingKyc > 0,
      isPendingVehicleAlert: pendingVehicle > 0,
    };
  }, [drivers, statusCounts]);

  // Filter & Sort drivers
  const filteredDrivers = useMemo(() => {
    let result = drivers;

    // Status filter
    if (statusFilter === 'ACTIVE') {
      result = result.filter((d) => d.status === 'ACTIVE');
    } else if (statusFilter === 'SUSPENDED') {
      result = result.filter((d) => d.status === 'SUSPENDED');
    } else if (statusFilter === 'PENDING_KYC') {
      result = result.filter((d) => d.kyc === 'SUBMITTED' || d.kyc === 'PENDING' || d.status === 'PENDING_KYC');
    } else if (statusFilter === 'PENDING_VEHICLE') {
      result = result.filter((d) => d.vehicleStatus === 'SUBMITTED' || d.vehicleStatus === 'PENDING');
    }

    // Vehicle type filter
    if (vehicleFilter !== 'ALL') {
      result = result.filter((d) => {
        const vType = d.vehicleType || parseVehicleType(d.vehicle);
        return vType === vehicleFilter;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q) ||
          d.vehicle?.toLowerCase().includes(q)
      );
    }

    // Sorting
    return [...result].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'rating') {
        valA = parseFloat(a.rating) || 0;
        valB = parseFloat(b.rating) || 0;
      } else if (sortField === 'completedDeliveries') {
        valA = a.completedDeliveries ?? a.assignedOrders?.length ?? 120;
        valB = b.completedDeliveries ?? b.assignedOrders?.length ?? 120;
      } else if (sortField === 'lastActive') {
        valA = a.lastActive || 'Online now';
        valB = b.lastActive || 'Online now';
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [drivers, statusFilter, vehicleFilter, searchQuery, sortField, sortDir]);

  // Pagination calculation
  const totalFiltered = filteredDrivers.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedDrivers = useMemo(() => {
    return filteredDrivers.slice(startIndex, startIndex + pageSize);
  }, [filteredDrivers, startIndex, pageSize]);

  // Handle Driver Suspension Toggle
  const handleToggleSuspend = () => {
    if (!suspendingDriver) return;
    const isSuspended = suspendingDriver.status === 'SUSPENDED';

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === suspendingDriver.id
          ? {
            ...d,
            status: isSuspended ? 'ACTIVE' : 'SUSPENDED',
          }
          : d
      )
    );

    setSuspendingDriver(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary KPI Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Total Drivers</p>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-foreground tabular-nums">{summaryStats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Registered couriers</p>
        </Card>

        <Card className="border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Active Now</p>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-emerald-400 tabular-nums">{summaryStats.activeNow}</p>
          <p className="mt-1 text-xs text-emerald-400/80 font-semibold">Online & ready for dispatch</p>
        </Card>

        {/* Pending KYC Reviews Stat Card - Highlighted if > 0 & links to filtered view */}
        <Card
          onClick={() => handleStatusTabChange('PENDING_KYC')}
          className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md ${summaryStats.isPendingKycAlert ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/40' : ''
            }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Pending KYC Reviews</p>
            <AlertTriangle
              className={`h-4 w-4 ${summaryStats.isPendingKycAlert ? 'text-amber-400 animate-pulse' : 'text-muted-foreground'}`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <p
              className={`mt-3 font-mono text-3xl font-extrabold tabular-nums ${summaryStats.isPendingKycAlert ? 'text-amber-400' : 'text-foreground'
                }`}
            >
              {summaryStats.pendingKyc}
            </p>
            {summaryStats.isPendingKycAlert && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Requires Action
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-amber-400/90 font-medium hover:underline">Click to view pending reviews →</p>
        </Card>

        {/* Pending Vehicle Verification Stat Card */}
        <Card
          onClick={() => handleStatusTabChange('PENDING_VEHICLE')}
          className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md ${summaryStats.isPendingVehicleAlert ? 'border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/40' : ''
            }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Pending Vehicles</p>
            <Truck
              className={`h-4 w-4 ${summaryStats.isPendingVehicleAlert ? 'text-sky-400 animate-pulse' : 'text-muted-foreground'}`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <p
              className={`mt-3 font-mono text-3xl font-extrabold tabular-nums ${summaryStats.isPendingVehicleAlert ? 'text-sky-400' : 'text-foreground'
                }`}
            >
              {summaryStats.pendingVehicle}
            </p>
            {summaryStats.isPendingVehicleAlert && (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                Vehicle Review
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-sky-400/90 font-medium hover:underline">Click to verify vehicles →</p>
        </Card>

        <Card className="border-border/80 p-5 shadow-xs bg-card/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Weighted Rating</p>
            <Star className="h-4 w-4 text-warning fill-warning" />
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <p className="font-mono text-3xl font-extrabold text-foreground tabular-nums">{summaryStats.weightedAvgRating}</p>
            <span className="text-warning font-bold text-sm">★</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Weighted by review volume</p>
        </Card>
      </div>

      {/* 2. Controls Bar: Filter Chips, Vehicle Filter, Scoped Search */}
      <Card className="p-4 space-y-4 border-border/80 bg-card/90 backdrop-blur-md">
        {/* Top Row: Status Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="mr-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filter Fleet:
            </span>

            {(['ALL', 'ACTIVE', 'PENDING_KYC', 'PENDING_VEHICLE', 'SUSPENDED'] as StatusFilter[]).map((st) => {
              const count = statusCounts[st];
              const isActive = statusFilter === st;

              let activeBg = 'bg-primary text-primary-foreground font-bold shadow-xs';
              if (st === 'ACTIVE') activeBg = 'bg-emerald-500 text-white font-bold shadow-xs';
              if (st === 'PENDING_KYC') activeBg = 'bg-amber-500 text-white font-bold shadow-xs';
              if (st === 'PENDING_VEHICLE') activeBg = 'bg-sky-500 text-white font-bold shadow-xs';
              if (st === 'SUSPENDED') activeBg = 'bg-destructive text-destructive-foreground font-bold shadow-xs';

              return (
                <button
                  key={st}
                  onClick={() => handleStatusTabChange(st)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all duration-200 cursor-pointer ${isActive ? activeBg : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'
                    }`}
                >
                  {(st === 'PENDING_KYC' || st === 'PENDING_VEHICLE') && count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                  <span>
                    {st === 'ALL'
                      ? 'All Drivers'
                      : st === 'PENDING_KYC'
                      ? 'Pending KYC'
                      : st === 'PENDING_VEHICLE'
                      ? 'Pending Vehicles'
                      : st}
                  </span>
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Vehicle Type:</span>
            <select
              value={vehicleFilter}
              onChange={(e) => handleVehicleChange(e.target.value as VehicleFilter)}
              className="h-9 rounded-xl border border-input bg-background/80 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="ALL">All Vehicles</option>
              <option value="Bike">Bikes 🏍️</option>
              <option value="Car">Cars 🚗</option>
              <option value="Van">Vans 🚐</option>
              <option value="Truck">Trucks 🚚</option>
            </select>
          </div>
        </div>

        {/* Bottom Row: Scoped Search Input & Pagination Limit Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search driver name, email, phone, plate..."
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
      </Card>

      {/* 3. Main Drivers Table */}
      <Card className="overflow-hidden border-border/80 shadow-sm bg-card/95 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              <tr>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    <span>Driver</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">KYC Review</th>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('rating')}>
                  <div className="flex items-center gap-1.5">
                    <span>Rating & Reviews</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>
                <th className="px-5 py-4">Vehicle Record</th>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('completedDeliveries')}>
                  <div className="flex items-center gap-1.5">
                    <span>Deliveries</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('lastActive')}>
                  <div className="flex items-center gap-1.5">
                    <span>Last Active</span>
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </th>

                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedDrivers.map((driver) => {
                const isPendingKyc = driver.kyc === 'SUBMITTED' || driver.kyc === 'PENDING' || driver.status === 'PENDING_KYC';
                const ratingNum = parseFloat(driver.rating) || 0;
                const isLowRating = ratingNum > 0 && ratingNum < 3.5;
                const reviewCount = driver.reviewCount ?? driver.reviews?.length ?? 0;
                const completedCount = driver.completedDeliveries ?? driver.assignedOrders?.length ?? 0;
                const lastActiveStr = driver.lastActive || (driver.status === 'ACTIVE' ? 'Online now' : '3h ago');
                const walletBal = driver.walletBalance || '₦38,500';
                const hasPendingPayout = driver.hasPendingPayout ?? (ratingNum > 4.2);

                return (
                  <tr
                    key={driver.id}
                    className={`transition-colors ${isPendingKyc
                      ? 'bg-amber-500/10 border-l-4 border-l-amber-500 hover:bg-amber-500/15'
                      : 'hover:bg-muted/30'
                      }`}
                  >
                    {/* Driver Avatar + Contact Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                          {driver.avatarUrl ? (
                            <img src={driver.avatarUrl} alt={driver.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(driver.name)
                          )}
                        </div>
                        <div>
                          <Link href={`/drivers/${driver.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">
                            {driver.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{driver.email} · {driver.phone}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      {driver.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                        </span>
                      ) : driver.status === 'SUSPENDED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>

                    {/* KYC Badge (Pulsing urgent styling if pending) */}
                    <td className="px-5 py-3.5">
                      {driver.kyc === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </span>
                      ) : driver.kyc === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                          Rejected
                        </span>
                      ) : (
                        <Link
                          href={`/drivers/${driver.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-xs font-extrabold text-amber-300 animate-pulse hover:bg-amber-500/30"
                          title="Click to review KYC documents"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Pending
                        </Link>
                      )}
                    </td>

                    {/* Rating with Context & Low Rating Warning */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground tabular-nums">{driver.rating}</span>
                        <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        <span className="text-xs text-muted-foreground font-medium">({reviewCount} reviews)</span>

                        {isLowRating && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive"
                            title="Low rating alert (< 3.5★)"
                          >
                            Low Rating
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Vehicle Record */}
                    <td className="px-5 py-3.5 text-xs font-medium">
                      <div className="space-y-1">
                        <div className="text-foreground font-medium">{driver.vehicle}</div>
                        {driver.vehicleStatus === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Vehicle Approved
                          </span>
                        ) : driver.vehicleStatus === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                            Vehicle Rejected
                          </span>
                        ) : (
                          <Link
                            href={`/drivers/${driver.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/20 px-2 py-0.5 text-[10px] font-extrabold text-sky-300 animate-pulse hover:bg-sky-500/30"
                            title="Click to review vehicle verification"
                          >
                            <Truck className="h-2.5 w-2.5 text-sky-300" /> Pending Approval
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Completed Deliveries */}
                    <td className="px-5 py-3.5 font-mono font-semibold tabular-nums text-foreground">{completedCount}</td>

                    {/* Last Active */}
                    <td className="px-5 py-3.5 text-xs font-medium">
                      {lastActiveStr === 'Online now' ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online now
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{lastActiveStr}</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(driver.vehicleStatus === 'SUBMITTED' || driver.vehicleStatus === 'PENDING') && (
                          <Link
                            href={`/drivers/${driver.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-xs font-bold text-sky-400 transition-all hover:bg-sky-500/20 shadow-2xs"
                          >
                            Verify Vehicle
                          </Link>
                        )}
                        <Link
                          href={`/drivers/${driver.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted hover:border-primary/40 shadow-2xs"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedDrivers.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">No driver records found matching current filters.</p>
                    <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or selecting &quot;All Drivers&quot;.</p>
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
            <span className="font-mono font-bold text-foreground">{totalFiltered}</span> drivers
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

      {/* 5. Suspension / Reactivation Modal Confirmation */}
      {suspendingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground font-extrabold text-base">
                <ShieldAlert className="h-5 w-5 text-warning" />
                {suspendingDriver.status === 'SUSPENDED' ? 'Reactivate Driver' : 'Suspend Driver'}
              </div>
              <button onClick={() => setSuspendingDriver(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {suspendingDriver.status === 'SUSPENDED'
                ? `Are you sure you want to reactivate ${suspendingDriver.name}? They will immediately be restored to the active fleet for job dispatch.`
                : `Are you sure you want to suspend ${suspendingDriver.name}? Their active orders will be unassigned and they will be barred from accepting new jobs.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspendingDriver(null)}
                className="rounded-xl border border-border bg-muted/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspend}
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs ${suspendingDriver.status === 'SUSPENDED'
                  ? 'border-emerald-500/40 bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'border-destructive/40 bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  }`}
              >
                Confirm {suspendingDriver.status === 'SUSPENDED' ? 'Reactivation' : 'Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
