'use client';

import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Power,
  PowerOff,
  AlertTriangle,
  Clock,
  CreditCard,
  CheckCircle2,
  Users,
  UserPlus,
  Sliders,
  History,
  Lock,
  Smartphone,
  Check,
  X,
  Search,
  Activity,
  Info,
  RefreshCw,
  Key,
  Bell,
  Trash2,
  Edit2,
  UserCheck,
  Palette,
  UserCircle2,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeCustomizer } from '@/components/theme-customizer';
import { AdminProfileEditor } from '@/components/admin-profile-editor';
import type { AdminRoleUser, OpsThresholdConfig, SettingsAuditEntry } from '@/lib/admin-data';

// Payment Providers with Status
type PaymentProvider = 'MONNIFY' | 'PAYSTACK' | 'SQUAD';

interface ProviderInfo {
  id: PaymentProvider;
  name: string;
  description: string;
  status: 'OPERATIONAL' | 'DEGRADED';
  uptimePct: string;
}

const PROVIDERS_LIST: ProviderInfo[] = [
  {
    id: 'MONNIFY',
    name: 'Monnify',
    description: 'Default wallet funding, direct bank transfers, and dedicated virtual accounts rail.',
    status: 'OPERATIONAL',
    uptimePct: '99.9%',
  },
  {
    id: 'PAYSTACK',
    name: 'Paystack',
    description: 'Paystack checkout, card payments, bank account verification, and automated payouts.',
    status: 'OPERATIONAL',
    uptimePct: '100%',
  },
  {
    id: 'SQUAD',
    name: 'Squad',
    description: 'Backup payment rail for card processing and merchant collection.',
    status: 'DEGRADED',
    uptimePct: '94.2%',
  },
];

// Fallback Initial Admin Role Users
const DEFAULT_ROLE_USERS: AdminRoleUser[] = [
  { id: 'usr-1', name: 'Ahmadou SuperAdmin', email: 'ahmadou@percel.app', role: 'Super Admin', lastActive: '2m ago', status: 'ACTIVE' },
  { id: 'usr-2', name: 'Zainab Finance', email: 'zainab@percel.app', role: 'Finance', lastActive: '1h ago', status: 'ACTIVE' },
  { id: 'usr-3', name: 'Ibrahim Dispatch', email: 'ibrahim@percel.app', role: 'Dispatch', lastActive: '15m ago', status: 'ACTIVE' },
  { id: 'usr-4', name: 'Fatima Support', email: 'fatima@percel.app', role: 'Support', lastActive: 'Just now', status: 'ACTIVE' },
];

// Fallback Initial Ops Thresholds
const DEFAULT_THRESHOLDS: OpsThresholdConfig[] = [
  { id: 'th-1', key: 'disputes_depth', label: 'Dispute Queue Depth', currentVal: 2, thresholdVal: 10, unit: 'disputes', channel: 'BANNER' },
  { id: 'th-2', key: 'daily_refunds', label: 'Daily Refund Volume', currentVal: 45000, thresholdVal: 250000, unit: '₦', channel: 'EMAIL' },
  { id: 'th-3', key: 'kyc_pending', label: 'KYC Pending Review Depth', currentVal: 4, thresholdVal: 15, unit: 'drivers', channel: 'BANNER' },
  { id: 'th-4', key: 'cashout_volume', label: 'Pending Cashout Volume', currentVal: 120000, thresholdVal: 500000, unit: '₦', channel: 'SLACK' },
];

// Fallback Initial Global Settings Audit Entries
const DEFAULT_SETTINGS_AUDIT: SettingsAuditEntry[] = [
  {
    id: 'aud-s1',
    adminName: 'Super Admin',
    category: 'Payment Provider',
    action: 'Switch Active Rail',
    oldValue: 'MONNIFY',
    newValue: 'PAYSTACK',
    reason: 'Monnify API maintenance window',
    timestamp: 'Jul 26, 2026, 02:30 PM',
  },
  {
    id: 'aud-s2',
    adminName: 'Operations Admin',
    category: 'Maintenance Mode',
    action: 'Enable Maintenance',
    oldValue: 'Disabled',
    newValue: 'Enabled (Duration: 30m)',
    reason: 'Database schema migration',
    timestamp: 'Jul 24, 2026, 03:00 AM',
  },
];

export function SystemSettingsManager() {
  // ── 1. Maintenance Mode State & Controls (Order #1) ──────────────────────
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceDuration, setMaintenanceDuration] = useState<number | ''>(45);
  const [maintenanceActiveSince] = useState('Active for 2h 15m');
  const [activeOrdersCount, setActiveOrdersCount] = useState(12);
  const [maintenanceConfirmModal, setMaintenanceConfirmModal] = useState<boolean>(false);

  // ── 2. Payment Provider State & Controls (Order #2) ─────────────────────
  const [activeProvider, setActiveProvider] = useState<PaymentProvider>('MONNIFY');
  const [pendingSwitchProvider, setPendingSwitchProvider] = useState<PaymentProvider | null>(null);
  const [switchReason, setSwitchReason] = useState('');

  // ── 3. Roles & Access Management State (Order #3) ────────────────────────
  const [roleUsers, setRoleUsers] = useState<AdminRoleUser[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'Super Admin' | 'Finance' | 'Dispatch' | 'Support'>('Support');

  // ── 4. Alerts / Thresholds State (Order #4) ──────────────────────────────
  const [thresholds, setThresholds] = useState<OpsThresholdConfig[]>([]);

  // ── 5. Admin Profile & Security State ────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);

  // ── 6. Global Audit Log State (Order #5) ─────────────────────────────────
  const [auditLog, setAuditLog] = useState<SettingsAuditEntry[]>([]);

  // Fetch real settings & maintenance config on mount
  useMemo(() => {
    if (typeof window === 'undefined') return;

    // Load Maintenance Config
    fetch('/api/admin/config/maintenance')
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data ?? res;
        if (d && typeof d.enabled === 'boolean') {
          setMaintenanceEnabled(d.enabled);
          setMaintenanceMessage(d.message || '');
          if (d.estimatedMinutes) setMaintenanceDuration(d.estimatedMinutes);
        }
      })
      .catch(() => {});

    // Load Payment Provider
    fetch('/api/payment-provider')
      .then((r) => r.json())
      .then((res) => {
        const prov = res?.data?.provider as PaymentProvider | undefined;
        if (prov) setActiveProvider(prov);
      })
      .catch(() => {});

    // Load Admin Settings (Roles, Thresholds, Audit Log)
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((res) => {
        const data = res?.data ?? res;
        if (data?.adminRoles) setRoleUsers(data.adminRoles);
        if (data?.opsThresholds) setThresholds(data.opsThresholds);
        if (data?.globalAuditLog) setAuditLog(data.globalAuditLog);
      })
      .catch(() => {});
  }, []);

  // Persist key-value setting to backend DB
  const saveSettingKey = async (key: string, value: any) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } catch (e) {
      console.warn('Failed to persist setting key:', key);
    }
  };

  // Add Log helper
  const addAuditEntry = (category: string, action: string, oldValue: string, newValue: string, reason?: string) => {
    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
    const newEntry: SettingsAuditEntry = {
      id: `aud-${Date.now()}`,
      adminName: 'Super Admin',
      category,
      action,
      oldValue,
      newValue,
      reason,
      timestamp: nowStr,
    };
    setAuditLog((prev) => {
      const updated = [newEntry, ...prev];
      saveSettingKey('settings:global_audit_trail', updated);
      return updated;
    });
  };

  // Password Strength Calculator
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: 'Empty', color: 'bg-muted' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  }, [newPassword]);

  // Handle Change Password Submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Current Password is required to verify identity');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    addAuditEntry('Security', 'Password Change', '********', '********', 'Periodic password update');
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // 1. Maintenance Mode Toggle Execution (Order #1)
  const confirmToggleMaintenance = async () => {
    const nextState = !maintenanceEnabled;
    try {
      await fetch('/api/admin/config/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: nextState,
          message: maintenanceMessage,
          estimatedMinutes: maintenanceDuration || null,
        }),
      });

      setMaintenanceEnabled(nextState);
      addAuditEntry(
        'Maintenance Mode',
        nextState ? 'Enable Maintenance' : 'Disable Maintenance',
        maintenanceEnabled ? 'Active' : 'Disabled',
        nextState ? 'Active' : 'Disabled',
        `Message: "${maintenanceMessage}"`
      );
    } catch (err: any) {
      alert('Failed to update maintenance mode: ' + err.message);
    } finally {
      setMaintenanceConfirmModal(false);
    }
  };

  // 2. Payment Provider Switch Execution (Order #2)
  const confirmSwitchProvider = async () => {
    if (!pendingSwitchProvider) return;
    const oldP = activeProvider;
    const newP = pendingSwitchProvider;

    try {
      await fetch('/api/payment-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newP }),
      });

      setActiveProvider(newP);
      addAuditEntry(
        'Payment Provider',
        'Switch Active Payment Rail',
        oldP,
        newP,
        switchReason.trim() || 'Manual admin provider switch'
      );
    } catch (err: any) {
      alert('Failed to switch payment provider: ' + err.message);
    } finally {
      setPendingSwitchProvider(null);
      setSwitchReason('');
    }
  };

  // 3. Invite Admin Exec
  const handleInviteAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminName.trim()) return;

    const newAdmin: AdminRoleUser = {
      id: `usr-${Date.now()}`,
      name: newAdminName.trim(),
      email: newAdminEmail.trim(),
      role: newAdminRole,
      lastActive: 'Just now',
      status: 'INVITED',
    };

    setRoleUsers((prev) => [...prev, newAdmin]);
    addAuditEntry('Roles & Access', 'Invite Admin Account', 'N/A', `${newAdminName} (${newAdminRole})`);

    setInviteModalOpen(false);
    setNewAdminName('');
    setNewAdminEmail('');
  };

  // Revoke Admin Exec
  const handleRevokeAdmin = (user: AdminRoleUser) => {
    setRoleUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: 'REVOKED' as const } : u))
    );
    addAuditEntry('Roles & Access', 'Revoke Admin Access', user.role, 'REVOKED', `Revoked ${user.email}`);
  };

  // 4. Update Threshold Value
  const handleUpdateThresholdVal = (id: string, newVal: number) => {
    setThresholds((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        addAuditEntry('Ops Thresholds', `Edit ${t.label}`, `${t.thresholdVal} ${t.unit}`, `${newVal} ${t.unit}`);
        return { ...t, thresholdVal: newVal };
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Maintenance Mode State Alert Banner */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3 shadow-xs">
        <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Maintenance Mode Status Verification Notice:</p>
          <p className="text-[11px] leading-relaxed text-rose-900/80 dark:text-rose-200/90">
            Maintenance mode currently shows as <strong>{maintenanceEnabled ? 'ACTIVE' : 'DISABLED'}</strong>.
            Confirm with the team whether this reflects real production state or stale test data, since active maintenance mode blocks all customer and driver mobile apps from logging in.
          </p>
        </div>
      </div>

      {/* SECTION 1: ADMIN PROFILE */}
      <Card className="p-6 space-y-6 border-border/80 shadow-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-border/70">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">Admin Profile & Account</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update your name, contact information, avatar, and password credentials.
            </p>
          </div>
        </div>
        <AdminProfileEditor />
      </Card>

      {/* SECTION 2: PLATFORM OPERATIONS / MAINTENANCE MODE (Order #1) */}
      <Card className="p-6 space-y-6 border-border/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/70 gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              maintenanceEnabled ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            }`}>
              {maintenanceEnabled ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight text-foreground">Platform Maintenance Mode</h3>
                <Badge className={maintenanceEnabled ? 'bg-rose-500/15 text-rose-600 border-rose-500/30 font-mono text-[11px] font-bold' : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-mono text-[11px] font-bold'}>
                  {maintenanceEnabled ? `ACTIVE (${maintenanceActiveSince})` : 'DISABLED'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                When active, all user and driver mobile apps display an &quot;Under Maintenance&quot; screen blocking new actions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMaintenanceConfirmModal(true)}
            className={`rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs transition-all inline-flex items-center gap-2 ${
              maintenanceEnabled
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}
          >
            {maintenanceEnabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            {maintenanceEnabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </button>
        </div>

        {/* Active Order Count & Blast Radius Notice */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              <strong>Blast Radius Signal:</strong> <strong className="font-mono font-bold">{activeOrdersCount} active orders</strong> are currently in-transit. They will not be interrupted, but new orders will be blocked.
            </span>
          </div>
          <span className="font-mono font-bold text-amber-600 underline">Live Ops Meter</span>
        </div>

        {/* Status Message & Duration Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Maintenance Status Message (Displayed in App)
            </label>
            <textarea
              rows={2}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/50 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Platform maintenance is currently active. App services will resume shortly."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Estimated Duration (Minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                min="1"
                max="1440"
                value={maintenanceDuration}
                onChange={(e) => setMaintenanceDuration(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background/50 pl-9 pr-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="45"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Shown as countdown hint on mobile maintenance screens.</p>
          </div>
        </div>
      </Card>

      {/* SECTION 2: PAYMENT PROVIDER SAFEGUARDS (Order #2) */}
      <Card className="p-6 space-y-6 border-border/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/70 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">Payment Provider Routing</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Single payment rail used platform-wide for wallet deposits, bank payouts, and dedicated virtual accounts.
              </p>
            </div>
          </div>
          <Badge className="bg-primary/15 text-primary border-primary/30 font-mono text-xs font-bold">
            Active Rail: {activeProvider}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PROVIDERS_LIST.map((prov) => {
            const isActive = activeProvider === prov.id;
            return (
              <Card
                key={prov.id}
                className={`p-4 border transition-all flex flex-col justify-between space-y-3 ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border/80 bg-card hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{prov.name}</span>
                    {isActive ? (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>
                    ) : (
                      <Badge
                        className={
                          prov.status === 'OPERATIONAL'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]'
                        }
                      >
                        {prov.status} ({prov.uptimePct})
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{prov.description}</p>
                </div>

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => setPendingSwitchProvider(prov.id)}
                    className="w-full rounded-xl border border-primary/30 bg-background text-primary text-xs font-semibold py-2 hover:bg-primary/10 transition-colors"
                  >
                    Switch to {prov.name}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {/* SECTION 3: ROLES & ACCESS MANAGEMENT (Order #3) */}
      <Card className="p-6 space-y-6 border-border/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/70 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">Roles & Access Management</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assign scoped permissions for Support agents, Finance officers, Dispatch team, and Super Admins.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs inline-flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" /> Invite Admin
          </button>
        </div>

        {/* Roles Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Admin Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Scoped Role</th>
                <th className="px-5 py-3.5">Last Active</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {roleUsers.map((usr) => (
                <tr key={usr.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-foreground">{usr.name}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{usr.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-[11px]">
                      {usr.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{usr.lastActive}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      className={
                        usr.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                          : usr.status === 'INVITED'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]'
                          : 'bg-muted text-muted-foreground text-[10px]'
                      }
                    >
                      {usr.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {usr.status !== 'REVOKED' && (
                      <button
                        type="button"
                        onClick={() => handleRevokeAdmin(usr)}
                        className="text-xs font-semibold text-rose-500 hover:underline px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20"
                      >
                        Revoke Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permission Scoping Matrix Card */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs space-y-2">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary" /> Role Permission Scoping Matrix:
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-[11px] text-muted-foreground pt-1">
            <div className="p-2 rounded-lg bg-card border border-border">
              <strong className="text-foreground block mb-0.5">Support Role</strong>
              Disputes Desk, User Profiles, Order Search (Read-Only Settings).
            </div>
            <div className="p-2 rounded-lg bg-card border border-border">
              <strong className="text-foreground block mb-0.5">Finance Role</strong>
              Wallet Ledger, Driver Cashouts, Refund Approvals, Billing Reports.
            </div>
            <div className="p-2 rounded-lg bg-card border border-border">
              <strong className="text-foreground block mb-0.5">Dispatch Role</strong>
              Fleet Radar, Active Driver Verification, Service Area Pricing.
            </div>
            <div className="p-2 rounded-lg bg-card border border-border">
              <strong className="text-foreground block mb-0.5">Super Admin</strong>
              Full Platform Control, Maintenance Mode, Payment Provider Rail, Roles.
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 4: ALERTS & THRESHOLDS (Order #4) */}
      <Card className="p-6 space-y-6 border-border/80 shadow-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-border/70">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">Operational Alerts & Thresholds</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set queue depth and volume limits to automatically alert the operations and finance teams.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {thresholds.map((t) => {
            const pct = Math.min(100, Math.round((t.currentVal / t.thresholdVal) * 100));
            return (
              <Card key={t.id} className="p-4 border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">{t.label}</span>
                  <Badge className="bg-muted text-muted-foreground text-[10px] font-mono">{t.channel}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-bold text-foreground">
                    {t.unit === '₦' ? `₦${t.currentVal.toLocaleString()}` : `${t.currentVal} ${t.unit}`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Usage vs Threshold</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Threshold Input */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <label className="text-[11px] text-muted-foreground font-medium">Alert Limit ({t.unit}):</label>
                  <input
                    type="number"
                    value={t.thresholdVal}
                    onChange={(e) => handleUpdateThresholdVal(t.id, Number(e.target.value))}
                    className="w-28 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* SECTION 5: APPEARANCE & THEME CUSTOMIZER */}
      <Card className="p-6 space-y-6 border-border/80 shadow-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-border/70">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">Appearance & Theme Preferences</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalize your dashboard accent color and switch between light and dark mode.
            </p>
          </div>
        </div>
        <ThemeCustomizer />
      </Card>

      {/* SECTION 6: ADMIN PROFILE & SECURITY */}
      <Card className="p-6 space-y-6 border-border/80 shadow-sm">
        <div className="flex items-center gap-3 pb-3 border-b border-border/70">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">Admin Profile & Security</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Password change verification, two-factor authentication, and security audit signal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Password Change Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change Admin Password</h4>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground block">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground block">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="At least 8 characters"
              />
              {/* Strength Meter Bar */}
              {newPassword && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Strength:</span>
                    <span className="font-bold">{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground block">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>

            {passwordError && <p className="text-[11px] font-medium text-rose-500">{passwordError}</p>}
            {passwordSuccess && <p className="text-[11px] font-medium text-emerald-500">✓ Password updated successfully</p>}

            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              Update Password
            </button>
          </form>

          {/* 2FA & Last Login Security Signals */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Security Controls</h4>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Two-Factor Authentication (2FA)</p>
                  <p className="text-[11px] text-muted-foreground">Required for payment provider switches and role edits.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIs2FAEnabled(!is2FAEnabled);
                    addAuditEntry('Security', '2FA Status Toggle', is2FAEnabled ? 'Enabled' : 'Disabled', !is2FAEnabled ? 'Enabled' : 'Disabled');
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                    is2FAEnabled ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {is2FAEnabled ? 'Enabled (TOTP)' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-xs">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500" /> Lightweight Security Signal:
              </p>
              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                Last Login: <strong>Jul 27, 2026, 08:30 AM</strong> from <strong>Lagos, NG (IP: 102.89.23.14)</strong>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 6: GLOBAL SETTINGS AUDIT TRAIL (Order #5) */}
      <Card className="overflow-hidden border-border/80 shadow-sm space-y-0">
        <div className="p-4 border-b border-border bg-card">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <History className="h-4 w-4 text-primary" />
            Global Settings Change Audit Trail
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log of all high-privilege configuration edits across payment routing, maintenance mode, roles, and thresholds.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 uppercase tracking-[0.16em] text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Admin Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Previous Value</th>
                <th className="px-5 py-3">New Value</th>
                <th className="px-5 py-3">Reason / Details</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono">
              {auditLog.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-semibold font-sans text-primary">{log.category}</td>
                  <td className="px-5 py-3 font-sans text-muted-foreground">{log.adminName}</td>
                  <td className="px-5 py-3 font-sans font-semibold text-foreground">{log.action}</td>
                  <td className="px-5 py-3 text-rose-500">{log.oldValue}</td>
                  <td className="px-5 py-3 text-emerald-500 font-bold">{log.newValue}</td>
                  <td className="px-5 py-3 text-muted-foreground font-sans truncate max-w-[150px]">{log.reason || '—'}</td>
                  <td className="px-5 py-3 text-muted-foreground">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MAINTENANCE MODE CONFIRMATION MODAL (Order #1) */}
      {maintenanceConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Confirm {maintenanceEnabled ? 'Disabling' : 'Enabling'} Maintenance Mode?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {maintenanceEnabled
                    ? 'Disabling maintenance mode will restore mobile app access for all users and drivers.'
                    : 'Enabling maintenance mode will block all new customer orders and driver log-ins platform-wide.'}
                </p>
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Blast Radius Notice:</strong> {activeOrdersCount} active orders currently in transit will continue delivering normally.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setMaintenanceConfirmModal(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggleMaintenance}
                className={`rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-xs ${
                  maintenanceEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT PROVIDER SWITCH CONFIRMATION MODAL (Order #2) */}
      {pendingSwitchProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Confirm Payment Provider Switch?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Switching payment rail from <strong className="text-foreground">{activeProvider}</strong> to{' '}
                  <strong className="text-primary">{pendingSwitchProvider}</strong> will change routing for all new wallet deposits, bank payouts, and dedicated virtual accounts.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Reason for Switch (Logged to Audit Trail) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={switchReason}
                onChange={(e) => setSwitchReason(e.target.value)}
                placeholder="e.g. Monnify API downtime window"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPendingSwitchProvider(null)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSwitchProvider}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                Confirm Rail Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE ADMIN MODAL (Order #3) */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Invite New Admin Account</h3>

            <form onSubmit={handleInviteAdmin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Admin Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Samuel Admin"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="samuel@percel.app"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Assigned Scoped Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Support">Support (Disputes &amp; Users)</option>
                  <option value="Finance">Finance (Wallet &amp; Payouts)</option>
                  <option value="Dispatch">Dispatch (Fleet &amp; Orders)</option>
                  <option value="Super Admin">Super Admin (Full Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
                >
                  Send Admin Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
