'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type PaymentProvider = 'MONNIFY' | 'PAYSTACK' | 'SQUAD';

const providers: Array<{ value: PaymentProvider; label: string; description: string }> = [
  { value: 'MONNIFY', label: 'Monnify', description: 'Default wallet funding and virtual account rail.' },
  { value: 'PAYSTACK', label: 'Paystack', description: 'Use Paystack checkout, bank lookup, transfers, and dedicated accounts.' },
  { value: 'SQUAD', label: 'Squad', description: 'Reserve Squad as the active system payment rail.' },
];

export function PaymentProviderSettings() {
  const [activeProvider, setActiveProvider] = useState<PaymentProvider>('MONNIFY');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('MONNIFY');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/payment-provider')
      .then((response) => response.json())
      .then((payload) => {
        const provider = payload?.data?.provider as PaymentProvider | undefined;
        if (!cancelled && provider) {
          setActiveProvider(provider);
          setSelectedProvider(provider);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage('Unable to load payment provider.');
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
      const response = await fetch('/api/payment-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message ?? payload?.error?.message ?? 'Unable to update provider');
      const provider = payload?.data?.provider as PaymentProvider;
      setActiveProvider(provider);
      setSelectedProvider(provider);
      setMessage('Payment provider updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update provider.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Payment provider</h3>
          <p className="mt-1 text-sm text-muted-foreground">Choose the single payment rail used across wallet funding, bank transfer, and virtual accounts.</p>
        </div>
        <Button onClick={saveProvider} loading={saving} disabled={loading || !hasChanges}>Save provider</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {providers.map((provider) => {
          const selected = selectedProvider === provider.value;
          return (
            <button
              key={provider.value}
              type="button"
              onClick={() => setSelectedProvider(provider.value)}
              className={cn(
                'min-h-32 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted',
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{provider.label}</span>
                {activeProvider === provider.value ? <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">Active</span> : null}
              </span>
              <span className="mt-3 block text-sm leading-6 text-muted-foreground">{provider.description}</span>
            </button>
          );
        })}
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </Card>
  );
}
