'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Download, Search, Menu, X, ShieldCheck, Truck } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#features', label: 'Features' },
    { href: '/track', label: 'Track Order' },
    { href: '/download', label: 'Download APK' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/80 bg-card p-1.5 shadow-sm transition-transform group-hover:scale-105">
            <Image
              src="/logo-transparent.png"
              alt="Percel Logo"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-foreground">Percel</span>
              <span className="rounded-full border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                NIGERIA
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground tracking-wide">
              Fast Intra & Interstate Logistics
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-muted/80 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/track"
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-4 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted hover:border-primary/40 shadow-xs"
          >
            <Search className="h-4 w-4 text-primary" />
            <span>Track Order</span>
          </Link>
          <Link
            href="/download"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-glow-primary transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            <span>Get APK</span>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-xl border border-border bg-card p-2 text-foreground hover:bg-muted focus:outline-none md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-border/80 bg-card/95 px-4 py-5 backdrop-blur-2xl md:hidden animate-slide-up">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/60"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-border/60">
              <Link
                href="/track"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground"
              >
                <Search className="h-4 w-4 text-primary" />
                Track Order
              </Link>
              <Link
                href="/download"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white shadow-glow-primary"
              >
                <Download className="h-4 w-4" />
                Download APK Direct
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
