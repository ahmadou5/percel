import { Suspense } from 'react';
import { loadDisputes } from '@/lib/admin-data';
import { DisputeDeskView } from '@/components/dispute-desk-view';

export default async function SupportDeskPage() {
  const disputes = await loadDisputes();

  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl border border-border bg-card/50 animate-pulse flex items-center justify-center text-sm font-bold text-muted-foreground">
          Loading Support & Dispute Desk...
        </div>
      }
    >
      <DisputeDeskView initialDisputes={disputes || []} />
    </Suspense>
  );
}
