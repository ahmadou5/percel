'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type ActionSpec = {
  label: string;
  tone?: 'default' | 'secondary' | 'ghost' | 'danger';
  prompt?: string;
  actionUrl?: string;
  actionMethod?: 'POST' | 'PUT';
  onClick?: () => void;
  successMessage: string;
};

export function DetailActions({ actions }: { actions: ActionSpec[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  const runAction = async (action: ActionSpec) => {
    if (action.onClick) {
      action.onClick();
      return;
    }

    let body: Record<string, unknown> | undefined;
    if (action.prompt) {
      const answer = window.prompt(action.prompt);
      if (answer == null) return;
      body = { reason: answer };
    }

    setBusy(action.label);
    try {
      if (action.actionUrl) {
        const res = await fetch(action.actionUrl, {
          method: action.actionMethod ?? 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.message ?? json?.data?.message ?? 'Action failed');
        }
      }

      window.alert(action.successMessage);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Network error occurred.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button key={action.label} variant={action.tone ?? 'secondary'} loading={busy === action.label} onClick={() => void runAction(action)}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
