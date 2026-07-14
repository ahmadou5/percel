'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

type Audience = 'all' | 'users' | 'drivers';

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string; description: string }> = [
  { value: 'all', label: 'Everyone', description: 'All users and drivers with push tokens' },
  { value: 'users', label: 'Users only', description: 'Customer accounts (non-drivers)' },
  { value: 'drivers', label: 'Drivers only', description: 'Accounts with an active driver profile' },
];

type BroadcastResult = { sent: number; failed: number; total: number } | null;

export function BroadcastForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BroadcastResult>(null);
  const [error, setError] = useState<string | null>(null);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !loading;

  async function send() {
    if (!canSend) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload: Record<string, unknown> = { title: title.trim(), body: body.trim(), audience };
      if (deepLink.trim()) payload.data = { screen: deepLink.trim() };

      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.message ?? json?.data?.message ?? 'Broadcast failed');
      }

      setResult(json?.data ?? null);
      setTitle('');
      setBody('');
      setDeepLink('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-5 p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Send a broadcast</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Push a notification to all or a specific segment of Percel users in real time.
          </p>
        </div>
        <Button onClick={send} loading={loading} disabled={!canSend} className="shrink-0">
          Send broadcast
        </Button>
      </div>

      {/* Audience selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        {AUDIENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setAudience(option.value)}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              audience === option.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
          </button>
        ))}
      </div>

      {/* Message fields */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Notification title
          </label>
          <Input
            id="broadcast-title"
            placeholder="e.g. New features available"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Message body
          </label>
          <textarea
            id="broadcast-body"
            placeholder="e.g. We've added faster bill payments and a new home screen. Open the app to explore."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={600}
            rows={3}
            className="flex w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground text-right">{body.length}/600</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Deep link <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <Input
            id="broadcast-deeplink"
            placeholder="e.g. /wallet/transactions or /orders"
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Tapping the notification will navigate to this screen inside the app.
          </p>
        </div>
      </div>

      {/* Result feedback */}
      {result && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">Broadcast sent ✓</p>
          <p className="mt-0.5 text-muted-foreground">
            <span className="text-foreground">{result.sent}</span> delivered&ensp;·&ensp;
            <span className={result.failed > 0 ? 'text-destructive' : 'text-foreground'}>{result.failed}</span> failed&ensp;·&ensp;
            {result.total} recipients found
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}
