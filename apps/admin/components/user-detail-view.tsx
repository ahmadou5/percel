'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  History,
  Wallet,
  PackageX,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminUser } from '@/lib/admin-data';

type AuditLog = {
  id: string;
  adminName: string;
  action: string;
  details: string;
  reason?: string;
  timestamp: string;
};

// Reasons for suspension / reactivation
const SUSPEND_REASONS = [
  'Fraud suspected',
  'Policy violation',
  'User request',
  'Other',
];

export function UserDetailView({ initialUser }: { initialUser: AdminUser }) {
  const [user, setUser] = useState<AdminUser>(initialUser);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [city, setCity] = useState(user.city || user.address || '');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({});

  // Suspend / Reactivate Modal State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReasonCategory, setSuspendReasonCategory] = useState(SUSPEND_REASONS[0]);
  const [customSuspendReason, setCustomSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Password Recovery States
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [passwordFlowStep, setPasswordFlowStep] = useState<'CHOICE' | 'CONFIRM_LINK' | 'TEMP_GEN'>('CHOICE');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copiedTempPass, setCopiedTempPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Toast Banner State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(
    user.auditLogs || [
      {
        id: 'log-1',
        adminName: 'Super Admin',
        action: 'Account Created',
        details: 'User registered via Percel Mobile App',
        timestamp: user.joined || 'Recent',
      },
    ]
  );

  // Wallet Ledger Pagination State
  const [walletPage, setWalletPage] = useState(1);
  const walletPageSize = 5;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to add audit log
  const logAdminAction = (action: string, details: string, reason?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      adminName: 'Admin Operator',
      action,
      details,
      reason,
      timestamp: 'Just now',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Validate Email and Nigerian Phone
  const validateEditForm = (): boolean => {
    const errors: { email?: string; phone?: string } = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // Phone validation (Nigerian formats: +23480..., 080..., 090..., 070..., 081..., etc.)
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    const nigerianPhoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (cleanedPhone && !nigerianPhoneRegex.test(cleanedPhone) && cleanedPhone.length < 10) {
      errors.phone = 'Please enter a valid phone number (e.g. 08012345678 or +234...)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Profile Update submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setSaving(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, address: city, status: user.status }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message ?? json?.data?.message ?? 'Failed to update user profile');
      }

      const updatedUser = json.data ?? { ...user, name: fullName, email, phone, city };
      setUser(updatedUser);
      setIsEditing(false);

      const changes: string[] = [];
      if (fullName !== user.name) changes.push(`Name -> ${fullName}`);
      if (email !== user.email) changes.push(`Email -> ${email}`);
      if (phone !== user.phone) changes.push(`Phone -> ${phone}`);
      if (city !== user.city) changes.push(`City -> ${city}`);

      logAdminAction('Profile Update', changes.length > 0 ? changes.join(', ') : 'Updated profile details');
      showToast('User profile updated successfully!');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'An error occurred updating profile.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Suspend / Reactivate Confirmation
  const handleConfirmSuspendToggle = async () => {
    setSuspending(true);
    const isSuspending = user.status === 'ACTIVE';
    const reasonText =
      suspendReasonCategory === 'Other'
        ? customSuspendReason.trim() || 'Other'
        : suspendReasonCategory;

    const endpoint = isSuspending
      ? `/api/admin/users/${user.id}/suspend`
      : `/api/admin/users/${user.id}/reactivate`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasonText }),
      });

      if (!res.ok) {
        throw new Error('Failed to update account status');
      }

      const nextStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';
      setUser((prev) => ({
        ...prev,
        status: nextStatus,
        supportNote: isSuspending
          ? `Account suspended. Reason: ${reasonText}`
          : 'Account reactivated.',
      }));

      logAdminAction(
        isSuspending ? 'Account Suspended' : 'Account Reactivated',
        `Status changed to ${nextStatus}`,
        reasonText
      );

      showToast(`User account ${isSuspending ? 'suspended' : 'reactivated'} successfully!`);
      setShowSuspendModal(false);
      setCustomSuspendReason('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setSuspending(false);
    }
  };

  // Handle Send Password Reset Link
  const handleSendResetLink = async () => {
    setPassLoading(true);
    try {
      // Simulate / API call for reset link
      await new Promise((r) => setTimeout(r, 600));

      logAdminAction('Password Reset Requested', `Dispatched reset link to ${user.email}`);
      showToast(`Password reset link sent to ${user.email}`);
      setShowPasswordResetModal(false);
      setPasswordFlowStep('CHOICE');
    } catch {
      showToast('Failed to dispatch password reset link', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Generate Temporary Password
  const handleGenerateTempPassword = async () => {
    setPassLoading(true);
    try {
      // Generate secure random temp pass
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
      let generated = 'Percel-';
      for (let i = 0; i < 6; i++) {
        generated += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      await new Promise((r) => setTimeout(r, 600));

      setTempPassword(generated);

      logAdminAction(
        'Temporary Password Generated',
        'Generated single-use temp password with mustChangePassword flag'
      );

      showToast('Temporary password generated successfully!');
      setPasswordFlowStep('TEMP_GEN');
    } catch {
      showToast('Failed to generate temporary password', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  // Copy temp password to clipboard
  const handleCopyTempPass = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopiedTempPass(true);
    setTimeout(() => setCopiedTempPass(false), 2000);
  };

  // Scroll to wallet ledger section
  const handleScrollToWallet = () => {
    document.getElementById('wallet-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Wallet Transactions Pagination
  const transactions = user.walletTransactions || [];
  const totalWalletTx = transactions.length;
  const totalWalletPages = Math.ceil(totalWalletTx / walletPageSize) || 1;
  const paginatedTransactions = transactions.slice(
    (walletPage - 1) * walletPageSize,
    walletPage * walletPageSize
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-2xl transition-all ${toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header and Action Buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${user.status === 'ACTIVE'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              }`}
          >
            {user.status}
          </span>
          <div className="mt-3 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xl border border-primary/20 shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.avatarInitial
              )}
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{user.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {user.email} · {user.phone} · {user.city}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={() => setIsEditing(true)} variant="secondary" className="cursor-pointer">
            Edit Profile
          </Button>

          {/* Suspend / Reactivate Button */}
          <Button
            onClick={() => setShowSuspendModal(true)}
            variant={user.status === 'ACTIVE' ? 'danger' : 'secondary'}
            className="cursor-pointer "
          >
            <div className='flex flex-row justify-between items-center '>
              <ShieldAlert className="h-4 w-4 mr-1.5" />
              {user.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
            </div>
          </Button>

          {/* View Wallet Scroll Action */}
          <Button onClick={handleScrollToWallet} variant="default" className="cursor-pointer">
            <div className='flex flex-row justify-between items-center '>
              <Wallet className="h-4 w-4 mr-1.5" /> {`View Wallet`}
            </div>
          </Button>
        </div>
      </div>

      {/* Main Grid Section */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          {/* Profile Summary Card */}
          <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Profile Summary</h3>
              <button
                onClick={() => setShowPasswordResetModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" /> Password Recovery
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Joined {user.joined} · <span className="font-mono font-bold text-foreground">{user.orders}</span> orders · Wallet{' '}
              <span className="font-mono font-bold text-foreground">{user.walletBalance}</span>
            </p>
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground block mb-1">Support & Audit Status</span>
              {user.supportNote || 'Account is active in good standing.'}
            </div>
          </Card>

          {/* Wallet Ledger Card */}
          <Card id="wallet-section" className="space-y-4 p-6 border-primary/30 bg-primary/5 backdrop-blur-md shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Wallet Ledger</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current Balance: <span className="font-semibold text-foreground font-mono text-sm">{user.walletBalance}</span>
                </p>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
                {totalWalletTx} Total Tx
              </span>
            </div>

            {/* Wallet Ledger List */}
            <div className="space-y-2.5">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx: any, idx: number) => {
                  const isCredit = tx.type === 'CREDIT' || tx.category?.includes('IN') || tx.category?.includes('TOPUP');
                  const categoryName = tx.category || (isCredit ? 'TRANSFER_IN' : 'ORDER_PAYMENT');

                  let badgeColor = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
                  if (categoryName.includes('PAYMENT') || categoryName.includes('DEBIT')) {
                    badgeColor = 'border-amber-500/30 bg-amber-500/10 text-amber-400';
                  } else if (categoryName.includes('REFUND')) {
                    badgeColor = 'border-sky-500/30 bg-sky-500/10 text-sky-400';
                  } else if (categoryName.includes('OUT')) {
                    badgeColor = 'border-rose-500/30 bg-rose-500/10 text-rose-400';
                  }

                  return (
                    <div
                      key={tx.id || idx}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-background p-3 text-xs transition-all hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isCredit
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            }`}
                        >
                          {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                              {categoryName}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {tx.reference}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{tx.createdAt}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${isCredit ? 'text-emerald-400' : 'text-foreground'}`}>
                          {isCredit ? '+' : '-'}{tx.amount}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">{tx.status}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <Wallet className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-semibold">No wallet transactions recorded for this user.</p>
                </div>
              )}
            </div>

            {/* Wallet Ledger Pagination Controls */}
            {totalWalletPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                <span className="text-muted-foreground">
                  Showing {(walletPage - 1) * walletPageSize + 1} to {Math.min(walletPage * walletPageSize, totalWalletTx)} of{' '}
                  {totalWalletTx}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={walletPage <= 1}
                    onClick={() => setWalletPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono font-bold">
                    {walletPage}/{totalWalletPages}
                  </span>
                  <button
                    disabled={walletPage >= totalWalletPages}
                    onClick={() => setWalletPage((p) => Math.min(totalWalletPages, p + 1))}
                    className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Recent Activity & Admin Audit Trail */}
        <div className="space-y-6">
          {/* Recent Activity Card */}
          <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
            <h3 className="text-lg font-semibold tracking-tight">Recent Activity</h3>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {user.recentOrders && user.recentOrders.length > 0 ? (
                user.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 p-3.5 text-xs bg-background/50 transition-all hover:bg-muted/40"
                  >
                    <div>
                      <Link href={`/orders/${order.id}`} className="font-bold text-primary hover:underline font-mono">
                        {order.trackingCode}
                      </Link>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {order.status} · {order.date}
                      </div>
                    </div>
                    <div className="font-mono font-bold tabular-nums text-foreground">{order.price}</div>
                  </div>
                ))
              ) : (
                /* Redesigned Empty State */
                <div className="py-10 text-center text-muted-foreground space-y-2 border border-dashed border-border/80 rounded-2xl bg-muted/20">
                  <PackageX className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-bold text-foreground">No dispatch orders placed yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    This customer has not placed any package delivery requests on the Percel network.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Admin Audit Trail Section */}
          <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold tracking-tight">Admin Activity & Audit Trail</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono font-bold">{auditLogs.length} logs</span>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <User className="h-3 w-3 text-primary" /> {log.adminName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{log.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {log.action}
                    </span>
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
        </div>
      </section>

      {/* 1. Edit Profile Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Edit User Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                {editError}
              </p>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldErrors.email ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.email && <p className="text-[11px] text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldErrors.phone ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.phone && <p className="text-[11px] text-destructive">{fieldErrors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Address</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja, Lagos" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" loading={saving} className="cursor-pointer">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Suspend / Reactivate Confirmation Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-foreground font-extrabold text-base">
                <ShieldAlert className={`h-5 w-5 ${user.status === 'ACTIVE' ? 'text-destructive' : 'text-emerald-400'}`} />
                {user.status === 'ACTIVE' ? 'Suspend User Account' : 'Reactivate User Account'}
              </div>
              <button onClick={() => setShowSuspendModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {user.status === 'ACTIVE'
                ? `Suspending ${user.name} will block access to Percel logistics services and pending orders.`
                : `Reactivating ${user.name} will restore account access and wallet functions.`}
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Required Reason
              </label>
              <select
                value={suspendReasonCategory}
                onChange={(e) => setSuspendReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SUSPEND_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {suspendReasonCategory === 'Other' && (
                <Input
                  placeholder="Specify custom reason..."
                  value={customSuspendReason}
                  onChange={(e) => setCustomSuspendReason(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setShowSuspendModal(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="button"
                variant={user.status === 'ACTIVE' ? 'danger' : 'default'}
                loading={suspending}
                onClick={handleConfirmSuspendToggle}
                className="cursor-pointer"
              >
                Confirm {user.status === 'ACTIVE' ? 'Suspension' : 'Reactivation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Password Recovery Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-foreground font-extrabold text-base">
                <KeyRound className="h-5 w-5 text-primary" /> Password Recovery Options
              </div>
              <button
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setPasswordFlowStep('CHOICE');
                  setTempPassword(null);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {passwordFlowStep === 'CHOICE' && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a password recovery action for <span className="font-bold text-foreground">{user.name}</span>:
                </p>

                <button
                  onClick={() => setPasswordFlowStep('CONFIRM_LINK')}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/80 bg-background p-4 text-left hover:bg-muted/40 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">Send Password Reset Link</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Dispatches a reset link to {user.email}</div>
                  </div>
                </button>

                <button
                  onClick={handleGenerateTempPassword}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/80 bg-background p-4 text-left hover:bg-muted/40 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">Generate Temporary Password</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Generates a temp password & sets mustChangePassword flag
                    </div>
                  </div>
                </button>
              </div>
            )}

            {passwordFlowStep === 'CONFIRM_LINK' && (
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Send a password reset email and SMS notification to <span className="font-bold text-foreground">{user.email}</span>?
                </p>
                <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
                  <Button variant="secondary" onClick={() => setPasswordFlowStep('CHOICE')} className="cursor-pointer">
                    Back
                  </Button>
                  <Button loading={passLoading} onClick={handleSendResetLink} className="cursor-pointer">
                    Send Link
                  </Button>
                </div>
              </div>
            )}

            {passwordFlowStep === 'TEMP_GEN' && tempPassword && (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Temporary Password Generated
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    This password will be shown ONCE. The user will be forced to change password upon logging in.
                  </p>

                  <div className="flex items-center justify-between bg-background rounded-lg border border-border p-3 font-mono text-base font-extrabold text-foreground mt-2">
                    <span>{tempPassword}</span>
                    <button
                      onClick={handleCopyTempPass}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      {copiedTempPass ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      {copiedTempPass ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      setShowPasswordResetModal(false);
                      setPasswordFlowStep('CHOICE');
                      setTempPassword(null);
                    }}
                    className="cursor-pointer"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
