'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, Menu, X, Palette, Smartphone } from 'lucide-react';
import { ThemeCustomizerModal } from '@/components/theme-customizer';

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#features', label: 'Features' },
    { href: '/track', label: 'Track Order' },
    { href: '/download', label: 'Download APK' },
  ];

  return (
    <>
      {/* Floating Apple-Style Translucent Glass Header */}
      <header className="fixed top-0 inset-x-0 z-50 w-full border-b border-white/10 bg-background/65 backdrop-blur-2xl saturate-180 transition-all shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-12 py-3.5">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-1.5 shadow-sm"
            >
              <Image
                src="/logo-transparent.png"
                alt="Percel Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight text-foreground font-sans">Percel</span>

            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Theme Customizer Trigger */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5 p-2.5 text-foreground hover:bg-white/15 transition-all shadow-xs"
              title="Customize Theme & Appearance"
            >
              <Palette className="h-4.5 w-4.5 text-primary" />
            </motion.button>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/track"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-white/15 hover:border-primary/40 shadow-xs"
              >
                <Search className="h-4 w-4 text-primary" />
                <span>Track Order</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/download"
                className="apple-button flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-white shadow-glow-primary transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Get APK</span>
              </Link>
            </motion.div>
          </div>

          {/* Mobile Toggle & Theme Button */}
          <div className="flex items-center gap-2.5 md:hidden">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-foreground hover:bg-white/15 focus:outline-none"
            >
              <Palette className="h-5 w-5 text-primary" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setMobileOpen((v: any) => !v)}
              className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-foreground hover:bg-white/15 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Dropdown - Apple-Style Translucent Glass Effect */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
              className="overflow-hidden inset-x-0 z-50 bg-background/0 backdrop-blur-4xl saturate-180 px-6 py-6 md:hidden space-y-4 shadow-sm"
            >
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <motion.div key={link.href} whileTap={{ scale: 0.98 }}>
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-xl px-4 py-3 text-sm font-bold transition-all ${isActive
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'text-foreground hover:bg-white/10 hover:text-primary'
                          }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
                <div className="mt-3 flex flex-col gap-2.5 pt-4 border-t border-white/10">
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/track"
                      onClick={() => setMobileOpen(false)}
                      className="apple-card flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-foreground"
                    >
                      <Search className="h-4 w-4 text-primary" />
                      <span>Track Order</span>
                    </Link>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Link
                      href="/download"
                      onClick={() => setMobileOpen(false)}
                      className="apple-button flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-extrabold text-white shadow-glow-primary"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download APK Direct</span>
                    </Link>
                  </motion.div>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Theme Customizer Modal */}
      <ThemeCustomizerModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </>
  );
}
