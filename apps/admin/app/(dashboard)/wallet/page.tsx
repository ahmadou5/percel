import { Suspense } from 'react';
import { loadDashboardWallet } from '@/lib/admin-data';
import { WalletDashboardTable } from '@/components/wallet-dashboard-table';

export default async function WalletPage() {
  const { walletStats, transactions } = await loadDashboardWallet();

  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl border border-border bg-card/50 animate-pulse flex items-center justify-center text-sm font-bold text-muted-foreground">
          Loading Wallet & Revenue Telemetry...
        </div>
      }
    >
      <WalletDashboardTable initialStats={walletStats} initialTransactions={transactions} />
    </Suspense>
  );
}
