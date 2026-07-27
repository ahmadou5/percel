import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { loadDashboardWallet, loadDriverPayouts } from '@/lib/admin-data';
import { Banknote, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export default async function DriverPayoutsPage() {
  const [walletData, payouts] = await Promise.all([
    loadDashboardWallet(),
    loadDriverPayouts(),
  ]);

  const pendingPayouts = payouts.filter((p) => p.status === 'PENDING');
  const pendingTotal = pendingPayouts.reduce((sum, p) => {
    const numeric = Number(p.amount.replace(/[₦,]/g, ''));
    return sum + (isNaN(numeric) ? 0 : numeric);
  }, 0);

  const platformBalance = walletData.walletStats.find((s) => s.label.toLowerCase().includes('platform'))?.value ?? '₦0';
  const pendingSettlement = walletData.walletStats.find((s) => s.label.toLowerCase().includes('pending'))?.value ?? `₦${pendingTotal.toLocaleString()}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Banknote className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Driver Payouts & Cashouts</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and approve driver earnings withdrawal requests to Nigerian bank accounts via Monnify NIP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/wallet"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            ← Wallet Overview
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Pending Queue</p>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-3 font-mono text-2xl font-extrabold text-warning">{pendingSettlement}</p>
          <p className="mt-1 text-xs text-muted-foreground">{pendingPayouts.length} requests pending</p>
        </Card>
        <Card className="border-border/80 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Platform Balance</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 font-mono text-2xl font-extrabold text-foreground">{platformBalance}</p>
          <p className="mt-1 text-xs text-emerald-400">Sufficient to settle all requests</p>
        </Card>
        <Card className="border-border/80 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Settlement Channel</p>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 text-xl font-extrabold text-primary">Monnify Transfer</p>
          <p className="mt-1 text-xs text-muted-foreground">Automated NIBSS NIP payout</p>
        </Card>
      </div>

      {/* Pending Payout Queue Table */}
      {pendingPayouts.length === 0 ? (
        <Card className="border-border/80 p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-4 text-base font-bold text-foreground">All cashouts processed!</p>
          <p className="mt-1 text-sm text-muted-foreground">No pending withdrawal requests at this time.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border/80">
          <div className="border-b border-border bg-muted/40 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Pending Withdrawal Requests</span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-400">
                {pendingPayouts.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Instant NIP settlement upon approval</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/20 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Driver</th>
                  <th className="px-5 py-4">Bank Details</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Requested</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary border border-primary/20">
                          {payout.driverName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{payout.driverName}</div>
                          <div className="text-xs text-muted-foreground">{payout.driverPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{payout.bankName}</div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {payout.accountNumber} · {payout.accountName}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-foreground text-base">{payout.amount}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{payout.requestedAt}</td>
                    <td className="px-5 py-4 text-right">
                      <DetailActions
                        actions={[
                          {
                            label: 'Approve & Pay',
                            tone: 'default',
                            actionUrl: `/api/admin/payouts/${payout.id}/approve`,
                            successMessage: `Payout of ${payout.amount} approved for ${payout.driverName}`,
                          },
                          {
                            label: 'Reject',
                            tone: 'danger',
                            prompt: 'Reason for rejecting cashout request',
                            actionUrl: `/api/admin/payouts/${payout.id}/reject`,
                            successMessage: `Payout request rejected for ${payout.driverName}`,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
