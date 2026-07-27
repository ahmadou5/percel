'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
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
  X,
  ChevronRight,
} from 'lucide-react';

const SEARCH_ITEMS = [
  { href: '/dashboard', title: 'Dashboard', sub: 'Operations overview & KPI metrics', category: 'Pages', Icon: LayoutDashboard },
  { href: '/orders/live-map', title: 'Live Fleet Radar', sub: 'Interactive OpenStreetMap GPS dispatch', category: 'Pages', Icon: Radar },
  { href: '/orders', title: 'Order Registry', sub: 'Shipment records & status audit', category: 'Pages', Icon: Package },
  { href: '/drivers', title: 'Driver Roster', sub: 'Driver fleet & KYC approvals', category: 'Pages', Icon: Truck },
  { href: '/users', title: 'User Directory', sub: 'Customer accounts & wallet balances', category: 'Pages', Icon: Users },
  { href: '/wallet', title: 'Wallet Activity', sub: 'Transaction ledgers & revenue stats', category: 'Pages', Icon: Wallet },
  { href: '/wallet/payouts', title: 'Driver Cashouts', sub: 'Review pending NIP bank transfers', category: 'Finance', Icon: Banknote },
  { href: '/support', title: 'Support & Disputes', sub: 'Order chat transcripts & customer refunds', category: 'Support', Icon: Headphones },
  { href: '/service-areas', title: 'Service Areas', sub: 'City coverage & base pricing', category: 'Settings', Icon: MapPin },
  { href: '/hubs', title: 'Hubs & Routes', sub: 'Interstate hub routes & pricing modifiers', category: 'Settings', Icon: Building2 },
  { href: '/notifications', title: 'Push Broadcasts', sub: 'Send global mobile notifications', category: 'Tools', Icon: Bell },
  { href: '/settings', title: 'System Settings', sub: 'Maintenance mode & admin accounts', category: 'Settings', Icon: Settings },
];

export function CommandSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via parent
          const searchBtn = document.getElementById('global-search-trigger');
          searchBtn?.click();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = SEARCH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.sub.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const navigateTo = (href: string) => {
    onClose();
    setQuery('');
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-glow backdrop-blur-xl z-10 animate-slide-up">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3.5">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, users, drivers, orders (⌘K)..."
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="rounded border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.href}
                onClick={() => navigateTo(item.href)}
                className="group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg border border-border/80 bg-muted/50 text-muted-foreground transition-transform group-hover:scale-105 group-hover:text-primary">
                    <item.Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{item.title}</span>
                      <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching pages or operations found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border/60 bg-muted/30 px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with ↵ Enter</span>
          <span>Percel Command Palette</span>
        </div>
      </div>
    </div>
  );
}
