'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Radar,
  Wallet,
  Banknote,
  Headphones,
  MapPin,
  Building2,
  Bell,
  Settings,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';

import { ADMIN_APP_TITLE } from '@/lib/session';
import { cn } from '@/lib/cn';

const navGroups = [
  {
    title: 'Main Navigation',
    items: [
      { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
      { href: '/orders/live-map', label: 'Live Fleet Radar', Icon: Radar, exact: true },
      { href: '/orders', label: 'Orders', Icon: Package, exact: false, exclude: ['/orders/live-map'] },
      { href: '/drivers', label: 'Drivers Fleet', Icon: Truck, exact: false },
      { href: '/users', label: 'Users & Customers', Icon: Users, exact: false },
    ],
  },
  {
    title: 'Finance & Support',
    items: [
      { href: '/wallet', label: 'Wallet & Revenue', Icon: Wallet, exact: false, exclude: ['/wallet/payouts'] },
      { href: '/wallet/payouts', label: 'Driver Cashouts', Icon: Banknote, exact: true },
      { href: '/support', label: 'Support & Disputes', Icon: Headphones, exact: false },
    ],
  },
  {
    title: 'Network & Config',
    items: [
      { href: '/service-areas', label: 'Service Areas', Icon: MapPin, exact: false },
      { href: '/hubs', label: 'Hubs & Routes', Icon: Building2, exact: false },
      { href: '/notifications', label: 'Broadcast Alerts', Icon: Bell, exact: false },
      { href: '/settings', label: 'System Settings', Icon: Settings, exact: false },
    ],
  },
];

/**
 * Determines if a nav item should be highlighted as active.
 * - exact=true  → only when pathname === href
 * - exact=false → when pathname starts with href/, UNLESS the path matches one of the excludes
 */
function isActive(pathname: string, href: string, exact: boolean, exclude?: string[]) {
  if (exact) return pathname === href;
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) {
    // Check exclusions — if any excluded sub-route matches, this parent should NOT be active
    if (exclude?.some((ex) => pathname === ex || pathname.startsWith(`${ex}/`))) return false;
    return true;
  }
  return false;
}

export function Sidebar() {
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<{ name: string; email: string; initials: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    };
    try {
      const raw = getCookie('percel_admin_user');
      if (raw) {
        const user = JSON.parse(raw);
        // Backend returns fullName; fallback chain covers all shapes
        const name = (user.fullName ?? user.name ?? '').trim() || 'Administrator';
        const email = (user.email ?? '').trim() || 'admin@percel.app';
        const initials = name
          .split(' ')
          .filter(Boolean)
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        setAdminUser({ name, email, initials });
      }
    } catch {
      // silently ignore parse errors
    }
  }, []);

  return (
    <>
      {/* Mobile Top Bar Navigation Toggle Header */}
      <div className="flex items-center justify-between border-b border-border/80 bg-background px-4 py-3 lg:hidden sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border/80 bg-card p-1 shadow-xs">
            <img src="/logo-transparent.png" alt="Percel Logo" className="h-5 w-5 object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-xs tracking-tight text-foreground">{ADMIN_APP_TITLE}</span>
            <span className="ml-1 rounded-full bg-primary/20 border border-primary/40 px-1.5 py-[1px] text-[8px] font-bold text-primary">
              PRO
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="rounded-xl border border-border bg-card p-2 text-foreground hover:bg-muted focus:outline-none shadow-xs"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Content (Desktop Sticky + Mobile Slide-over Drawer) */}
      <aside
        className={cn(
          'border-b border-border/80 bg-background px-4 py-5 backdrop-blur-xl transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:flex lg:flex-col lg:border-b-0 lg:border-r z-50',
          mobileMenuOpen
            ? 'fixed inset-y-0 left-0 w-72 h-full shadow-2xl flex flex-col'
            : 'hidden lg:flex'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto pr-1">
          <div className="space-y-6 flex-1">
            {/* Brand Header */}
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/80 bg-card p-1.5 shadow-sm">
                  <img src="/logo-transparent.png" alt="Percel Logo" className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-foreground">{ADMIN_APP_TITLE}</span>
                    <span className="rounded-full bg-primary/20 border border-primary/40 px-1.5 py-[1px] text-[9px] font-bold text-primary">
                      PRO
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Logistics Console</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grouped Navigation */}
            <nav className="space-y-5">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(({ href, label, Icon, exact, exclude }) => {
                      const active = isActive(pathname, href, exact, exclude);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            'group flex min-h-9 items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150',
                            active
                              ? 'bg-muted text-foreground border border-primary/30 shadow-sm font-bold'
                              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                                active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                              )}
                            />
                            <span>{label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Admin User Profile Card — Reads from session cookie */}
          <div className="mt-4 pt-4 border-t border-border/70 shrink-0">
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-2.5 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-xs font-extrabold text-primary border border-primary/30 shrink-0">
                  {adminUser?.initials ?? 'AD'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{adminUser?.name ?? '…'}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{adminUser?.email ?? '…'}</p>
                </div>
              </div>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
