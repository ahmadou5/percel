import Link from 'next/link';
import Image from 'next/image';
import { Download, Search, ShieldCheck, MapPin, Truck, Zap, RefreshCw, Smartphone, CheckCircle, ArrowRight } from 'lucide-react';
import { PhoneMockup } from '@/components/hero/PhoneMockup';

export default function HomePage() {
  return (
    <div className="space-y-24 pb-20">
      {/* ─── HERO SECTION ──────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 lg:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Hero Text Content */}
            <div className="space-y-6 text-center lg:col-span-7 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <span>Next-Gen Nigerian Delivery Platform</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
                Swift Intra & Interstate Delivery Across <span className="bg-gradient-to-r from-primary via-indigo-400 to-accent bg-clip-text text-transparent">Nigeria</span>
              </h1>

              <p className="mx-auto max-w-2xl text-base text-muted-foreground lg:mx-0 sm:text-lg leading-relaxed">
                Percel powers door-to-door intra-state dispatch and hub-to-hub interstate freight with KYC-verified couriers, live GPS order tracking, and escrow wallet security.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/download"
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-sm font-extrabold text-white shadow-glow-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="h-5 w-5" />
                  <span>Download APK (Direct)</span>
                </Link>

                <Link
                  href="/track"
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-card/80 px-7 py-4 text-sm font-bold text-foreground hover:bg-muted hover:border-primary/40 transition-all shadow-xs"
                >
                  <Search className="h-5 w-5 text-primary" />
                  <span>Track an Order</span>
                </Link>
              </div>

              {/* Android Note */}
              <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-muted-foreground pt-1">
                <Smartphone className="h-4 w-4 text-accent" />
                <span>Direct Android APK (v1.0.4) • Free Download</span>
              </div>
            </div>

            {/* Hero Phone Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─────────────────────────────── */}
      <section id="how-it-works" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Simple 4-Step Process
          </span>
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            How Delivery Works on Percel
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Whether sending a small parcel across Lagos or freight from Ojota to Utako Hub in Abuja.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <div
              key={item.step}
              className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-6 backdrop-blur-xl transition-all hover:border-primary/50 hover:bg-card/90"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="font-mono text-2xl font-black text-muted-foreground/30">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-5 text-base font-extrabold text-foreground">{item.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES GRID SECTION ─────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border/80 bg-slate-900/60 p-8 sm:p-12 backdrop-blur-2xl">
          <div className="text-center space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-accent">
              Core Capabilities
            </span>
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Engineered for Nigerian Logistics Realities
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-3 rounded-2xl border border-border/60 bg-slate-950/60 p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/20 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">KYC-Verified Couriers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every rider undergoes mandatory NIN/BVN verification and vehicle registration before accepting delivery requests.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border/60 bg-slate-950/60 p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/20 text-accent">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Interstate Freight Hubs</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect major urban centers (Lagos, Abuja, Port Harcourt, Ibadan) with reliable hub-to-hub cargo logistics.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border/60 bg-slate-950/60 p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">In-App Escrow Wallet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pay securely through your Percel wallet with instant refund protection if delivery issues ever arise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST & METRICS SECTION ────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { metric: '15,000+', label: 'Successful Deliveries' },
            { metric: '99.4%', label: 'On-Time Completion' },
            { metric: '4 Major', label: 'State Hub Networks' },
            { metric: '4.9 ★', label: 'Average Rider Rating' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/80 bg-card/40 p-6 text-center backdrop-blur-xl"
            >
              <p className="font-extrabold text-2xl sm:text-3xl text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stat.metric}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DOWNLOAD CTA SECTION ──────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-slate-900 to-slate-950 p-8 sm:p-14 shadow-2xl">
          <div className="max-w-2xl space-y-5">
            <span className="rounded-full bg-accent/20 border border-accent/40 px-3 py-1 text-xs font-bold text-accent">
              Direct Android APK Available
            </span>
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Get Started with Percel Mobile App
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Percel is currently distributed via direct APK download while Google Play store listing is pending. Installation takes under 60 seconds!
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <Link
                href="/download"
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-extrabold text-white shadow-glow-primary hover:bg-primary/90 transition-all"
              >
                <Download className="h-5 w-5" />
                <span>Go to APK Download Page</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
