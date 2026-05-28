'use client';

import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin dashboard</p>
        <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{error.message || 'The dashboard could not load. Try again to retry the request.'}</p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
