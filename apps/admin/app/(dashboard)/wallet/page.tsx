import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { loadDashboardWallet } from '@/lib/admin-data';

export default async function WalletPage() {
  const { walletStats, transactions } = await loadDashboardWallet();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Wallet overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">Live commission, settlement, reconciliation, and reserve data from the Percel API.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {walletStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone="primary" />
        ))}
      </section>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Note</th></tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4 font-mono text-xs">{tx.reference}</td>
                <td className="px-5 py-4">{tx.category}</td>
                <td className="px-5 py-4 font-mono tabular-nums">{tx.amount}</td>
                <td className="px-5 py-4">{tx.status}</td>
                <td className="px-5 py-4 text-muted-foreground">{tx.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
