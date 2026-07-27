'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut, Search, Bell, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandSearchModal } from './command-search-modal';

export function Topbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Sync initial theme
    const stored = localStorage.getItem('percel_theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('percel_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('percel_theme', 'dark');
      setIsDark(true);
    }
  };

  const titleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/users': 'Users & Customers',
    '/drivers': 'Drivers Fleet',
    '/orders': 'Order Registry',
    '/orders/live-map': 'Live Fleet Radar',
    '/wallet': 'Wallet & Revenue',
    '/wallet/payouts': 'Driver Cashout Approval',
    '/support': 'Support & Disputes',
    '/service-areas': 'Service Areas',
    '/hubs': 'Hubs & Routes',
    '/notifications': 'Broadcast Alerts',
    '/settings': 'System Settings',
  };

  const section = pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
  const title =
    pathname.includes('/users/')
      ? 'User Detail'
      : pathname.includes('/drivers/')
      ? 'Driver Detail'
      : pathname.includes('/orders/') && !pathname.includes('live-map')
      ? 'Order Detail'
      : titleMap[pathname] ?? titleMap[`/${section}`] ?? 'Dashboard';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-xl md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Track daily logistics loads, live driver routes, and wallet transactions</p>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Command Search Bar Pill */}
            <button
              id="global-search-trigger"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-xs transition-all hover:border-primary/40 hover:text-foreground focus:outline-none"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Search anything...</span>
              <kbd className="ml-1 rounded border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
            </button>

            {/* Theme Toggler Button (Sun / Moon Switch) */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-card text-foreground transition-all hover:bg-muted focus:outline-none shadow-xs"
            >
              {isDark ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-primary" />}
            </button>

            {/* Notification Bell Badge */}
            <button className="relative grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-card text-muted-foreground transition-colors hover:text-foreground shadow-xs">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>

            {/* Sign Out Trigger */}
            <Button
              variant="secondary"
              onClick={logout}
              className="min-h-9 h-9 rounded-xl px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 border-border/80 shadow-xs"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Global Command Search Modal */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
