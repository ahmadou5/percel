'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Power, PowerOff } from 'lucide-react';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimatedMinutes: number | null;
}

export function MaintenanceModeControl() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    enabled: false,
    message: '',
    estimatedMinutes: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch('/api/admin/config/maintenance')
      .then((r) => r.json())
      .then((payload) => {
        const data = payload?.data ?? payload;
        if (data && typeof data.enabled === 'boolean') {
          setConfig({
            enabled: data.enabled,
            message: data.message ?? '',
            estimatedMinutes: data.estimatedMinutes ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (newEnabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/config/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, enabled: newEnabled }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p?.message ?? 'Failed to update maintenance mode');
      }
      setConfig((c) => ({ ...c, enabled: newEnabled }));
      setSaved(true);
      clearTimeout(savedTimeout.current);
      savedTimeout.current = setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/config/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p?.message ?? 'Failed to save settings');
      }
      setSaved(true);
      clearTimeout(savedTimeout.current);
      savedTimeout.current = setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="maintenance-control maintenance-loading">
        <Loader2 size={20} className="spin" />
        <span>Loading maintenance status…</span>
      </div>
    );
  }

  return (
    <div className="maintenance-control">
      {/* Header */}
      <div className="mc-header">
        <div className="mc-header-info">
          <div className={`mc-status-dot ${config.enabled ? 'mc-dot-active' : 'mc-dot-off'}`} />
          <div>
            <h3 className="mc-title">Platform Maintenance Mode</h3>
            <p className="mc-subtitle">
              When enabled, all client apps show an &quot;Under Maintenance&quot; screen and block usage.
            </p>
          </div>
        </div>
        <button
          id="maintenance-toggle-btn"
          className={`mc-toggle-btn ${config.enabled ? 'mc-toggle-off' : 'mc-toggle-on'}`}
          onClick={() => handleToggle(!config.enabled)}
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={16} className="spin" />
          ) : config.enabled ? (
            <PowerOff size={16} />
          ) : (
            <Power size={16} />
          )}
          {config.enabled ? 'Disable Maintenance' : 'Enable Maintenance'}
        </button>
      </div>

      {/* Status Banner */}
      {config.enabled && (
        <div className="mc-alert mc-alert-active">
          <AlertTriangle size={16} />
          <span>
            <strong>Maintenance mode is active.</strong> Users and drivers are currently blocked from
            using the app.
          </span>
        </div>
      )}

      {/* Settings Form */}
      <div className="mc-form">
        <div className="mc-form-group">
          <label className="mc-label" htmlFor="maintenance-message">
            Status Message
          </label>
          <textarea
            id="maintenance-message"
            className="mc-textarea"
            rows={3}
            placeholder="e.g. We're upgrading our systems. We'll be back shortly!"
            value={config.message}
            onChange={(e) => setConfig((c) => ({ ...c, message: e.target.value }))}
          />
          <p className="mc-hint">Shown to users on the maintenance screen in the mobile apps.</p>
        </div>

        <div className="mc-form-group">
          <label className="mc-label" htmlFor="maintenance-duration">
            <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
            Estimated Duration (minutes)
          </label>
          <input
            id="maintenance-duration"
            className="mc-input"
            type="number"
            min={1}
            max={1440}
            placeholder="e.g. 30"
            value={config.estimatedMinutes ?? ''}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                estimatedMinutes: e.target.value ? parseInt(e.target.value, 10) : null,
              }))
            }
          />
          <p className="mc-hint">Optional. Shown as a countdown hint to users.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mc-footer">
        {error && (
          <p className="mc-error">
            <AlertTriangle size={14} /> {error}
          </p>
        )}
        {saved && !error && (
          <p className="mc-success">
            <CheckCircle2 size={14} /> Settings saved successfully
          </p>
        )}
        <button
          id="maintenance-save-btn"
          className="mc-save-btn"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
          Save Message &amp; Duration
        </button>
      </div>

      <style>{`
        .maintenance-control {
          background: linear-gradient(135deg, rgba(239,68,68,0.06), rgba(251,146,60,0.04));
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .maintenance-loading {
          flex-direction: row;
          align-items: center;
          gap: 10px;
          color: #9ca3af;
          font-size: 14px;
        }
        .mc-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .mc-header-info {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .mc-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-top: 6px;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.1);
        }
        .mc-dot-active {
          background: #ef4444;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.2);
          animation: pulse-red 2s infinite;
        }
        .mc-dot-off {
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.1); }
        }
        .mc-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--foreground, #111);
          margin: 0 0 2px 0;
        }
        .mc-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }
        .mc-toggle-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .mc-toggle-on {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.3);
        }
        .mc-toggle-on:hover:not(:disabled) {
          background: #ef4444;
          color: white;
        }
        .mc-toggle-off {
          background: rgba(34,197,94,0.1);
          color: #22c55e;
          border: 1px solid rgba(34,197,94,0.3);
        }
        .mc-toggle-off:hover:not(:disabled) {
          background: #22c55e;
          color: white;
        }
        .mc-toggle-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .mc-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.5;
        }
        .mc-alert-active {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #dc2626;
        }
        .mc-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .mc-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mc-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--foreground, #111);
          display: flex;
          align-items: center;
        }
        .mc-textarea, .mc-input {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--foreground, #111);
          background: var(--background, #fff);
          resize: vertical;
          transition: border-color 0.15s;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }
        .mc-textarea:focus, .mc-input:focus {
          outline: none;
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
        .mc-hint {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
        }
        .mc-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 4px;
          border-top: 1px solid rgba(0,0,0,0.06);
          flex-wrap: wrap;
        }
        .mc-error {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: #ef4444;
          margin: 0;
        }
        .mc-success {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: #22c55e;
          margin: 0;
        }
        .mc-save-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: var(--foreground, #111);
          color: var(--background, #fff);
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .mc-save-btn:hover:not(:disabled) { opacity: 0.85; }
        .mc-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
