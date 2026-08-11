'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Calendar, Filter, Wallet, ArrowRight } from 'lucide-react';
import type { AdminWalletTransaction } from '@/lib/admin-data';

export function TranscopeTransactionsTable({ transactions }: { transactions: AdminWalletTransaction[] }) {
  const [tab, setTab] = useState<'ALL' | 'TOPUP' | 'PAYOUT' | 'COMMISSION' | 'REFUND'>('ALL');

  const filtered = transactions.filter((t) => {
    if (tab === 'ALL') return true;
    if (tab === 'TOPUP') return t.category.toUpperCase().includes('TOP') || t.note.toLowerCase().includes('top-up') || t.note.toLowerCase().includes('fund');
    if (tab === 'PAYOUT') return t.category.toUpperCase().includes('CASHOUT') || t.note.toLowerCase().includes('cashout') || t.note.toLowerCase().includes('payout');
    if (tab === 'COMMISSION') return t.category.toUpperCase().includes('COMMISSION') || t.note.toLowerCase().includes('commission');
    if (tab === 'REFUND') return t.category.toUpperCase().includes('REFUND') || t.note.toLowerCase().includes('refund');
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4"
    >
      {/* Header & Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 glow-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">Platform Financial Transactions</h3>
            <p className="text-xs text-muted-foreground">Real-time audit log of customer deposits, courier payouts, and commissions</p>
          </div>
        </div>

        {/* Filter Pill Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs font-semibold overflow-x-auto">
          {(['ALL', 'TOPUP', 'PAYOUT', 'COMMISSION', 'REFUND'] as const).map((t) => (
            <motion.button
              key={t}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab(t)}
              className={`relative rounded-lg px-3 py-1.5 transition-all whitespace-nowrap ${
                tab === t ? 'bg-primary text-primary-foreground font-extrabold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'ALL'
                ? 'All Activity'
                : t === 'TOPUP'
                ? 'Wallet Top-ups'
                : t === 'PAYOUT'
                ? 'Driver Cashouts'
                : t === 'COMMISSION'
                ? 'Commissions'
                : 'Refunds'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Transactions Audit Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/80 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-3">Reference / Type</th>
              <th className="px-4 py-3">Description & Category</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount (NGN)</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No transaction records found matching filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((tx, index) => {
                const isCredit = tx.type === 'CREDIT';
                return (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    className="border-b border-border/50 transition-colors hover:bg-muted/30 last:border-b-0"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-primary/10 text-primary border-primary/30'
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <span className="font-mono font-extrabold text-foreground text-xs">{tx.reference || tx.id}</span>
                          <p className="text-[10px] text-muted-foreground font-semibold">{isCredit ? 'CREDIT / INFLOW' : 'DEBIT / OUTFLOW'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-foreground">{tx.note}</p>
                      <span className="rounded-full bg-muted border border-border/60 px-2 py-0.5 text-[9px] font-mono text-muted-foreground uppercase">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted-foreground text-[11px]">{tx.createdAt}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          tx.status === 'COMPLETED'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                            : tx.status === 'PENDING'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-extrabold text-sm">
                      <span className={isCredit ? 'text-emerald-400' : 'text-foreground'}>
                        {isCredit ? '+' : '-'}{tx.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href="/wallet" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs">
                        Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
