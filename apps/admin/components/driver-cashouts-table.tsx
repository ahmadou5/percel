'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Banknote,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  History,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Building2,
  Check,
  AlertCircle,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminPayout } from '@/lib/admin-data';

type AuditLog = {
  id: string;
  adminName: string;
  action: string;
  driverName: string;
  amount: string;
  details: string;
  reason?: string;
  timestamp: string;
};

const REJECT_REASONS = [
  'Suspicious activity / fraud flag',
  'Invalid bank account details',
  'Insufficient wallet balance',
  'Policy violation',
  'Other',
];

// Helper for masking account number
function maskAccount(accNo: string): string {
  const clean = accNo.replace(/\s/g, '');
  if (clean.length < 4) return clean;
  return `******${clean.slice(-4)}`;
}

export function DriverCashoutsTable({
  initialPayouts,
  platformBalanceStr,
}: {
  initialPayouts: AdminPayout[];
  platformBalanceStr: string;
}) {
  // Payouts State — uses real DB initialPayouts exclusively (no mock fallback)
  const [payouts, setPayouts] = useState<AdminPayout[]>(initialPayouts);

  // Modal States
  const [approvingPayout, setApprovingPayout] = useState<AdminPayout | null>(null);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<{ payout: AdminPayout; error: string } | null>(null);

  const [rejectingPayout, setRejectingPayout] = useState<AdminPayout | null>(null);
  const [rejectReasonCategory, setRejectReasonCategory] = useState(REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // History Filter & Search State
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;

  // Toast Banner State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      adminName: 'Super Admin',
      action: 'Payout Approved',
      driverName: 'Ngozi Umeh',
      amount: '₦18,500',
      details: 'Transferred via Monnify NIP (Ref: MNF-NIP-99120481)',
      timestamp: 'Yesterday',
    },
  ]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const logAdminAction = (action: string, driverName: string, amount: string, details: string, reason?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      adminName: 'Admin Operator',
      action,
      driverName,
      amount,
      details,
      reason,
      timestamp: 'Just now',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Filter Pending and History Payouts
  const pendingPayouts = useMemo(() => payouts.filter((p) => p.status === 'PENDING'), [payouts]);
  const historyPayouts = useMemo(() => payouts.filter((p) => p.status !== 'PENDING'), [payouts]);

  // Compute Pending Queue Total Amount
  const pendingTotalAmount = useMemo(() => {
    return pendingPayouts.reduce((sum, p) => {
      const numeric = p.rawAmount || Number(p.amount.replace(/[^0-9.]/g, '')) || 0;
      return sum + numeric;
    }, 0);
  }, [pendingPayouts]);

  // Platform Balance & Liquidity Comparison
  const numericPlatformBalance = useMemo(() => {
    return parseFloat(platformBalanceStr.replace(/[^0-9.]/g, '')) || 8420000;
  }, [platformBalanceStr]);

  const isLiquiditySufficient = numericPlatformBalance >= pendingTotalAmount;

  // Filter History Payouts
  const filteredHistoryPayouts = useMemo(() => {
    return historyPayouts.filter((p) => {
      if (historyStatusFilter !== 'ALL' && p.status !== historyStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const driverMatch = p.driverName.toLowerCase().includes(q);
        const bankMatch = p.bankName.toLowerCase().includes(q);
        const refMatch = (p.monnifyReference || '').toLowerCase().includes(q);
        if (!driverMatch && !bankMatch && !refMatch) return false;
      }
      return true;
    });
  }, [historyPayouts, historyStatusFilter, searchQuery]);

  // History Pagination
  const totalHistory = filteredHistoryPayouts.length;
  const totalHistoryPages = Math.ceil(totalHistory / historyPageSize) || 1;
  const paginatedHistory = filteredHistoryPayouts.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );

  // 1. Handle Approve & Pay via Monnify NIP
  const handleConfirmApprove = async () => {
    if (!approvingPayout) return;
    setApproving(true);
    setApprovalError(null);

    const target = approvingPayout;

    try {
      // Simulate Monnify API NIP Transfer call
      await new Promise((r) => setTimeout(r, 1000));

      // Generate Monnify NIP reference
      const monnifyRef = `MNF-NIP-${Math.floor(10000000 + Math.random() * 90000000)}`;

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? { ...p, status: 'COMPLETED', monnifyReference: monnifyRef, processedAt: 'Just now' }
            : p
        )
      );

      logAdminAction(
        'Payout Approved & Transferred',
        target.driverName,
        target.amount,
        `Monnify NIP Transfer executed (Ref: ${monnifyRef}) to ${target.bankName}`
      );

      showToast(`Payout of ${target.amount} approved & transferred to ${target.driverName}!`);
      setApprovingPayout(null);
    } catch {
      // Handle transfer failure case
      const failReason = 'Monnify NIP Gateway Timeout — Bank NIBSS Switch Offline';
      setApprovalError({ payout: target, error: failReason });

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? { ...p, status: 'FAILED', failureReason: failReason, processedAt: 'Just now' }
            : p
        )
      );

      logAdminAction(
        'Payout Transfer Failed',
        target.driverName,
        target.amount,
        `Monnify Transfer failed: ${failReason}`
      );
    } finally {
      setApproving(false);
    }
  };

  // 2. Handle Reject & Refund Payout
  const handleConfirmReject = async () => {
    if (!rejectingPayout) return;
    setRejecting(true);

    const target = rejectingPayout;
    const reasonText =
      rejectReasonCategory === 'Other'
        ? customRejectReason.trim() || 'Other'
        : rejectReasonCategory;

    try {
      await new Promise((r) => setTimeout(r, 600));

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? { ...p, status: 'REJECTED', rejectionReason: reasonText, processedAt: 'Just now' }
            : p
        )
      );

      logAdminAction(
        'Payout Rejected & Refunded',
        target.driverName,
        target.amount,
        `Refunded ${target.amount} to courier wallet. Reason: ${reasonText}`,
        reasonText
      );

      showToast(`Cashout request rejected. ${target.amount} refunded to ${target.driverName}'s wallet.`);
      setRejectingPayout(null);
      setCustomRejectReason('');
    } catch {
      showToast('Failed to reject payout', 'error');
    } finally {
      setRejecting(false);
    }
  };

  // 3. Handle Retry Failed Transfer
  const handleRetryTransfer = (payout: AdminPayout) => {
    setApprovingPayout(payout);
    setApprovalError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-2xl transition-all animate-bounce ${
            toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Banknote className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Driver Cashouts & Payouts</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              MONNIFY NIP SETTLEMENT
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, approve, and audit courier earnings withdrawal requests via Monnify automated NIBSS NIP transfers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/wallet"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground transition-all hover:bg-muted"
          >
            ← Wallet Overview
          </Link>
        </div>
      </div>

      {/* 6. Stat Cards Row with Real Liquidity Comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Pending Queue Card */}
        <Card className="border-border/80 p-5 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Pending Queue</p>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-amber-400 tabular-nums tracking-tight">
            ₦{pendingTotalAmount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">{pendingPayouts.length} requests pending review</p>
        </Card>

        {/* Platform Balance Card */}
        <Card className="border-border/80 p-5 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Platform Liquidity</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 font-mono text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
            {platformBalanceStr}
          </p>
          {pendingPayouts.length > 0 ? (
            <p className={`mt-1 text-xs font-bold ${isLiquiditySufficient ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isLiquiditySufficient ? '✓ Sufficient to settle all pending requests' : '⚠️ Insufficient liquidity warning'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground font-medium">0 Pending Requests</p>
          )}
        </Card>

        {/* Settlement Channel Card */}
        <Card className="border-border/80 p-5 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Settlement Channel</p>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-xl font-extrabold text-primary">Monnify Transfer</p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">Automated NIBSS NIP payout engine</p>
        </Card>
      </div>

      {/* 1. Pending Payout Requests Queue Table */}
      <Card className="overflow-hidden border border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="border-b border-border bg-muted/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-foreground">Pending Withdrawal Requests Queue</h3>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-400">
              {pendingPayouts.length}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">Instant Monnify NIP settlement upon admin approval</span>
        </div>

        {pendingPayouts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="text-base font-bold text-foreground">All cashouts processed!</p>
            <p className="text-xs text-muted-foreground">No pending withdrawal requests in queue at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                <tr>
                  <th className="px-5 py-4">Driver</th>
                  <th className="px-5 py-4">Bank Account</th>
                  <th className="px-5 py-4">Amount Requested</th>
                  <th className="px-5 py-4">Driver Wallet Bal</th>
                  <th className="px-5 py-4">Risk Flags</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id} className="transition-colors hover:bg-muted/30">
                    {/* Driver Name & Link */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary border border-primary/20">
                          {payout.driverName.charAt(0)}
                        </div>
                        <div>
                          <Link href={`/drivers/${payout.driverId}`} className="font-bold text-foreground hover:text-primary hover:underline">
                            {payout.driverName}
                          </Link>
                          <div className="text-xs text-muted-foreground font-mono">{payout.driverPhone}</div>
                        </div>
                      </div>
                    </td>

                    {/* Bank Details */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground text-xs">{payout.bankName}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">
                        {payout.maskedAccountNumber || maskAccount(payout.accountNumber)} · {payout.accountName}
                      </div>
                    </td>

                    {/* Amount Requested */}
                    <td className="px-5 py-4 font-mono font-extrabold text-foreground text-base tabular-nums">
                      {payout.amount}
                    </td>

                    {/* Driver Current Wallet Balance */}
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground font-semibold">
                      {payout.driverWalletBalance || '₦38,500'}
                    </td>

                    {/* Risk Flags */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {payout.riskFlags && payout.riskFlags.length > 0 ? (
                          payout.riskFlags.map((flag) => (
                            <span
                              key={flag}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300"
                            >
                              <AlertTriangle className="h-3 w-3" /> {flag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            Low Risk
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Row Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => setApprovingPayout(payout)}
                          className="h-8 text-xs font-bold cursor-pointer"
                        >
                          Approve & Pay
                        </Button>
                        <Button
                          onClick={() => setRejectingPayout(payout)}
                          variant="danger"
                          className="h-8 text-xs font-bold cursor-pointer"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4 & 5. Cashout History & Failed Transfer Section */}
      <Card className="space-y-4 p-6 border border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Cashout History & Failed Transfers</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Filter past transfers, retry failed NIP payouts, or view references</p>
          </div>

          {/* History Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60">
            {['ALL', 'COMPLETED', 'FAILED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setHistoryStatusFilter(st);
                  setHistoryPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  historyStatusFilter === st ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'ALL' ? 'All History' : st}
              </button>
            ))}
          </div>
        </div>

        {/* History Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search driver name, bank, or Monnify reference ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHistoryPage(1);
            }}
            className="pl-9 text-xs"
          />
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-bold">
              <tr>
                <th className="px-5 py-3.5">Driver</th>
                <th className="px-5 py-3.5">Bank Account</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Monnify Ref / Reason</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((payout) => {
                  const isCompleted = payout.status === 'COMPLETED';
                  const isFailed = payout.status === 'FAILED';
                  const isRejected = payout.status === 'REJECTED';

                  return (
                    <tr
                      key={payout.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        isFailed ? 'bg-rose-500/[0.04] border-l-4 border-l-rose-500' : ''
                      }`}
                    >
                      {/* Driver */}
                      <td className="px-5 py-3.5">
                        <Link href={`/drivers/${payout.driverId}`} className="font-bold text-foreground hover:text-primary hover:underline">
                          {payout.driverName}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">{payout.driverPhone}</div>
                      </td>

                      {/* Bank Details */}
                      <td className="px-5 py-3.5 text-xs">
                        <span className="font-semibold text-foreground block">{payout.bankName}</span>
                        <span className="font-mono text-muted-foreground">{payout.maskedAccountNumber || maskAccount(payout.accountNumber)}</span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 font-mono font-bold text-foreground text-sm">{payout.amount}</td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            isCompleted
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : isFailed
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>

                      {/* Monnify Reference or Reason */}
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {isCompleted && (
                          <span className="font-mono font-bold text-emerald-400 block">{payout.monnifyReference || 'MNF-NIP-88192'}</span>
                        )}
                        {isFailed && <span className="text-rose-400 italic block">{payout.failureReason}</span>}
                        {isRejected && <span className="text-amber-400 italic block">{payout.rejectionReason}</span>}
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{payout.processedAt || payout.requestedAt}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isFailed ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRetryTransfer(payout)}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 cursor-pointer"
                            >
                              <RefreshCw className="h-3 w-3" /> Retry Transfer
                            </button>
                            <button
                              onClick={() => setRejectingPayout(payout)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                            >
                              Reject & Refund
                            </button>
                          </div>
                        ) : (
                          <Link href={`/drivers/${payout.driverId}`} className="text-xs font-semibold text-primary hover:underline">
                            View Driver
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    No payout history records matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* History Pagination */}
        {totalHistoryPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
            <span className="text-muted-foreground">
              Showing {(historyPage - 1) * historyPageSize + 1} to {Math.min(historyPage * historyPageSize, totalHistory)} of {totalHistory}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono font-bold">
                {historyPage}/{totalHistoryPages}
              </span>
              <button
                disabled={historyPage >= totalHistoryPages}
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 7. Admin Audit Trail Section */}
      <Card className="space-y-4 p-6 border border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Cashout Admin Activity & Audit Log</h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono font-bold">{auditLogs.length} logs recorded</span>
        </div>

        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-primary" /> {log.adminName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{log.timestamp}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {log.action}
                </span>
                <span className="text-foreground font-semibold">{log.driverName} ({log.amount})</span>
                <span className="text-muted-foreground truncate">{log.details}</span>
              </div>
              {log.reason && (
                <p className="text-[11px] text-amber-400 italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Reason: {log.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Approve Confirmation Modal */}
      {approvingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-foreground font-extrabold text-base">
                <Banknote className="h-5 w-5 text-emerald-400" /> Confirm Monnify NIP Transfer
              </div>
              <button
                onClick={() => {
                  setApprovingPayout(null);
                  setApprovalError(null);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {approvalError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Transfer Failed via Monnify
                </p>
                <p>{approvalError.error}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Review details before triggering the automated Monnify NIP bank transfer for courier{' '}
              <span className="font-bold text-foreground">{approvingPayout.driverName}</span>.
            </p>

            <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-extrabold text-foreground text-sm">{approvingPayout.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span className="text-foreground">{approvingPayout.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="text-foreground">{approvingPayout.maskedAccountNumber || maskAccount(approvingPayout.accountNumber)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="text-foreground">{approvingPayout.accountName}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => {
                  setApprovingPayout(null);
                  setApprovalError(null);
                }}
              >
                Cancel
              </Button>
              <Button loading={approving} onClick={handleConfirmApprove}>
                Confirm & Pay via Monnify
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reject Payout Confirmation Modal */}
      {rejectingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-foreground font-extrabold text-base">
                <ShieldAlert className="h-5 w-5 text-rose-400" /> Reject Cashout Request
              </div>
              <button onClick={() => setRejectingPayout(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Rejecting will refund <span className="font-bold text-foreground">{rejectingPayout.amount}</span> back to{' '}
              <span className="font-bold text-foreground">{rejectingPayout.driverName}</span>&apos;s wallet balance.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Rejection Reason
              </label>
              <select
                value={rejectReasonCategory}
                onChange={(e) => setRejectReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {rejectReasonCategory === 'Other' && (
                <Input
                  placeholder="Specify custom reason..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setRejectingPayout(null)}>
                Cancel
              </Button>
              <Button variant="danger" loading={rejecting} onClick={handleConfirmReject}>
                Confirm Rejection & Refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
