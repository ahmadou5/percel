'use client';

import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function Topbar() {
  const pathname = usePathname();
  const titleMap: Record<string, string> = {
    '/dashboard': 'Overview',
    '/users': 'Users',
    '/drivers': 'Drivers',
    '/orders': 'Orders',
    '/wallet': 'Wallet',
    '/notifications': 'Notifications',
    '/settings': 'Settings',
  };
  const section = pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
  const title = pathname.includes('/users/') ? 'User detail' : pathname.includes('/drivers/') ? 'Driver detail' : pathname.includes('/orders/') ? 'Order detail' : titleMap[`/${section}`] ?? 'Overview';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <header className="border-b border-border/70 bg-background/85 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Percel Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <Button variant="secondary" onClick={logout} className="min-h-10 shrink-0">
          Logout
        </Button>
      </div>
    </header>
  );
}
