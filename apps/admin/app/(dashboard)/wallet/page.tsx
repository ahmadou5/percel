import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { adminWalletTransactions, walletStats } from '@/lib/admin-data';

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Wallet overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">Commission, settlement, reconciliation, and reserve tracking.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {walletStats.map((item: (typeof walletStats)[number]) => (
          <StatCard key={item.label} label={item.label} value={item.value} delta={item.delta} tone="primary" />
        ))}
      </section>
      <Card className="space-y-3 p-5">
        <h3 className="text-lg font-semibold tracking-tight">Reconciliation status</h3>
        <p className="text-sm text-muted-foreground">Paystack settlement is within expected tolerance. Pending reversals are isolated to disputed orders.</p>
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">Reconciliation batch: 100% matched · No stale settlements · Bank transfers confirmed</div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Reference</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Note</th>
            </tr>
          </thead>
          <tbody>
            {adminWalletTransactions.map((tx) => (
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
