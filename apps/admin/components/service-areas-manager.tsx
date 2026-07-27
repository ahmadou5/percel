'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Upload,
  FileSpreadsheet,
  History,
  Truck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Info,
  Sliders,
  DollarSign,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminServiceArea, AdminInterstateRoute, PricingAuditRecord } from '@/lib/admin-data';

// Initial Mock Seed Data for Cities if API returns empty
const DEFAULT_AREAS: AdminServiceArea[] = [
  {
    id: 'sa-kano',
    city: 'Kano',
    state: 'Kano',
    active: true,
    baseFareNgn: 500,
    perKmNgn: 100,
    minFareNgn: 700,
    maxFareNgn: 15000,
    driverCount: 12,
    recentOrdersCount: 48,
    activeOrdersCount: 3,
    auditHistory: [
      {
        id: 'aud-1',
        serviceAreaId: 'sa-kano',
        cityName: 'Kano',
        adminName: 'Super Admin',
        field: 'Base Fare',
        oldValue: 400,
        newValue: 500,
        timestamp: 'Jul 24, 2026, 02:15 PM',
      },
      {
        id: 'aud-2',
        serviceAreaId: 'sa-kano',
        cityName: 'Kano',
        adminName: 'Operations Lead',
        field: 'Per KM Rate',
        oldValue: 80,
        newValue: 100,
        timestamp: 'Jul 20, 2026, 11:30 AM',
      },
    ],
  },
  {
    id: 'sa-lagos',
    city: 'Lagos Island',
    state: 'Lagos',
    active: true,
    baseFareNgn: 1000,
    perKmNgn: 150,
    minFareNgn: 1200,
    maxFareNgn: 30000,
    driverCount: 45,
    recentOrdersCount: 210,
    activeOrdersCount: 14,
    auditHistory: [
      {
        id: 'aud-3',
        serviceAreaId: 'sa-lagos',
        cityName: 'Lagos Island',
        adminName: 'Super Admin',
        field: 'Base Fare',
        oldValue: 800,
        newValue: 1000,
        timestamp: 'Jul 22, 2026, 09:00 AM',
      },
    ],
  },
  {
    id: 'sa-abuja',
    city: 'Abuja Central',
    state: 'FCT',
    active: true,
    baseFareNgn: 800,
    perKmNgn: 120,
    minFareNgn: 1000,
    maxFareNgn: 20000,
    driverCount: 18,
    recentOrdersCount: 95,
    activeOrdersCount: 5,
    auditHistory: [],
  },
  {
    id: 'sa-ph',
    city: 'Port Harcourt',
    state: 'Rivers',
    active: false,
    baseFareNgn: 700,
    perKmNgn: 110,
    minFareNgn: 800,
    maxFareNgn: 18000,
    driverCount: 0,
    recentOrdersCount: 0,
    activeOrdersCount: 0,
    auditHistory: [],
  },
];

// Initial Interstate Route Rates
const DEFAULT_INTERSTATE_ROUTES: AdminInterstateRoute[] = [
  { id: 'ir-1', originState: 'Lagos', destinationState: 'FCT (Abuja)', baseFareNgn: 15000, perKmNgn: 85, estHours: 24, active: true },
  { id: 'ir-2', originState: 'Lagos', destinationState: 'Kano', baseFareNgn: 22000, perKmNgn: 90, estHours: 48, active: true },
  { id: 'ir-3', originState: 'Kano', destinationState: 'FCT (Abuja)', baseFareNgn: 12000, perKmNgn: 75, estHours: 18, active: true },
  { id: 'ir-4', originState: 'Lagos', destinationState: 'Rivers (Port Harcourt)', baseFareNgn: 18000, perKmNgn: 80, estHours: 36, active: true },
];

export function ServiceAreasManager({ initialAreas }: { initialAreas: AdminServiceArea[] }) {
  // Merge initial API areas with fallback default areas if empty
  const [areas, setAreas] = useState<AdminServiceArea[]>(
    initialAreas && initialAreas.length > 0 ? initialAreas : DEFAULT_AREAS
  );
  const [interstateRoutes, setInterstateRoutes] = useState<AdminInterstateRoute[]>(DEFAULT_INTERSTATE_ROUTES);

  // Active Tab: 'intra' | 'interstate' | 'audit'
  const [activeTab, setActiveTab] = useState<'intra' | 'interstate' | 'audit'>('intra');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Form State for Intra-State Area (Create / Edit)
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [baseFareNgn, setBaseFareNgn] = useState<number | ''>(500);
  const [perKmNgn, setPerKmNgn] = useState<number | ''>(100);
  const [minFareNgn, setMinFareNgn] = useState<number | ''>(700);
  const [maxFareNgn, setMaxFareNgn] = useState<number | ''>(15000);
  const [active, setActive] = useState(true);

  // Inline Validation Errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Expandable Row Audit History State
  const [expandedAuditRow, setExpandedAuditRow] = useState<string | null>(null);

  // Deactivation Confirmation Modal State
  const [deactivatingArea, setDeactivatingArea] = useState<AdminServiceArea | null>(null);

  // Bulk CSV Import Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<{ city: string; state: string; baseFare: number; perKm: number; valid: boolean; error?: string }>>([]);

  // Interstate Form State
  const [interOrigin, setInterOrigin] = useState('');
  const [interDest, setInterDest] = useState('');
  const [interBase, setInterBase] = useState<number | ''>(15000);
  const [interPerKm, setInterPerKm] = useState<number | ''>(85);
  const [interEstHours, setInterEstHours] = useState<number | ''>(24);

  // Reset Intra-State Form
  const resetForm = () => {
    setCity('');
    setState('');
    setBaseFareNgn(500);
    setPerKmNgn(100);
    setMinFareNgn(700);
    setMaxFareNgn(15000);
    setActive(true);
    setIsEditingId(null);
    setValidationErrors({});
    setGeneralError(null);
  };

  // Populate Form for Editing
  const handleEditClick = (area: AdminServiceArea) => {
    setIsEditingId(area.id);
    setCity(area.city);
    setState(area.state);
    setBaseFareNgn(area.baseFareNgn);
    setPerKmNgn(area.perKmNgn);
    setMinFareNgn(area.minFareNgn ?? 0);
    setMaxFareNgn(area.maxFareNgn ?? 0);
    setActive(area.active);
    setValidationErrors({});
    setGeneralError(null);
  };

  // Calculate Live Pricing Preview (5km, 10km, 20km)
  const previewPricing = useMemo(() => {
    const base = typeof baseFareNgn === 'number' ? baseFareNgn : 0;
    const perKm = typeof perKmNgn === 'number' ? perKmNgn : 0;
    const min = typeof minFareNgn === 'number' && minFareNgn > 0 ? minFareNgn : 0;
    const max = typeof maxFareNgn === 'number' && maxFareNgn > 0 ? maxFareNgn : Infinity;

    const calc = (km: number) => {
      const raw = base + km * perKm;
      if (raw < min) return { amount: min, capped: 'min' };
      if (raw > max) return { amount: max, capped: 'max' };
      return { amount: raw, capped: null };
    };

    return {
      km5: calc(5),
      km10: calc(10),
      km20: calc(20),
    };
  }, [baseFareNgn, perKmNgn, minFareNgn, maxFareNgn]);

  // Form Submit Handler with Strict Validation (Order #1)
  const handleSubmitIntraState = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const numBase = typeof baseFareNgn === 'number' ? baseFareNgn : Number(baseFareNgn);
    const numPerKm = typeof perKmNgn === 'number' ? perKmNgn : Number(perKmNgn);
    const numMin = typeof minFareNgn === 'number' ? minFareNgn : Number(minFareNgn);
    const numMax = typeof maxFareNgn === 'number' ? maxFareNgn : Number(maxFareNgn);

    if (!trimmedCity) errors.city = 'City name is required';
    if (!trimmedState) errors.state = 'State name is required';

    if (isNaN(numBase) || numBase <= 0) {
      errors.baseFareNgn = 'Base Fare must be greater than ₦0';
    }
    if (isNaN(numPerKm) || numPerKm <= 0) {
      errors.perKmNgn = 'Per KM Rate must be greater than ₦0';
    }
    if (numMin < 0) {
      errors.minFareNgn = 'Min Fare cannot be negative';
    }
    if (numMax > 0 && numMin > numMax) {
      errors.minFareNgn = 'Min Fare cannot exceed Max Fare';
    }

    // Check Duplicate City+State (case insensitive)
    const duplicate = areas.find(
      (a) =>
        a.id !== isEditingId &&
        a.city.toLowerCase().trim() === trimmedCity.toLowerCase() &&
        a.state.toLowerCase().trim() === trimmedState.toLowerCase()
    );
    if (duplicate) {
      errors.city = `A service area for "${trimmedCity}, ${trimmedState}" already exists.`;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Save or Update with Audit Logging (Order #2)
    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

    if (isEditingId) {
      // Edit existing area & log rate audit
      setAreas((prev) =>
        prev.map((item) => {
          if (item.id !== isEditingId) return item;

          const auditEntries: PricingAuditRecord[] = [...(item.auditHistory || [])];

          if (item.baseFareNgn !== numBase) {
            auditEntries.unshift({
              id: `aud-${Date.now()}-1`,
              serviceAreaId: item.id,
              cityName: item.city,
              adminName: 'Operations Admin',
              field: 'Base Fare',
              oldValue: item.baseFareNgn,
              newValue: numBase,
              timestamp: nowStr,
            });
          }
          if (item.perKmNgn !== numPerKm) {
            auditEntries.unshift({
              id: `aud-${Date.now()}-2`,
              serviceAreaId: item.id,
              cityName: item.city,
              adminName: 'Operations Admin',
              field: 'Per KM Rate',
              oldValue: item.perKmNgn,
              newValue: numPerKm,
              timestamp: nowStr,
            });
          }
          if (item.active !== active) {
            auditEntries.unshift({
              id: `aud-${Date.now()}-3`,
              serviceAreaId: item.id,
              cityName: item.city,
              adminName: 'Operations Admin',
              field: 'Status',
              oldValue: item.active ? 'Active' : 'Inactive',
              newValue: active ? 'Active' : 'Inactive',
              timestamp: nowStr,
            });
          }

          return {
            ...item,
            city: trimmedCity,
            state: trimmedState,
            baseFareNgn: numBase,
            perKmNgn: numPerKm,
            minFareNgn: numMin > 0 ? numMin : undefined,
            maxFareNgn: numMax > 0 ? numMax : undefined,
            active,
            auditHistory: auditEntries,
          };
        })
      );
    } else {
      // Create new service area
      const newArea: AdminServiceArea = {
        id: `sa-${Date.now()}`,
        city: trimmedCity,
        state: trimmedState,
        baseFareNgn: numBase,
        perKmNgn: numPerKm,
        minFareNgn: numMin > 0 ? numMin : undefined,
        maxFareNgn: numMax > 0 ? numMax : undefined,
        active,
        driverCount: 0,
        recentOrdersCount: 0,
        activeOrdersCount: 0,
        auditHistory: [
          {
            id: `aud-${Date.now()}`,
            serviceAreaId: `sa-${Date.now()}`,
            cityName: trimmedCity,
            adminName: 'Operations Admin',
            field: 'Service Area Created',
            oldValue: 'N/A',
            newValue: `Base ₦${numBase}, PerKM ₦${numPerKm}`,
            timestamp: nowStr,
          },
        ],
      };
      setAreas((prev) => [newArea, ...prev]);
    }

    resetForm();
  };

  // Toggle Active with Warning Dialog for active orders (Order #4)
  const handleToggleActiveClick = (area: AdminServiceArea) => {
    // If turning off and city has active orders or drivers, show confirmation dialog
    if (area.active && ((area.activeOrdersCount || 0) > 0 || area.driverCount > 0)) {
      setDeactivatingArea(area);
      return;
    }

    // Direct toggle if no warning needed
    toggleAreaStatus(area.id);
  };

  const toggleAreaStatus = (id: string) => {
    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
    setAreas((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextActive = !item.active;

        const auditEntries: PricingAuditRecord[] = [
          {
            id: `aud-${Date.now()}`,
            serviceAreaId: item.id,
            cityName: item.city,
            adminName: 'Operations Admin',
            field: 'Status',
            oldValue: item.active ? 'Active' : 'Inactive',
            newValue: nextActive ? 'Active' : 'Inactive',
            timestamp: nowStr,
          },
          ...(item.auditHistory || []),
        ];

        return { ...item, active: nextActive, auditHistory: auditEntries };
      })
    );
    setDeactivatingArea(null);
  };

  // Parse CSV for Bulk Import (Order #5)
  const handleParseCsv = (rawText: string) => {
    setCsvRawText(rawText);
    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    const rows: Array<{ city: string; state: string; baseFare: number; perKm: number; valid: boolean; error?: string }> = [];

    lines.forEach((line, index) => {
      // Skip header row if contains "city"
      if (index === 0 && line.toLowerCase().includes('city')) return;

      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 4) {
        rows.push({ city: cols[0] || 'Unknown', state: cols[1] || 'Unknown', baseFare: 0, perKm: 0, valid: false, error: 'Expected at least 4 columns (City, State, BaseFare, PerKmRate)' });
        return;
      }

      const rowCity = cols[0];
      const rowState = cols[1];
      const rowBase = parseFloat(cols[2]);
      const rowPerKm = parseFloat(cols[3]);

      if (!rowCity || !rowState) {
        rows.push({ city: rowCity || 'Empty', state: rowState || 'Empty', baseFare: rowBase, perKm: rowPerKm, valid: false, error: 'City and State are required' });
        return;
      }
      if (isNaN(rowBase) || rowBase <= 0) {
        rows.push({ city: rowCity, state: rowState, baseFare: rowBase, perKm: rowPerKm, valid: false, error: 'Base Fare must be > 0' });
        return;
      }
      if (isNaN(rowPerKm) || rowPerKm <= 0) {
        rows.push({ city: rowCity, state: rowState, baseFare: rowBase, perKm: rowPerKm, valid: false, error: 'Per KM Rate must be > 0' });
        return;
      }

      rows.push({ city: rowCity, state: rowState, baseFare: rowBase, perKm: rowPerKm, valid: true });
    });

    setCsvPreviewRows(rows);
  };

  const handleCommitCsvImport = () => {
    const validRows = csvPreviewRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
    const newAreas: AdminServiceArea[] = validRows.map((r, i) => ({
      id: `sa-csv-${Date.now()}-${i}`,
      city: r.city,
      state: r.state,
      baseFareNgn: r.baseFare,
      perKmNgn: r.perKm,
      active: true,
      driverCount: 0,
      recentOrdersCount: 0,
      activeOrdersCount: 0,
      auditHistory: [
        {
          id: `aud-csv-${Date.now()}-${i}`,
          serviceAreaId: `sa-csv-${Date.now()}-${i}`,
          cityName: r.city,
          adminName: 'Operations Admin (Bulk CSV)',
          field: 'Bulk Imported',
          oldValue: 'N/A',
          newValue: `Base ₦${r.baseFare}, PerKM ₦${r.perKm}`,
          timestamp: nowStr,
        },
      ],
    }));

    setAreas((prev) => [...newAreas, ...prev]);
    setIsCsvModalOpen(false);
    setCsvRawText('');
    setCsvPreviewRows([]);
  };

  // Add Interstate Route Handler
  const handleAddInterstateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interOrigin || !interDest || !interBase || !interPerKm) return;

    const newRoute: AdminInterstateRoute = {
      id: `ir-${Date.now()}`,
      originState: interOrigin.trim(),
      destinationState: interDest.trim(),
      baseFareNgn: Number(interBase),
      perKmNgn: Number(interPerKm),
      estHours: Number(interEstHours || 24),
      active: true,
    };
    setInterstateRoutes((prev) => [newRoute, ...prev]);
    setInterOrigin('');
    setInterDest('');
    setInterBase(15000);
    setInterPerKm(85);
    setInterEstHours(24);
  };

  // Filtered Areas
  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      if (statusFilter === 'ACTIVE' && !a.active) return false;
      if (statusFilter === 'INACTIVE' && a.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return a.city.toLowerCase().includes(q) || a.state.toLowerCase().includes(q);
      }
      return true;
    });
  }, [areas, statusFilter, searchQuery]);

  // Aggregate Audit Records across all areas
  const globalAuditLogs = useMemo(() => {
    const logs: PricingAuditRecord[] = [];
    areas.forEach((a) => {
      if (a.auditHistory) logs.push(...a.auditHistory);
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [areas]);

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('intra')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'intra'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Intra-State Cities ({areas.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interstate')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'interstate'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Truck className="h-4 w-4" />
            Interstate Routes ({interstateRoutes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <History className="h-4 w-4" />
            Pricing History ({globalAuditLogs.length})
          </button>
        </div>

        {/* Action Button: Bulk Import CSV */}
        {activeTab === 'intra' && (
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            <Upload className="h-3.5 w-3.5 text-primary" />
            Bulk Import CSV
          </button>
        )}
      </div>

      {/* TAB 1: INTRA-STATE CITIES MANAGEMENT */}
      {activeTab === 'intra' && (
        <div className="space-y-6">
          {/* Form & Live Pricing Preview Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Form Section (Order #1: Form Validation) */}
            <Card className="lg:col-span-2 p-5 border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Sliders className="h-4 w-4 text-primary" />
                  {isEditingId ? 'Edit Local Service Area Rate' : 'Create New Local Service Area'}
                </h3>
                {isEditingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel Edit
                  </button>
                )}
              </div>

              {generalError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSubmitIntraState} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* City */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (validationErrors.city) setValidationErrors((prev) => ({ ...prev, city: '' }));
                      }}
                      className={`w-full rounded-xl border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                        validationErrors.city
                          ? 'border-rose-500 focus:ring-rose-500/20'
                          : 'border-border focus:ring-primary/20 focus:border-primary'
                      }`}
                      placeholder="e.g. Kano"
                    />
                    {validationErrors.city && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500">{validationErrors.city}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        if (validationErrors.state) setValidationErrors((prev) => ({ ...prev, state: '' }));
                      }}
                      className={`w-full rounded-xl border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                        validationErrors.state
                          ? 'border-rose-500 focus:ring-rose-500/20'
                          : 'border-border focus:ring-primary/20 focus:border-primary'
                      }`}
                      placeholder="e.g. Kano"
                    />
                    {validationErrors.state && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500">{validationErrors.state}</p>
                    )}
                  </div>

                  {/* Base Fare (₦) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Base Fare (₦) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">₦</span>
                      <input
                        type="number"
                        min="1"
                        value={baseFareNgn}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setBaseFareNgn(val);
                          if (validationErrors.baseFareNgn) setValidationErrors((prev) => ({ ...prev, baseFareNgn: '' }));
                        }}
                        className={`w-full rounded-xl border bg-background/50 pl-8 pr-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                          validationErrors.baseFareNgn
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-border focus:ring-primary/20 focus:border-primary'
                        }`}
                        placeholder="500"
                      />
                    </div>
                    {validationErrors.baseFareNgn && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500">{validationErrors.baseFareNgn}</p>
                    )}
                  </div>

                  {/* Per KM Rate (₦) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Per KM Rate (₦) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">₦</span>
                      <input
                        type="number"
                        min="1"
                        value={perKmNgn}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setPerKmNgn(val);
                          if (validationErrors.perKmNgn) setValidationErrors((prev) => ({ ...prev, perKmNgn: '' }));
                        }}
                        className={`w-full rounded-xl border bg-background/50 pl-8 pr-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                          validationErrors.perKmNgn
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-border focus:ring-primary/20 focus:border-primary'
                        }`}
                        placeholder="100"
                      />
                    </div>
                    {validationErrors.perKmNgn && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500">{validationErrors.perKmNgn}</p>
                    )}
                  </div>

                  {/* Min Fare (₦) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Min Fare Floor (₦) <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">₦</span>
                      <input
                        type="number"
                        min="0"
                        value={minFareNgn}
                        onChange={(e) => setMinFareNgn(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-xl border border-border bg-background/50 pl-8 pr-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="700"
                      />
                    </div>
                    {validationErrors.minFareNgn && (
                      <p className="mt-1 text-[11px] font-medium text-rose-500">{validationErrors.minFareNgn}</p>
                    )}
                  </div>

                  {/* Max Fare (₦) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Max Fare Cap (₦) <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">₦</span>
                      <input
                        type="number"
                        min="0"
                        value={maxFareNgn}
                        onChange={(e) => setMaxFareNgn(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-xl border border-border bg-background/50 pl-8 pr-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="15000"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/70">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-foreground">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded border-border bg-background text-primary focus:ring-primary/20 h-4 w-4"
                    />
                    Enable Active Service Area
                  </label>

                  <div className="flex items-center gap-2">
                    {isEditingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
                    >
                      {isEditingId ? 'Update Rate' : 'Save Service Area'}
                    </button>
                  </div>
                </div>
              </form>
            </Card>

            {/* Live Pricing Preview Widget (Order #1: Live Preview) */}
            <Card className="p-5 border-border/80 bg-muted/20 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Live Price Preview
                  </h4>
                  <span className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 font-bold">
                    Sanity Check
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Formula: <code className="font-mono text-foreground font-bold">Base + (Dist × PerKM)</code>
                </p>

                <div className="mt-4 space-y-3 font-mono">
                  {/* 5 KM Preview */}
                  <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground font-sans">Short trip (5 km):</span>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        ₦{baseFareNgn || 0} + (5 × ₦{perKmNgn || 0})
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      ₦{previewPricing.km5.amount.toLocaleString()}
                    </span>
                  </div>

                  {/* 10 KM Preview */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-primary font-sans">Medium trip (10 km):</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        ₦{baseFareNgn || 0} + (10 × ₦{perKmNgn || 0})
                      </p>
                    </div>
                    <span className="text-base font-bold text-primary">
                      ₦{previewPricing.km10.amount.toLocaleString()}
                    </span>
                  </div>

                  {/* 20 KM Preview */}
                  <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground font-sans">Long trip (20 km):</span>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        ₦{baseFareNgn || 0} + (20 × ₦{perKmNgn || 0})
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      ₦{previewPricing.km20.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-3 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 text-primary inline mr-1" />
                Rates affect all new intra-state same-day order estimates in{' '}
                <strong className="text-foreground">{city || 'selected city'}</strong>.
              </div>
            </Card>
          </div>

          {/* Service Areas Table Controls & Search */}
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="border-b border-border bg-card p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search city or state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All Areas ({areas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'ACTIVE'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  Active Only ({areas.filter((a) => a.active).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'INACTIVE'
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  Inactive ({areas.filter((a) => !a.active).length})
                </button>
              </div>
            </div>

            {/* Table Content (Order #3: Table Columns) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">City</th>
                    <th className="px-5 py-3.5">State</th>
                    <th className="px-5 py-3.5">Base Fare</th>
                    <th className="px-5 py-3.5">Per KM Rate</th>
                    <th className="px-5 py-3.5">Min / Max Cap</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Active Drivers</th>
                    <th className="px-5 py-3.5">Recent Orders (7d)</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAreas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No service areas found matching your query.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAreas.map((area) => {
                      const isExpanded = expandedAuditRow === area.id;
                      const hasAuditLogs = area.auditHistory && area.auditHistory.length > 0;

                      return (
                        <tr key={area.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-foreground">
                            {area.city}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {area.state}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold tabular-nums">
                            ₦{area.baseFareNgn.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold tabular-nums">
                            ₦{area.perKmNgn.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                            {area.minFareNgn || area.maxFareNgn ? (
                              <span>
                                ₦{(area.minFareNgn || 0).toLocaleString()} – ₦{(area.maxFareNgn || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">No Cap</span>
                            )}
                          </td>

                          {/* Color-Coded Active Status Badge */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleActiveClick(area)}
                              className="focus:outline-none"
                            >
                              {area.active ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium hover:bg-emerald-500/20 cursor-pointer">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-muted text-muted-foreground border-border font-medium hover:bg-muted/80 cursor-pointer">
                                  Inactive
                                </Badge>
                              )}
                            </button>
                          </td>

                          {/* Active Drivers Link */}
                          <td className="px-5 py-3.5 font-mono">
                            <Link
                              href={`/drivers?q=${encodeURIComponent(area.city)}`}
                              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                            >
                              {area.driverCount} drivers
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>

                          {/* Recent Orders Count */}
                          <td className="px-5 py-3.5 font-mono tabular-nums text-foreground">
                            <span className="font-bold">{area.recentOrdersCount ?? 0}</span> orders
                          </td>

                          {/* Actions & Expandable Audit Log Toggle */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                            {hasAuditLogs && (
                              <button
                                type="button"
                                onClick={() => setExpandedAuditRow(isExpanded ? null : area.id)}
                                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 border border-border px-2 py-1 rounded-md bg-background"
                              >
                                History ({area.auditHistory?.length})
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleEditClick(area)}
                              className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: INTERSTATE ROUTES MANAGEMENT */}
      {activeTab === 'interstate' && (
        <div className="space-y-6">
          <Card className="p-5 border-border/80 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Truck className="h-4 w-4 text-primary" />
              Configure State-to-State Interstate Freight Rates
            </h3>

            <form onSubmit={handleAddInterstateRoute} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Origin State</label>
                <input
                  type="text"
                  required
                  value={interOrigin}
                  onChange={(e) => setInterOrigin(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm"
                  placeholder="e.g. Lagos"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Destination State</label>
                <input
                  type="text"
                  required
                  value={interDest}
                  onChange={(e) => setInterDest(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm"
                  placeholder="e.g. FCT (Abuja)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Interstate Base (₦)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={interBase}
                  onChange={(e) => setInterBase(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm font-mono"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Per KM Surcharge (₦)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={interPerKm}
                  onChange={(e) => setInterPerKm(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm font-mono"
                  placeholder="85"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Route
                </button>
              </div>
            </form>
          </Card>

          {/* Interstate Routes Table */}
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Origin → Destination</th>
                    <th className="px-5 py-3.5">Interstate Base Fare</th>
                    <th className="px-5 py-3.5">Per KM Surcharge</th>
                    <th className="px-5 py-3.5">Est. Transit Time</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {interstateRoutes.map((route) => (
                    <tr key={route.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3.5 font-semibold text-foreground flex items-center gap-2">
                        {route.originState} <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> {route.destinationState}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold">₦{route.baseFareNgn.toLocaleString()}</td>
                      <td className="px-5 py-3.5 font-mono">₦{route.perKmNgn.toLocaleString()} / km</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{route.estHours} hours</td>
                      <td className="px-5 py-3.5">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Active Route
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: GLOBAL PRICING HISTORY AUDIT LOG */}
      {activeTab === 'audit' && (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <div className="p-4 border-b border-border bg-card">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <History className="h-4 w-4 text-primary" />
              Audit Log of Rate Changes
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">Admin Actor</th>
                  <th className="px-5 py-3">Field Modified</th>
                  <th className="px-5 py-3">Previous Value</th>
                  <th className="px-5 py-3">New Value</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono">
                {globalAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground font-sans">
                      No pricing edits recorded yet.
                    </td>
                  </tr>
                ) : (
                  globalAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-semibold font-sans text-foreground">{log.cityName}</td>
                      <td className="px-5 py-3 font-sans text-muted-foreground">{log.adminName}</td>
                      <td className="px-5 py-3 font-semibold text-primary">{log.field}</td>
                      <td className="px-5 py-3 text-rose-500">{String(log.oldValue)}</td>
                      <td className="px-5 py-3 text-emerald-500 font-bold">{String(log.newValue)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{log.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ACTIVE TOGGLE CONFIRMATION MODAL (Order #4) */}
      {deactivatingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Deactivate Service Area — {deactivatingArea.city}?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This city currently has{' '}
                  <strong className="text-foreground font-mono">{deactivatingArea.activeOrdersCount || 0} active order(s)</strong>{' '}
                  and <strong className="text-foreground font-mono">{deactivatingArea.driverCount} connected driver(s)</strong>.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                  Deactivating will not cancel existing in-transit orders, but will immediately stop new customer order creation in {deactivatingArea.city}.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeactivatingArea(null)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => toggleAreaStatus(deactivatingArea.id)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs"
              >
                Deactivate Service Area
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CSV IMPORT MODAL (Order #5) */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Bulk Import Service Areas via CSV
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Format: <code className="font-mono bg-muted px-1 py-0.5 rounded">City, State, BaseFare, PerKmRate</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(null as any)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Paste CSV Contents or Load Sample
              </label>
              <textarea
                rows={5}
                value={csvRawText}
                onChange={(e) => handleParseCsv(e.target.value)}
                placeholder={`City, State, BaseFare, PerKmRate\nKaduna, Kaduna, 600, 110\nIbadan, Oyo, 750, 120\nEnugu, Enugu, 650, 105`}
                className="w-full rounded-xl border border-border bg-background/50 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() =>
                    handleParseCsv(
                      `City, State, BaseFare, PerKmRate\nKaduna, Kaduna, 600, 110\nIbadan, Oyo, 750, 120\nEnugu, Enugu, 650, 105\nAsaba, Delta, 700, 115`
                    )
                  }
                  className="text-primary font-medium hover:underline"
                >
                  Load Sample Cities CSV
                </button>
                <span className="text-muted-foreground">
                  {csvPreviewRows.filter((r) => r.valid).length} valid rows found
                </span>
              </div>
            </div>

            {/* CSV Import Preview Table */}
            {csvPreviewRows.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden text-xs max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/60 uppercase text-[10px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">City</th>
                      <th className="px-3 py-2">State</th>
                      <th className="px-3 py-2">Base Fare</th>
                      <th className="px-3 py-2">Per KM</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono">
                    {csvPreviewRows.map((r, i) => (
                      <tr key={i} className={r.valid ? 'bg-emerald-500/[0.04]' : 'bg-rose-500/[0.06]'}>
                        <td className="px-3 py-2 font-sans font-medium">{r.city}</td>
                        <td className="px-3 py-2 font-sans">{r.state}</td>
                        <td className="px-3 py-2 font-bold">₦{r.baseFare}</td>
                        <td className="px-3 py-2 font-bold">₦{r.perKm}</td>
                        <td className="px-3 py-2">
                          {r.valid ? (
                            <span className="text-emerald-600 font-semibold font-sans">Valid</span>
                          ) : (
                            <span className="text-rose-600 font-semibold font-sans">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={csvPreviewRows.filter((r) => r.valid).length === 0}
                onClick={handleCommitCsvImport}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                Commit {csvPreviewRows.filter((r) => r.valid).length} Cities
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
