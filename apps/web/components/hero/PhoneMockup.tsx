'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, ShieldCheck, Navigation, ArrowRight, PackageCheck, Zap } from 'lucide-react';

export function PhoneMockup() {
  const [activeTab, setActiveTab] = useState<'INTRASTATE' | 'INTERSTATE'>('INTRASTATE');

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px]">
      {/* Glow Backdrop Effect */}
      <div className="absolute -inset-4 rounded-[48px] bg-gradient-to-tr from-primary/30 via-accent/20 to-indigo-500/30 blur-2xl opacity-60 animate-pulse-ring" />

      {/* Device Body Outer Border */}
      <div className="relative overflow-hidden rounded-[40px] border-4 border-slate-700/80 bg-slate-950 p-3 shadow-2xl shadow-slate-950/80">
        {/* Screen Notch */}
        <div className="absolute top-0 left-1/2 z-30 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900 border-b border-slate-800 flex items-center justify-center">
          <div className="h-2 w-12 rounded-full bg-slate-800" />
        </div>

        {/* Screen Inner */}
        <div className="relative flex flex-col min-h-[580px] rounded-[32px] bg-[#07111D] p-4 text-foreground pt-7 border border-border/60 overflow-hidden">
          {/* Top App Bar inside Mockup */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 border border-primary/40 text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-xs tracking-tight text-foreground">Percel Delivery</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Riders Active
            </span>
          </div>

          {/* Delivery Type Selector (Explicit Selection as required by prompt) */}
          <div className="mt-4">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Select Delivery Mode
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-900/90 p-1 border border-border/80">
              <button
                type="button"
                onClick={() => setActiveTab('INTRASTATE')}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  activeTab === 'INTRASTATE'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Intra-State
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('INTERSTATE')}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  activeTab === 'INTERSTATE'
                    ? 'bg-accent text-slate-950 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Interstate Hub
              </button>
            </div>
          </div>

          {/* Dynamic Content based on selected tab */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 space-y-3 flex-1 flex flex-col justify-between"
          >
            {/* Address Pickup / Delivery Card */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-3 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Pickup Location</p>
                  <p className="truncate text-xs font-bold text-foreground">
                    {activeTab === 'INTRASTATE' ? '12 Allen Avenue, Ikeja, Lagos' : 'Lagos Central Logistics Hub (Ojota)'}
                  </p>
                </div>
              </div>

              <div className="ml-3 h-3 border-l-2 border-dashed border-primary/40" />

              <div className="flex items-start gap-2.5">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold mt-0.5">
                  B
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Destination</p>
                  <p className="truncate text-xs font-bold text-foreground">
                    {activeTab === 'INTRASTATE' ? '45 Admiralty Way, Lekki Phase 1' : 'Abuja Main Hub (Utako Hub)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Courier Radar Animation Box */}
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-slate-900/80 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5 text-accent">
                  <Zap className="h-3.5 w-3.5 fill-accent" />
                  {activeTab === 'INTRASTATE' ? 'Express Dispatch' : 'Hub-to-Hub Freight'}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">PCL-7829-NG</span>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-950/80 p-2 border border-border/40">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 grid place-items-center text-primary font-bold text-xs">
                    CO
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Chidubem O.</p>
                    <p className="text-[9px] text-emerald-400 font-semibold">★ 4.9 • Yamaha Bike</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground">Estimated Delivery</p>
                  <p className="text-xs font-extrabold text-primary">{activeTab === 'INTRASTATE' ? '35 mins' : '24 Hours'}</p>
                </div>
              </div>
            </div>

            {/* Bottom CTA Button inside Mockup */}
            <div className="pt-2">
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3 text-center text-xs font-extrabold text-white shadow-glow-primary flex items-center justify-center gap-2"
              >
                <span>Confirm Order & Dispatch</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
