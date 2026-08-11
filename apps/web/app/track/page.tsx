'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function TrackSearchPage() {
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;
    const cleanCode = trackingCode.trim();
    router.push(`/track/${encodeURIComponent(cleanCode)}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 pt-24 sm:pt-28 sm:px-6 lg:px-8 space-y-10">
      {/* Back Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Track Form Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="apple-glass rounded-3xl border border-white/15 bg-card/90 p-8 sm:p-12 shadow-2xl backdrop-blur-2xl text-center space-y-6"
      >
        <motion.div
          whileHover={{ scale: 1.08, rotate: 5 }}
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/30 shadow-glow-primary"
        >
          <Search className="h-7 w-7" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Track Your Delivery
          </h1>
          <p className="mx-auto max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Enter your Percel Order ID or Tracking Code (e.g. <span className="font-mono font-bold text-foreground">TRK-AAFE9195</span>) to check live courier location and status.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="e.g. TRK-AAFE9195 or Order ID"
              className="w-full rounded-2xl border border-white/15 bg-slate-900/90 px-5 py-4 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
              required
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="apple-button absolute right-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-glow-primary flex items-center gap-1.5"
            >
              <span>Track</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </form>

        {/* Helpful Tips & Demo Shortcut */}
        <div className="pt-4 border-t border-white/10 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Public real-time GPS tracking</span>
          </div>
          <p className="text-[11px]">
            Tracking code is provided when your order is placed.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
