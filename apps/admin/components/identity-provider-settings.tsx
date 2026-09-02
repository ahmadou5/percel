'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type IdentityProvider = 'SMILE' | 'DOJAH' | 'PREMBLY' | 'NONE';

const providers: Array<{ value: IdentityProvider; label: string; description: string; keys: string }> = [
  {
    value: 'NONE',
    label: 'None (BVN self-asserted)',
    description: 'Drivers onboard with BVN alone. NIN verification stays unavailable ("coming soon").',
    keys: 'No external account required',
  },
  {
    value: 'SMILE',
    label: 'Smile Identity',
    description: 'NIN + BVN database verification via Smile Identity.',
    keys: 'Requires SMILE_IDENTITY_PARTNER_ID + SMILE_IDENTITY_API_KEY env vars',
  },
  {
    value: 'DOJAH',
    label: 'Dojah',
    description: 'NIN/BVN lookup via Dojah KYC APIs (recommended, easy signup).',
    keys: 'Requires DOJAH_APP_ID + DOJAH_SECRET_KEY env vars',
  },
  {
    value: 'PREMBLY',
    label: 'Prembly (IdentityPass)',
    description: 'NIN/BVN verification via Prembly biometrics data APIs.',
    keys: 'Requires PREMBLY_API_KEY (+ optional PREMBLY_APP_ID) env vars',
  },
];

export function IdentityProviderSettings() {
  const [activeProvider, setActiveProvider] = useState<IdentityProvider>('NONE');
  const [selectedProvider, setSelectedProvider] = useState<IdentityProvider>('NONE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/identity-provider')
      .then((response) => response.json())
      .then((payload) => {
        const provider = payload?.data?.provider as IdentityProvider | undefined;
        if (!cancelled && provider) {
          setActiveProvider(provider);
          setSelectedProvider(provider);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage('Unable to load identity provider.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges = useMemo(() => selectedProvider !== activeProvider, [activeProvider, selectedProvider]);

  async function saveProvider() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/identity-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message ?? 'Failed to save identity provider.');
      }

      setActiveProvider(selectedProvider);
      setMessage('Identity provider updated.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save identity provider.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Identity Verification Provider</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Powers driver NIN/BVN checks. BVN always onboards drivers; a provider is only needed for real
          NIN verification. Configure the matching env vars before switching.
        </p>
      </div>

      {loading ? (
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((provider) => (
            <button
              key={provider.value}
              type="button"
              onClick={() => setSelectedProvider(provider.value)}
              className={cn(
                'text-left rounded-xl border p-4 transition-all cursor-pointer',
                selectedProvider === provider.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">{provider.label}</span>
                {activeProvider === provider.value && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{provider.description}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{provider.keys}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className={cn('text-xs', message?.startsWith('Identity provider updated') ? 'text-emerald-500' : 'text-rose-500')}>
          {message}
        </p>
        <Button onClick={saveProvider} disabled={!hasChanges || saving} loading={saving}>
          Save changes
        </Button>
      </div>
    </Card>
  );
}
