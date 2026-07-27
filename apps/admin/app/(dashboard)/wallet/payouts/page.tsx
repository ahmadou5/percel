import { Suspense } from 'react';
import { loadDashboardWallet, loadDriverPayouts } from '@/lib/admin-data';
import { DriverCashoutsTable } from '@/components/driver-cashouts-table';

export default async function DriverPayoutsPage() {
  const [walletData, payouts] = await Promise.all([
    loadDashboardWallet(),
    loadDriverPayouts(),
  ]);

  const platformBalance = walletData.walletStats.find((s) => s.label.toLowerCase().includes('platform'))?.value ?? '₦8,420,000';

  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl border border-border bg-card/50 animate-pulse flex items-center justify-center text-sm font-bold text-muted-foreground">
          Loading Driver Cashout Telemetry...
        </div>
      }
    >
      <DriverCashoutsTable initialPayouts={payouts} platformBalanceStr={platformBalance} />
    </Suspense>
  );
}
