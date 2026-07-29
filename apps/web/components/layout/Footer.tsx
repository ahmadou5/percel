import Link from 'next/link';
import Image from 'next/image';
import { Download, ShieldCheck, MapPin, Lock, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-background/95 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:gap-12">
          {/* Column 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/80 bg-card p-1.5 shadow-sm">
                <Image
                  src="/logo-transparent.png"
                  alt="Percel Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-foreground">Percel</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Premier intra-state and interstate mobile delivery platform. Fast, transparent, and KYC-verified logistics connecting senders and riders across major cities.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>KYC Verified Senders & Riders</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Navigation</h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features & Coverage
                </Link>
              </li>
              <li>
                <Link href="/download" className="text-muted-foreground hover:text-foreground transition-colors">
                  Download Android APK
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-muted-foreground hover:text-foreground transition-colors">
                  Track Package
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Logistics Coverage */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Coverage & Delivery</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>Lagos, Abuja, Port Harcourt & Kano</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                <span>Interstate Hub-to-Hub Express Route</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-warning" />
                <span>In-App Escrow Wallet Protection</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Download */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Get the App</h4>
            <p className="text-xs text-muted-foreground">
              Currently available via direct Android APK download while Google Play listing is processing.
            </p>
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-glow-primary hover:bg-primary/90 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download Percel APK (v1.0)</span>
            </Link>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Percel Logistics. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Built with passion for logistics</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
