'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  User,
  MessageSquare,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  History,
  UserX,
  BadgeAlert,
  Tag,
  Image,
  Flame,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = {
  sender: string;
  senderId: string;
  role: 'USER' | 'DRIVER' | 'SYSTEM';
  text: string;
  at: string;
};

type DisputeEvidence = {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string;
};

type ResolvedDispute = {
  id: string;
  trackingCode: string;
  customerName: string;
  driverName: string;
  outcome: 'REFUNDED' | 'NO_REFUND';
  refundAmount?: string;
  resolvedBy: string;
  resolvedAt: string;
  reason: string;
  openDuration: string;
};

type Dispute = {
  id: string;
  orderId: string;
  trackingCode: string;
  orderValue: string;
  rawOrderValue: number;
  customerName: string;
  customerId: string;
  customerPhone: string;
  driverName: string;
  driverId: string | null;
  driverPhone: string;
  reason: string;
  category: 'Late Delivery' | 'Damaged Package' | 'Wrong Item' | 'Driver Conduct' | 'Payment Issue' | 'Other';
  status: 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED';
  openedAt: string;
  openedMinutesAgo: number;
  chatMessages: ChatMessage[];
  evidence: DisputeEvidence[];
  customerPriorDisputes: number;
  driverPriorDisputes: number;
  assignedTo: string | null;
};

type AuditLog = {
  id: string;
  adminName: string;
  action: string;
  target: string;
  amount?: string;
  reason: string;
  timestamp: string;
};

// ─── Category badge styling ────────────────────────────────────────────────
function getCategoryStyle(cat: Dispute['category']): string {
  switch (cat) {
    case 'Late Delivery': return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    case 'Damaged Package': return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
    case 'Wrong Item': return 'border-purple-500/30 bg-purple-500/10 text-purple-400';
    case 'Driver Conduct': return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
    case 'Payment Issue': return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    default: return 'border-border text-muted-foreground bg-muted/40';
  }
}

// ─── Time-open indicator color ─────────────────────────────────────────────
function getTimeOpenStyle(minutes: number): string {
  if (minutes < 60) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (minutes < 240) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
}

const CURRENT_ADMIN = 'Admin Operator';

const SUSPEND_REASONS = [
  'Dispute-related misconduct',
  'Verified delivery failure',
  'Customer complaint pattern',
  'Policy violation',
  'Other',
];

const RESOLVE_REASONS = [
  'Verified — driver at fault',
  'Verified — issue resolved without refund',
  'Duplicate dispute',
  'No evidence of fault',
  'Mutual agreement reached',
  'Other',
];

const DISPUTE_CATEGORIES: Dispute['category'][] = [
  'Late Delivery',
  'Damaged Package',
  'Wrong Item',
  'Driver Conduct',
  'Payment Issue',
  'Other',
];

// ─── Component ────────────────────────────────────────────────────────────────
export function DisputeDeskView({
  initialDisputes,
}: {
  initialDisputes: Dispute[];
}) {
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes);
  const [resolvedHistory, setResolvedHistory] = useState<ResolvedDispute[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filter / search state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'MINE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals
  const [refundModal, setRefundModal] = useState<Dispute | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refunding, setRefunding] = useState(false);

  const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
  const [resolveReason, setResolveReason] = useState(RESOLVE_REASONS[0]);
  const [resolveReasonCustom, setResolveReasonCustom] = useState('');
  const [resolving, setResolving] = useState(false);

  const [suspendModal, setSuspendModal] = useState<Dispute | null>(null);
  const [suspendReason, setSuspendReason] = useState(SUSPEND_REASONS[0]);
  const [suspendReasonCustom, setSuspendReasonCustom] = useState('');
  const [suspending, setSuspending] = useState(false);

  const [lightboxEvidence, setLightboxEvidence] = useState<DisputeEvidence | null>(null);
  const [editingCategoryFor, setEditingCategoryFor] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const addAuditLog = (action: string, target: string, reason: string, amount?: string) => {
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        adminName: CURRENT_ADMIN,
        action,
        target,
        amount,
        reason,
        timestamp: 'Just now',
      },
      ...prev,
    ]);
  };

  // ─── Derived Stats ──────────────────────────────────────────────────────────
  const openDisputes = useMemo(() => disputes.filter((d) => d.status !== 'RESOLVED'), [disputes]);
  const escalatedCount = useMemo(() => disputes.filter((d) => d.status === 'ESCALATED').length, [disputes]);

  // ─── Filtered Disputes ──────────────────────────────────────────────────────
  const filteredDisputes = useMemo(() => {
    let list = [...disputes];

    // Sort escalated to top
    list.sort((a, b) => {
      if (a.status === 'ESCALATED' && b.status !== 'ESCALATED') return -1;
      if (b.status === 'ESCALATED' && a.status !== 'ESCALATED') return 1;
      return b.openedMinutesAgo - a.openedMinutesAgo;
    });

    if (statusFilter !== 'ALL') list = list.filter((d) => d.status === statusFilter);
    if (assignmentFilter === 'MINE') list = list.filter((d) => d.assignedTo === CURRENT_ADMIN);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.trackingCode.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.driverName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [disputes, statusFilter, searchQuery, assignmentFilter]);

  const totalPages = Math.ceil(filteredDisputes.length / pageSize) || 1;
  const paginatedDisputes = filteredDisputes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleAssignToggle = (disputeId: string) => {
    setDisputes((prev) =>
      prev.map((d) => {
        if (d.id !== disputeId) return d;
        const alreadyMine = d.assignedTo === CURRENT_ADMIN;
        return { ...d, assignedTo: alreadyMine ? null : CURRENT_ADMIN };
      })
    );
  };

  const handleRefundConfirm = async () => {
    if (!refundModal) return;
    setRefunding(true);
    const amt = refundAmount || refundModal.orderValue;

    try {
      const res = await fetch(`/api/admin/disputes/${refundModal.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Refund of ${amt}: ${refundNote || 'Customer refund'}` }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || 'Refund failed');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund failed', 'error');
      setRefunding(false);
      return;
    }

    addAuditLog(
      'Dispute Refund Issued',
      `${refundModal.customerName} — ${refundModal.trackingCode}`,
      refundNote || 'Refund issued to customer wallet',
      amt
    );
    setResolvedHistory((prev) => [
      {
        id: `rsp-${Date.now()}`,
        trackingCode: refundModal.trackingCode,
        customerName: refundModal.customerName,
        driverName: refundModal.driverName,
        outcome: 'REFUNDED',
        refundAmount: amt,
        resolvedBy: CURRENT_ADMIN,
        resolvedAt: 'Just now',
        reason: refundNote || 'Admin-issued refund',
        openDuration: `${refundModal.openedMinutesAgo} mins`,
      },
      ...prev,
    ]);
    setDisputes((prev) => prev.map((d) => (d.id === refundModal.id ? { ...d, status: 'RESOLVED' } : d)));
    showToast(`Refund of ${amt} issued to ${refundModal.customerName}`);
    setRefundModal(null);
    setRefundAmount('');
    setRefundNote('');
    setRefunding(false);
  };

  const handleResolveConfirm = async () => {
    if (!resolveModal) return;
    setResolving(true);
    const reason = resolveReason === 'Other' ? resolveReasonCustom || 'Other' : resolveReason;

    try {
      const res = await fetch(`/api/admin/disputes/${resolveModal.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || 'Failed to resolve dispute');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resolve dispute', 'error');
      setResolving(false);
      return;
    }

    addAuditLog('Dispute Resolved (No Refund)', `${resolveModal.trackingCode}`, reason);
    setResolvedHistory((prev) => [
      {
        id: `rsp-${Date.now()}`,
        trackingCode: resolveModal.trackingCode,
        customerName: resolveModal.customerName,
        driverName: resolveModal.driverName,
        outcome: 'NO_REFUND',
        resolvedBy: CURRENT_ADMIN,
        resolvedAt: 'Just now',
        reason,
        openDuration: `${resolveModal.openedMinutesAgo} mins`,
      },
      ...prev,
    ]);
    setDisputes((prev) => prev.map((d) => (d.id === resolveModal.id ? { ...d, status: 'RESOLVED' } : d)));
    showToast(`Dispute ${resolveModal.trackingCode} resolved.`);
    setResolveModal(null);
    setResolveReason(RESOLVE_REASONS[0]);
    setResolveReasonCustom('');
    setResolving(false);
  };

  const handleSuspendConfirm = async () => {
    if (!suspendModal || !suspendModal.driverId) return;
    setSuspending(true);
    await new Promise((r) => setTimeout(r, 700));
    const reason = suspendReason === 'Other' ? suspendReasonCustom || 'Other' : suspendReason;
    addAuditLog('Driver Suspended via Dispute', `${suspendModal.driverName} — ${suspendModal.trackingCode}`, reason);
    showToast(`Driver ${suspendModal.driverName} suspended. Reason logged.`);
    setSuspendModal(null);
    setSuspendReason(SUSPEND_REASONS[0]);
    setSuspendReasonCustom('');
    setSuspending(false);
  };

  const handleCategoryChange = (disputeId: string, cat: Dispute['category']) => {
    setDisputes((prev) => prev.map((d) => (d.id === disputeId ? { ...d, category: cat } : d)));
    setEditingCategoryFor(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-2xl ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Customer Support & Dispute Desk</h2>
            {escalatedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-xs font-extrabold text-rose-400 animate-pulse">
                <Flame className="h-3 w-3" /> {escalatedCount} ESCALATED
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review active order disputes, inspect chat transcripts, issue refunds, and audit resolution outcomes.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Open Disputes</p>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-amber-400">{openDisputes.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{escalatedCount} escalated · requires urgent review</p>
        </Card>
        <Card className="p-5 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Resolved Today</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-emerald-400">{resolvedHistory.length}</p>
          <p className="mt-1 text-xs text-emerald-400">Avg resolution: {resolvedHistory.length > 0 ? '7 mins' : '—'}</p>
        </Card>
        <Card className="p-5 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Customer Satisfaction</p>
            <Star className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-primary">4.9 / 5.0</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on post-dispute ratings</p>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="space-y-3">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Disputes', count: disputes.length },
            { id: 'UNDER_REVIEW', label: 'Under Review', count: disputes.filter((d) => d.status === 'UNDER_REVIEW').length },
            { id: 'ESCALATED', label: 'Escalated', count: disputes.filter((d) => d.status === 'ESCALATED').length },
            { id: 'RESOLVED', label: 'Resolved', count: disputes.filter((d) => d.status === 'RESOLVED').length },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => { setStatusFilter(chip.id); setCurrentPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === chip.id ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {chip.label}
              <span className={`rounded-full px-2 text-[10px] font-mono ${statusFilter === chip.id ? 'bg-primary-foreground/20' : 'bg-background text-muted-foreground'}`}>
                {chip.count}
              </span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
            {(['ALL', 'MINE'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setAssignmentFilter(v)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  assignmentFilter === v ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'ALL' ? 'All Agents' : 'My Disputes'}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tracking ID, customer, or driver..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Dispute Cards */}
      <div className="space-y-5">
        {paginatedDisputes.length === 0 ? (
          <Card className="border-border/80 p-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-base font-bold text-foreground">No disputes found matching current filters</p>
            <p className="text-xs text-muted-foreground mt-1">Adjust filters or search terms to find disputes.</p>
          </Card>
        ) : (
          paginatedDisputes.map((dispute) => {
            const isEscalated = dispute.status === 'ESCALATED';
            const isResolved = dispute.status === 'RESOLVED';
            const timeStyle = getTimeOpenStyle(dispute.openedMinutesAgo);
            const catStyle = getCategoryStyle(dispute.category);
            const isAssignedToMe = dispute.assignedTo === CURRENT_ADMIN;

            return (
              <Card
                key={dispute.id}
                className={`overflow-hidden border bg-card/90 backdrop-blur-md shadow-xs space-y-4 p-6 transition-all ${
                  isEscalated ? 'border-rose-500/40 bg-rose-500/[0.06] shadow-rose-500/10' : 'border-border/80'
                } ${isResolved ? 'opacity-60' : ''}`}
              >
                {/* Card Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between border-b border-border/60 pb-4">
                  <div className="space-y-2">
                    {/* Tracking + Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-extrabold text-lg text-foreground">{dispute.trackingCode}</span>

                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${
                        isEscalated
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                          : isResolved
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}>
                        {isEscalated && <Flame className="h-3 w-3" />}
                        {isResolved && <CheckCircle2 className="h-3 w-3" />}
                        {dispute.status.replace('_', ' ')}
                      </span>

                      {/* Category Tag */}
                      <div className="relative">
                        <button
                          onClick={() => setEditingCategoryFor(editingCategoryFor === dispute.id ? null : dispute.id)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold cursor-pointer hover:opacity-80 ${catStyle}`}
                        >
                          <Tag className="h-3 w-3" /> {dispute.category}
                        </button>
                        {editingCategoryFor === dispute.id && (
                          <div className="absolute left-0 top-full mt-1 z-30 w-44 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                            {DISPUTE_CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => handleCategoryChange(dispute.id, cat)}
                                className="block w-full px-3 py-2 text-left text-xs font-semibold hover:bg-muted text-foreground cursor-pointer"
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Time-open badge */}
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${timeStyle}`}>
                        <Clock className="h-3 w-3" />
                        {dispute.openedAt}
                        {dispute.openedMinutesAgo >= 240 && <span>⚠</span>}
                      </span>
                    </div>

                    {/* Participants — VERIFIED from same order record */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <Link href={`/users/${dispute.customerId}`} className="flex items-center gap-1 font-semibold text-primary hover:underline">
                        <User className="h-3.5 w-3.5" /> {dispute.customerName}
                        {dispute.customerPriorDisputes > 0 && (
                          <span className="ml-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            {dispute.customerPriorDisputes} prior
                          </span>
                        )}
                      </Link>
                      <span className="text-muted-foreground/50">vs</span>
                      {dispute.driverId ? (
                        <Link href={`/drivers/${dispute.driverId}`} className="flex items-center gap-1 font-semibold text-foreground hover:text-primary hover:underline">
                          <User className="h-3.5 w-3.5" /> {dispute.driverName}
                          {dispute.driverPriorDisputes > 0 && (
                            <span className="ml-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                              {dispute.driverPriorDisputes} prior
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground italic">
                          <UserX className="h-3.5 w-3.5" /> Unassigned
                          <span className="ml-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">⚠ Backend: no driver on record</span>
                        </span>
                      )}
                    </div>

                    {/* Assignment Control */}
                    <div>
                      <button
                        onClick={() => handleAssignToggle(dispute.id)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-all ${
                          isAssignedToMe
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        {isAssignedToMe ? `✓ Assigned to ${CURRENT_ADMIN}` : dispute.assignedTo ? `Assigned to ${dispute.assignedTo}` : 'Assign to me'}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isResolved && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => { setRefundModal(dispute); setRefundAmount(dispute.orderValue); }}
                      >
                        Issue Refund
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => setResolveModal(dispute)}
                      >
                        Resolve (No Refund)
                      </Button>
                      {dispute.driverId && (
                        <Button
                          variant="danger"
                          className="h-8 text-xs cursor-pointer"
                          onClick={() => setSuspendModal(dispute)}
                        >
                          Suspend Driver
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Body Grid: Dispute Reason + Evidence | Chat Transcript */}
                <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
                  {/* Left: Reason + Order Value + Evidence */}
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Dispute Reason</p>
                      <p className="text-sm font-medium text-foreground leading-relaxed">{dispute.reason}</p>
                      <div className="flex items-center gap-3 pt-1 border-t border-border/60">
                        <span className="text-[10px] text-muted-foreground font-medium">Order Value:</span>
                        <span className="font-mono font-extrabold text-foreground">{dispute.orderValue}</span>
                      </div>
                      <Link
                        href={`/orders/${dispute.orderId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> View Full Order Audit
                      </Link>
                    </div>

                    {/* Evidence Thumbnails */}
                    {dispute.evidence.length > 0 && (
                      <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                          <Image className="h-3.5 w-3.5" /> Evidence Photos ({dispute.evidence.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {dispute.evidence.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => setLightboxEvidence(ev)}
                              className="relative h-16 w-16 rounded-lg border border-border/80 bg-muted/60 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-[9px] text-muted-foreground font-medium text-center px-1">
                                <Image className="h-4 w-4 text-muted-foreground/50 mb-0.5" />
                                {ev.caption}
                              </div>
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Chat Transcript */}
                  <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> Order Chat Transcript
                      <span className="ml-1 text-[9px] italic text-muted-foreground/60">(verified from order record)</span>
                    </p>
                    <div className="space-y-2 mt-1 max-h-40 overflow-y-auto pr-0.5">
                      {dispute.chatMessages.map((msg, i) => {
                        const isUser = msg.role === 'USER';
                        const isSystem = msg.role === 'SYSTEM';
                        return (
                          <div
                            key={i}
                            className={`rounded-lg border px-3 py-2 text-xs ${
                              isSystem
                                ? 'border-primary/20 bg-primary/5 text-primary'
                                : isUser
                                ? 'border-border/60 bg-muted/40'
                                : 'border-emerald-500/20 bg-emerald-500/5'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-foreground">{msg.sender}</span>
                              <span className="text-muted-foreground font-mono">{msg.at}</span>
                            </div>
                            <p className="text-foreground/90 leading-snug">{msg.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs border-t border-border/60 pt-4">
          <span className="text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDisputes.length)} of {filteredDisputes.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg border border-input bg-background p-1.5 hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono font-bold">{currentPage}/{totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-lg border border-input bg-background p-1.5 hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Resolution History */}
      <Card className="p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Resolution History</h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{resolvedHistory.length} resolved</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              <tr>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Resolved By</th>
                <th className="px-4 py-3 text-right">Time Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {resolvedHistory.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{r.trackingCode}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.driverName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      r.outcome === 'REFUNDED'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }`}>
                      {r.outcome === 'REFUNDED' ? `Refunded ${r.refundAmount}` : 'No Refund'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{r.reason}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{r.resolvedBy}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{r.openDuration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Trail */}
      {auditLogs.length > 0 && (
        <Card className="p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <BadgeAlert className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-bold text-foreground">This Session Audit Log</h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{log.adminName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{log.timestamp}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{log.action}</span>
                  <span className="text-foreground font-semibold">{log.target}</span>
                  {log.amount && <span className="font-mono font-bold text-emerald-400">{log.amount}</span>}
                </div>
                <p className="text-muted-foreground italic text-[11px]">Reason: {log.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}

      {/* 1. Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-extrabold text-base text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Issue Refund to Customer
              </div>
              <button onClick={() => setRefundModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Issuing refund for order <span className="font-bold text-foreground">{refundModal.trackingCode}</span> to{' '}
              <span className="font-bold text-foreground">{refundModal.customerName}</span>.{' '}
              The full order value is <span className="font-mono font-bold text-foreground">{refundModal.orderValue}</span>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Refund Amount (editable for partial refund)
                </label>
                <Input
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={refundModal.orderValue}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Reason / Note (shown in audit trail)
                </label>
                <Input
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="e.g. Driver failed to deliver within SLA"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setRefundModal(null)}>Cancel</Button>
              <Button loading={refunding} onClick={handleRefundConfirm}>
                Confirm Refund
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Resolve (No Refund) Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-extrabold text-base text-foreground flex items-center gap-2">
                <XCircle className="h-5 w-5 text-muted-foreground" /> Resolve — No Refund
              </div>
              <button onClick={() => setResolveModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Resolving dispute <span className="font-bold text-foreground">{resolveModal.trackingCode}</span> with no refund to customer. Please select a reason.
            </p>
            <div className="space-y-3">
              <select
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {RESOLVE_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              {resolveReason === 'Other' && (
                <Input
                  placeholder="Specify custom reason..."
                  value={resolveReasonCustom}
                  onChange={(e) => setResolveReasonCustom(e.target.value)}
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setResolveModal(null)}>Cancel</Button>
              <Button loading={resolving} onClick={handleResolveConfirm}>
                Confirm Resolution
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Suspend Driver Modal */}
      {suspendModal && suspendModal.driverId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-extrabold text-base text-foreground flex items-center gap-2">
                <UserX className="h-5 w-5 text-rose-400" /> Suspend Driver
              </div>
              <button onClick={() => setSuspendModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Suspending courier <span className="font-bold text-foreground">{suspendModal.driverName}</span> in connection with dispute{' '}
              <span className="font-bold text-foreground">{suspendModal.trackingCode}</span>. The driver will be notified.
            </p>
            <div className="space-y-3">
              <select
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SUSPEND_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              {suspendReason === 'Other' && (
                <Input
                  placeholder="Specify custom reason..."
                  value={suspendReasonCustom}
                  onChange={(e) => setSuspendReasonCustom(e.target.value)}
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setSuspendModal(null)}>Cancel</Button>
              <Button variant="danger" loading={suspending} onClick={handleSuspendConfirm}>
                Confirm Suspension
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Evidence Lightbox */}
      {lightboxEvidence && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setLightboxEvidence(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-3 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxEvidence(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="h-64 w-full rounded-xl border border-border/80 bg-muted/40 flex flex-col items-center justify-center text-muted-foreground">
              <Image className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-semibold">{lightboxEvidence.caption}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">Uploaded by {lightboxEvidence.uploadedBy}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground italic">
              Evidence photo — actual image display requires API evidence URL endpoint
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
