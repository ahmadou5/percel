'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2, Save, User } from 'lucide-react';

type AdminUser = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
};

export function AdminProfileEditor() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch('/api/admin/profile')
      .then((r) => r.json())
      .then((payload) => {
        const u = payload?.data as AdminUser;
        if (u) {
          setUser(u);
          setFirstName(u.firstName ?? '');
          setLastName(u.lastName ?? '');
          setPhone(u.phone ?? '');
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        setError(p?.message ?? 'Update failed');
      } else {
        setSaved(true);
        clearTimeout(savedTimeout.current);
        savedTimeout.current = setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        setError(p?.message ?? 'Password change failed');
      } else {
        setSaved(true);
        setCurrentPassword('');
        setNewPassword('');
        clearTimeout(savedTimeout.current);
        savedTimeout.current = setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const initials = [(user?.firstName ?? '').charAt(0), (user?.lastName ?? '').charAt(0)]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'A';

  return (
    <div className="space-y-6">
      {/* Avatar row */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/30 text-xl font-bold text-primary">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="Avatar"
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Admin' : 'Loading…'}
          </p>
          <p className="text-sm text-muted-foreground">{user?.email ?? ''}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
        {[
          { key: 'profile' as const, label: 'Profile info', Icon: User },
          { key: 'password' as const, label: 'Change password', Icon: KeyRound },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Profile form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="First name"
              value={firstName}
              onChange={setFirstName}
              placeholder="John"
            />
            <Field
              label="Last name"
              value={lastName}
              onChange={setLastName}
              placeholder="Doe"
            />
          </div>
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="+234 800 000 0000"
            type="tel"
          />
          <Field
            label="Email"
            value={user?.email ?? ''}
            onChange={() => {}}
            placeholder=""
            disabled
            hint="Email cannot be changed here."
          />
          <SubmitButton saving={saving} saved={saved} />
        </form>
      )}

      {/* Password form */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrentPw}
            onToggle={() => setShowCurrentPw((v) => !v)}
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPw}
            onToggle={() => setShowNewPw((v) => !v)}
          />
          <SubmitButton saving={saving} saved={saved} label="Update password" />
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({
  saving,
  saved,
  label = 'Save changes',
}: {
  saving: boolean;
  saved: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={saving}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
        saved
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {saving ? (
        <Loader2 size={15} className="animate-spin" />
      ) : saved ? (
        <Check size={15} />
      ) : (
        <Save size={15} />
      )}
      {saved ? 'Saved!' : label}
    </button>
  );
}
