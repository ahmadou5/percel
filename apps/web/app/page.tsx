'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, Search, ShieldCheck, MapPin, Truck, Zap, RefreshCw, Smartphone, ArrowRight, Shield, Award, Sparkles } from 'lucide-react';
import { PhoneMockup } from '@/components/hero/PhoneMockup';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
};

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16 pt-24 sm:pt-28">
      {/* ─── HERO SECTION ──────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-4 sm:pt-6 mb-12 sm:mb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Hero Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 text-center lg:col-span-7 lg:text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-extrabold text-primary shadow-xs">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <span>Next-Gen Mobile Logistics Platform</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.12] font-sans">
                Swift Intra & Interstate Delivery <span className="text-primary font-black">Made Simple</span>
              </h1>

              <p className="mx-auto max-w-2xl text-sm text-muted-foreground lg:mx-0 sm:text-base leading-relaxed">
                Percel powers door-to-door intra-state dispatch and hub-to-hub interstate freight with KYC-verified couriers, live GPS order tracking, and escrow wallet security.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                  <Link
                    href="/download"
                    className="apple-button w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-sm font-extrabold text-white shadow-glow-primary transition-all"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download APK (Direct)</span>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                  <Link
                    href="/track"
                    className="apple-card w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-bold text-foreground transition-all shadow-xs"
                  >
                    <Search className="h-5 w-5 text-primary" />
                    <span>Track an Order</span>
                  </Link>
                </motion.div>
              </div>

              {/* Android Note */}
              <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-muted-foreground pt-1">
                <Smartphone className="h-4 w-4 text-accent" />
                <span>Direct Android APK (v1.0.4) • Instant Download</span>
              </div>
            </motion.div>

            {/* Hero Phone Mockup with Generous Spacing */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex justify-center pt-6 lg:pt-0"
            >
              <PhoneMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─────────────────────────────── */}
      <section id="how-it-works" className="relative mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Simple 4-Step Process
          </span>
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl tracking-tight">
            How Delivery Works on Percel
          </h2>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-muted-foreground">
            Whether sending a small parcel within state or interstate waybill freight across hubs.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              step: '01',
              title: 'Select Delivery Mode',
              desc: 'Choose explicitly between Intra-State bike dispatch or Interstate hub route.',
              icon: MapPin,
            },
            {
              step: '02',
              title: 'Instant Fare Quote',
              desc: 'Transparent pricing calculated instantly based on weight, distance, and route.',
              icon: Zap,
            },
            {
              step: '03',
              title: 'KYC Rider Pick Up',
              desc: 'A background-checked, verified rider accepts and picks up your parcel.',
              icon: ShieldCheck,
            },
            {
              step: '04',
              title: 'Live GPS Tracking',
              desc: 'Share tracking link with recipient and monitor courier progress on Google Maps.',
              icon: RefreshCw,
            },
          ].map((item) => (
            <motion.div
              key={item.step}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.01 }}
              className="apple-card group relative overflow-hidden rounded-3xl border border-white/15 bg-card/60 p-6 backdrop-blur-xl transition-all shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-2xl font-black text-muted-foreground/30">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-5 text-base font-extrabold text-foreground">{item.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── FEATURES GRID SECTION ───────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="apple-glass rounded-3xl border border-white/15 bg-card/85 p-8 sm:p-12 backdrop-blur-2xl shadow-xl space-y-8"
        >
          <div className="text-center space-y-2.5">
            <span className="text-xs font-extrabold uppercase tracking-widest text-accent">
              Core Capabilities
            </span>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl tracking-tight">
              Engineered for Modern Logistics Realities
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <motion.div whileHover={{ y: -4 }} className="space-y-3 rounded-2xl border border-white/10 bg-background/80 p-6 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">KYC-Verified Couriers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every rider undergoes mandatory NIN/BVN verification and vehicle registration before accepting delivery requests.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="space-y-3 rounded-2xl border border-white/10 bg-background/80 p-6 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent border border-accent/30">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Interstate Freight Hubs</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect major urban centers (Lagos, Abuja, Port Harcourt, Kano, Ibadan) with reliable hub-to-hub cargo logistics.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="space-y-3 rounded-2xl border border-white/10 bg-background/80 p-6 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success border border-success/30">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">In-App Escrow Wallet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pay securely through your Percel wallet with instant refund protection if delivery issues ever arise.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── TRUST & METRICS SECTION ────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { metric: 'Every', label: 'delivery escrowed until you confirm', fact: true },
            { metric: 'KYC', label: 'verified drivers only, ID checked before first pickup', fact: true },
            { metric: 'Live GPS', label: 'tracking on every interstate waybill', fact: true },
            { metric: '₦', label: 'wallet with instant refunds if no driver accepts', fact: true },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="apple-card rounded-3xl border border-white/15 bg-card/60 p-6 text-center backdrop-blur-xl shadow-sm"
            >
              <p className={`font-black text-2xl sm:text-3xl font-mono ${stat.fact ? 'text-foreground' : 'text-primary'}`}>
                {stat.metric}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DOWNLOAD CTA CARD ─────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-background p-8 sm:p-12 shadow-2xl"
        >
          <div className="max-w-2xl space-y-5">
            <span className="rounded-full bg-accent/20 border border-accent/40 px-3.5 py-1 text-xs font-bold text-accent">
              Direct Android APK Available
            </span>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-4xl tracking-tight">
              Get Started with Percel Mobile App
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Percel is currently distributed via direct APK download while Google Play store listing is pending. Installation takes under 60 seconds!
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/download"
                  className="apple-button flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-extrabold text-white shadow-glow-primary transition-all"
                >
                  <Download className="h-5 w-5" />
                  <span>Go to APK Download Page</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
