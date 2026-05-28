'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_APP_TITLE } from '@/lib/session';
import { cn } from '@/lib/cn';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/orders', label: 'Orders' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-border/70 bg-card/90 px-4 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="mb-8 space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          P
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">{ADMIN_APP_TITLE}</p>
          <p className="text-xs text-muted-foreground">Logistics control tower</p>
        </div>
      </div>

      <nav className="space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-border/70 bg-brand-sheen p-4">
        <p className="text-sm font-medium text-foreground">Premium operations</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Focused, high-density views for live dispatch, financial oversight, and escalation handling.
        </p>
      </div>
    </aside>
  );
}
