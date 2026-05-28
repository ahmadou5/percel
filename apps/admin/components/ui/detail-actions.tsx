'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

type ActionSpec = {
  label: string;
  tone?: 'default' | 'secondary' | 'ghost' | 'danger';
  prompt?: string;
  successMessage: string;
};

export function DetailActions({ actions }: { actions: ActionSpec[] }) {
  const [busy, setBusy] = useState<string | null>(null);

  const runAction = async (action: ActionSpec) => {
    if (action.prompt) {
      const answer = window.prompt(action.prompt);
      if (answer == null) return;
    }

    setBusy(action.label);
    window.setTimeout(() => {
      window.alert(action.successMessage);
      setBusy(null);
    }, 250);
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
