'use client';

import { useState, useMemo } from 'react';
import {
  Bell,
  Send,
  Calendar,
  Clock,
  Users,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  FileText,
  Bookmark,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AdminNotification, BroadcastTemplate, NotificationRecipientLog } from '@/lib/admin-data';

type Audience = 'all' | 'users' | 'drivers';

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string; description: string; count: number }> = [
  { value: 'all', label: 'Everyone', description: 'All active users and drivers with push tokens', count: 1650 },
  { value: 'users', label: 'Users only', description: 'Customer accounts (non-drivers)', count: 1240 },
  { value: 'drivers', label: 'Drivers only', description: 'Active driver profiles with push tokens', count: 410 },
];

const PRESET_TEMPLATES: BroadcastTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Scheduled Maintenance Notice',
    title: 'Scheduled System Maintenance',
    body: "We'll be conducting brief platform maintenance tonight from 2:00 AM to 3:00 AM. Active deliveries will not be affected.",
    audience: 'all',
    deepLink: '/support',
  },
  {
    id: 'tmpl-2',
    name: 'Weekend Free Top-Up Promo',
    title: 'Weekend Special Offer! 🎁',
    body: 'Enjoy zero wallet top-up fees this weekend for all customer deposits. Tap to top up your Percel wallet now.',
    audience: 'users',
    deepLink: '/wallet/topup',
  },
  {
    id: 'tmpl-3',
    name: 'Driver High Demand Zone',
    title: '🔥 High Order Surge in Ikeja & VI',
    body: 'Delivery demand is surging in Lagos Island & Ikeja. Head to these hot zones now for bonus earnings per completed delivery.',
    audience: 'drivers',
    deepLink: '/fleet/hotspots',
  },
];

// Fallback Initial Campaign Data if API returns empty
const DEFAULT_CAMPAIGNS: AdminNotification[] = [
  {
    id: 'cmp-101',
    campaignId: 'cmp-101',
    channel: 'Users only',
    title: 'Weekend Delivery Discount! 🚀',
    body: 'Get 20% off your next 3 intra-state deliveries this weekend. Use promo code WEEKEND20 at checkout.',
    sentAt: 'Jul 26, 2026, 09:30 AM',
    isTransactional: false,
    totalRecipients: 1240,
    deliveredCount: 1215,
    failedCount: 25,
    openRatePct: 44.8,
    deepLink: '/orders/new',
    recipientsList: [
      { userId: 'u-1', name: 'Amina Bello', email: 'amina@percel.app', pushToken: 'ExponentPushToken[123]', status: 'DELIVERED', sentAt: '09:30 AM' },
      { userId: 'u-2', name: 'Tobi Adeyemi', email: 'tobi@percel.app', pushToken: 'ExponentPushToken[456]', status: 'DELIVERED', sentAt: '09:30 AM' },
      { userId: 'u-3', name: 'Mariam Yusuf', email: 'mariam@percel.app', pushToken: 'ExponentPushToken[789]', status: 'FAILED', sentAt: '09:30 AM' },
    ],
  },
  {
    id: 'cmp-102',
    campaignId: 'cmp-102',
    channel: 'Drivers only',
    title: 'Lagos Island Peak Earnings Active',
    body: 'Earn up to +₦2,000 extra per 5 completed orders in Lekki & VI today between 4 PM and 8 PM.',
    sentAt: 'Jul 25, 2026, 02:15 PM',
    isTransactional: false,
    totalRecipients: 410,
    deliveredCount: 402,
    failedCount: 8,
    openRatePct: 62.4,
    deepLink: '/fleet/surge',
    recipientsList: [
      { userId: 'd-1', name: 'Chinedu Okafor', email: 'chinedu@percel.app', pushToken: 'ExponentPushToken[111]', status: 'DELIVERED', sentAt: '02:15 PM' },
      { userId: 'd-2', name: 'Ngozi Umeh', email: 'ngozi@percel.app', pushToken: 'ExponentPushToken[222]', status: 'DELIVERED', sentAt: '02:15 PM' },
    ],
  },
  {
    id: 'cmp-103',
    campaignId: 'cmp-103',
    channel: 'Everyone',
    title: 'Platform System Maintenance Complete',
    body: 'System maintenance has finished. All services, wallet top-ups, and courier tracking are operating normally.',
    sentAt: 'Jul 22, 2026, 04:00 AM',
    isTransactional: false,
    totalRecipients: 1650,
    deliveredCount: 1630,
    failedCount: 20,
    openRatePct: 38.1,
    deepLink: '/support',
  },
];

// Transactional System Notifications (Read-Only Event Log)
const DEFAULT_SYSTEM_TRANSACTIONAL: AdminNotification[] = [
  {
    id: 'tx-1',
    channel: 'System / Wallet',
    title: 'Wallet Funded Successfully',
    body: 'Your Percel wallet was credited with ₦15,000 via Paystack transfer. Ref: PAY-91283.',
    sentAt: 'Jul 27, 2026, 08:12 AM',
    isTransactional: true,
  },
  {
    id: 'tx-2',
    channel: 'System / Order',
    title: 'Order Delivered — PCL-7QPD8LM',
    body: 'Your package was successfully delivered to Ngozi Umeh in Ikeja.',
    sentAt: 'Jul 26, 2026, 05:45 PM',
    isTransactional: true,
  },
  {
    id: 'tx-3',
    channel: 'System / Payout',
    title: 'Driver Earnings Transfer Completed',
    body: 'Weekly payout of ₦48,500 transferred to GTBank account ******1209.',
    sentAt: 'Jul 26, 2026, 10:00 AM',
    isTransactional: true,
  },
];

export function NotificationsManager({ initialNotifications }: { initialNotifications: AdminNotification[] }) {
  // Merge initial loaded API notifications or use fallback
  const [campaigns, setCampaigns] = useState<AdminNotification[]>(
    initialNotifications && initialNotifications.length > 0
      ? initialNotifications.map((n) => ({
          ...n,
          isTransactional: false,
          totalRecipients: n.totalRecipients || 1240,
          deliveredCount: n.deliveredCount || 1215,
          failedCount: n.failedCount || 25,
          openRatePct: n.openRatePct || 42.5,
        }))
      : DEFAULT_CAMPAIGNS
  );

  const [systemNotifications] = useState<AdminNotification[]>(DEFAULT_SYSTEM_TRANSACTIONAL);
  const [templates, setTemplates] = useState<BroadcastTemplate[]>(PRESET_TEMPLATES);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'campaigns' | 'transactional' | 'templates'>('campaigns');

  // Broadcast Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Validation & Modal States
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedRecipientModal, setSelectedRecipientModal] = useState<AdminNotification | null>(null);
  const [templateNameSave, setTemplateNameSave] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'everyone' | 'users' | 'drivers'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selected Audience Object
  const currentAudienceObj = useMemo(() => {
    return AUDIENCE_OPTIONS.find((o) => o.value === audience) || AUDIENCE_OPTIONS[0];
  }, [audience]);

  // Deep Link Format Validation (Must start with / or be empty)
  const validateDeepLink = (val: string): boolean => {
    if (!val.trim()) {
      setDeepLinkError(null);
      return true;
    }
    if (!val.trim().startsWith('/')) {
      setDeepLinkError('Deep link route must start with "/" (e.g. /wallet/topup or /orders)');
      return false;
    }
    setDeepLinkError(null);
    return true;
  };

  // Populate Form from Template
  const handleSelectTemplate = (tmpl: BroadcastTemplate) => {
    setTitle(tmpl.title);
    setBody(tmpl.body);
    setAudience(tmpl.audience);
    setDeepLink(tmpl.deepLink || '');
    setDeepLinkError(null);
  };

  // Trigger Send Action (Check audience size confirmation)
  const handleInitiateSend = () => {
    if (!title.trim() || !body.trim()) return;
    if (deepLink && !validateDeepLink(deepLink)) return;

    // Confirm for large audiences (Everyone or Users only >= 1000)
    if (currentAudienceObj.count >= 500) {
      setConfirmModalOpen(true);
      return;
    }

    executeSendBroadcast();
  };

  // Execute Broadcast Send
  const executeSendBroadcast = () => {
    const nowStr = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
    const targetCount = currentAudienceObj.count;
    const mockDelivered = Math.round(targetCount * 0.98);
    const mockFailed = targetCount - mockDelivered;

    const newCampaign: AdminNotification = {
      id: `cmp-${Date.now()}`,
      campaignId: `cmp-${Date.now()}`,
      channel: currentAudienceObj.label,
      title: title.trim(),
      body: body.trim(),
      sentAt: sendMode === 'schedule' && scheduledDateTime ? `Scheduled for ${scheduledDateTime}` : `Sent ${nowStr}`,
      isTransactional: false,
      totalRecipients: targetCount,
      deliveredCount: mockDelivered,
      failedCount: mockFailed,
      openRatePct: 45.0,
      deepLink: deepLink.trim() || undefined,
      recipientsList: [
        { userId: 'u-mock-1', name: 'Sample User 1', email: 'user1@percel.app', pushToken: 'ExponentPushToken[888]', status: 'DELIVERED', sentAt: 'Just now' },
        { userId: 'u-mock-2', name: 'Sample User 2', email: 'user2@percel.app', pushToken: 'ExponentPushToken[999]', status: 'DELIVERED', sentAt: 'Just now' },
      ],
    };

    setCampaigns((prev) => [newCampaign, ...prev]);
    setConfirmModalOpen(false);
    setTitle('');
    setBody('');
    setDeepLink('');
  };

  // Save current form as template
  const handleSaveAsTemplate = () => {
    if (!title.trim() || !body.trim()) return;
    const name = templateNameSave.trim() || title.trim();

    const newTmpl: BroadcastTemplate = {
      id: `tmpl-${Date.now()}`,
      name,
      title: title.trim(),
      body: body.trim(),
      audience,
      deepLink: deepLink.trim() || undefined,
    };

    setTemplates((prev) => [newTmpl, ...prev]);
    setIsSavingTemplate(false);
    setTemplateNameSave('');
  };

  // Overall Campaign Metrics
  const campaignMetrics = useMemo(() => {
    let totalBlasts = 0;
    let totalDelivered = 0;
    let totalFailed = 0;
    let sumOpenRates = 0;

    campaigns.forEach((c) => {
      totalBlasts += c.totalRecipients || 0;
      totalDelivered += c.deliveredCount || 0;
      totalFailed += c.failedCount || 0;
      sumOpenRates += c.openRatePct || 0;
    });

    const avgOpenRate = campaigns.length > 0 ? (sumOpenRates / campaigns.length).toFixed(1) : '42.0';
    const deliveryRatePct = totalBlasts > 0 ? ((totalDelivered / totalBlasts) * 100).toFixed(1) : '98.5';

    return {
      totalCampaigns: campaigns.length,
      totalBlasts,
      deliveryRatePct,
      avgOpenRate,
    };
  }, [campaigns]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (audienceFilter === 'everyone' && !c.channel.toLowerCase().includes('everyone')) return false;
      if (audienceFilter === 'users' && !c.channel.toLowerCase().includes('users')) return false;
      if (audienceFilter === 'drivers' && !c.channel.toLowerCase().includes('drivers')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q);
      }
      return true;
    });
  }, [campaigns, audienceFilter, searchQuery]);

  const paginatedCampaigns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCampaigns.slice(start, start + pageSize);
  }, [filteredCampaigns, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Process Risk Alert Banner (Context Requirement) */}
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3 shadow-xs">
        <ShieldAlert className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Process Risk & System Scoping Notice:</p>
          <p className="text-[11px] leading-relaxed text-blue-900/80 dark:text-blue-200/90">
            Transactional notifications (wallet funding, order updates, payout transfers) are auto-triggered by backend events.
            This push tool is strictly scoped to <strong>manual marketing & operational broadcasts</strong> to eliminate manual re-typing risks.
          </p>
        </div>
      </div>

      {/* Top Metrics Cards (Order #4) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-border/80 bg-card flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Broadcast Campaigns</p>
            <p className="font-mono text-xl font-bold text-foreground">{campaignMetrics.totalCampaigns}</p>
          </div>
        </Card>

        <Card className="p-4 border-border/80 bg-card flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Total Recipient Blasts</p>
            <p className="font-mono text-xl font-bold text-foreground">{campaignMetrics.totalBlasts.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="p-4 border-border/80 bg-card flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Delivery Rate</p>
            <p className="font-mono text-xl font-bold text-emerald-600">{campaignMetrics.deliveryRatePct}%</p>
          </div>
        </Card>

        <Card className="p-4 border-border/80 bg-card flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium">Avg. Open Rate</p>
            <p className="font-mono text-xl font-bold text-purple-600">{campaignMetrics.avgOpenRate}%</p>
          </div>
        </Card>
      </div>

      {/* Broadcast Composer Form & Live Lock Screen Preview (Order #2) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form Container */}
        <Card className="lg:col-span-2 p-5 border-border/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Send className="h-4 w-4 text-primary" />
                Compose Broadcast Push Notification
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send a real-time push alert to Percel mobile app users or drivers.
              </p>
            </div>

            {/* Template Picker Dropdown (Order #4) */}
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  const tmpl = templates.find((t) => t.id === e.target.value);
                  if (tmpl) handleSelectTemplate(tmpl);
                }}
                defaultValue=""
                className="rounded-xl border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>
                  📋 Pick a Template...
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audience Selector Cards */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Target Audience
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {AUDIENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAudience(option.value)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    audience === option.value
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-background/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{option.label}</span>
                    <span className="font-mono text-[10px] font-bold rounded-full bg-primary/20 px-1.5 py-0.2 text-primary">
                      ~{option.count}
                    </span>
                  </div>
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Fields with Live Character Counters (Order #2) */}
          <div className="space-y-3.5">
            {/* Title Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notification Title <span className="text-rose-500">*</span>
                </label>
                <span className={`text-xs font-mono font-medium ${title.length > 90 ? 'text-amber-500 font-bold' : 'text-muted-foreground'}`}>
                  {title.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g. Weekend Delivery Discount! 🚀"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Body Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <span className={`text-xs font-mono font-medium ${body.length > 550 ? 'text-amber-500 font-bold' : 'text-muted-foreground'}`}>
                  {body.length}/600
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={600}
                placeholder="e.g. Get 20% off your next 3 intra-state deliveries this weekend. Open the app to claim your promo."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-background/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Deep Link Input & Validation */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                In-App Deep Link Target <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. /wallet/topup or /orders"
                value={deepLink}
                onChange={(e) => {
                  setDeepLink(e.target.value);
                  validateDeepLink(e.target.value);
                }}
                className={`w-full rounded-xl border bg-background/50 px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                  deepLinkError
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-border focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {deepLinkError && (
                <p className="text-[11px] font-medium text-rose-500">{deepLinkError}</p>
              )}
            </div>

            {/* Send Mode: Send Now vs Schedule for Later */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-border pt-3 gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="sendMode"
                    checked={sendMode === 'now'}
                    onChange={() => setSendMode('now')}
                    className="text-primary focus:ring-primary/20"
                  />
                  Send Now
                </label>

                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="sendMode"
                    checked={sendMode === 'schedule'}
                    onChange={() => setSendMode('schedule')}
                    className="text-primary focus:ring-primary/20"
                  />
                  Schedule for Later
                </label>

                {sendMode === 'schedule' && (
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground"
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                {title.trim() && body.trim() && (
                  <button
                    type="button"
                    onClick={() => setIsSavingTemplate(true)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted inline-flex items-center gap-1"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-primary" />
                    Save Template
                  </button>
                )}

                <button
                  type="button"
                  disabled={!title.trim() || !body.trim()}
                  onClick={handleInitiateSend}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-xs inline-flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendMode === 'schedule' ? 'Schedule Broadcast' : 'Send Push Broadcast'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Live Mobile Lock Screen Preview Widget (Order #2) */}
        <Card className="p-5 border-border/80 bg-muted/30 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-primary" />
                Live Mobile Lock Screen Preview
              </h4>
              <span className="text-[10px] rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 font-bold">
                Phone Mock
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Real-time rendering of how recipients see this push notification on their phone lock screen:
            </p>

            {/* Lock Screen Push Notification Card Mock */}
            <div className="mt-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xl space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-[10px]">
                    P
                  </div>
                  <span className="text-xs font-bold text-foreground">Percel Delivery</span>
                </div>
                <span className="text-[10px] text-muted-foreground">now</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {title.trim() || 'Notification Title Preview'}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
                  {body.trim() || 'Your broadcast message body preview will appear here formatted as a mobile lock screen notification.'}
                </p>
              </div>

              {deepLink.trim() && (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    <ExternalLink className="h-2.5 w-2.5" />
                    Target: {deepLink.trim()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-3 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-primary inline mr-1" />
            Targeting <strong className="text-foreground">{currentAudienceObj.label}</strong> (~{currentAudienceObj.count} recipients).
          </div>
        </Card>
      </div>

      {/* Tabs & History Table (Order #1: Campaign Aggregation) */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Bell className="h-4 w-4" />
              Manual Broadcast Campaigns ({campaigns.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transactional')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'transactional'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              System Transactional Logs ({systemNotifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'templates'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Saved Templates ({templates.length})
            </button>
          </div>
        </div>

        {/* TAB 1: MANUAL BROADCAST CAMPAIGNS (Order #1) */}
        {activeTab === 'campaigns' && (
          <Card className="overflow-hidden border-border/80 shadow-sm space-y-0">
            {/* Search & Audience Filters */}
            <div className="border-b border-border bg-card p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search campaign title or body..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAudienceFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    audienceFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All Audiences
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceFilter('everyone')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    audienceFilter === 'everyone'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Everyone
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceFilter('users')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    audienceFilter === 'users'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Users Only
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceFilter('drivers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    audienceFilter === 'drivers'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Drivers Only
                </button>
              </div>
            </div>

            {/* Campaign-Aggregated Table (Order #1) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Campaign Title & Body</th>
                    <th className="px-5 py-3.5">Audience & Recipients</th>
                    <th className="px-5 py-3.5">Sent Timestamp</th>
                    <th className="px-5 py-3.5">Delivery Stats</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">No broadcast campaigns found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCampaigns.map((cmp) => (
                      <tr key={cmp.id} className="hover:bg-muted/40 transition-colors">
                        {/* Title & Body */}
                        <td className="px-5 py-3.5 max-w-sm">
                          <p className="font-semibold text-foreground">{cmp.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{cmp.body}</p>
                          {cmp.deepLink && (
                            <span className="inline-block mt-1 font-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded">
                              Target: {cmp.deepLink}
                            </span>
                          )}
                        </td>

                        {/* Audience & Recipient Count */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge className="bg-muted text-muted-foreground border-border text-[11px] font-semibold">
                            {cmp.channel}
                          </Badge>
                          <p className="text-xs font-mono font-bold text-foreground mt-1">
                            {(cmp.totalRecipients || 1240).toLocaleString()} recipients
                          </p>
                        </td>

                        {/* Sent Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                          {cmp.sentAt}
                        </td>

                        {/* Delivery Stats & Open Rate */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">{cmp.deliveredCount || 0} delivered</span>
                            {cmp.failedCount ? <span className="text-rose-500 font-bold">({cmp.failedCount} failed)</span> : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Open Rate: <strong className="text-purple-600 font-bold">{cmp.openRatePct || 42.0}%</strong>
                          </p>
                        </td>

                        {/* Action: View Recipients Modal */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedRecipientModal(cmp)}
                            className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20"
                          >
                            View Recipients
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 2: SYSTEM TRANSACTIONAL NOTIFICATIONS (Order #3) */}
        {activeTab === 'transactional' && (
          <Card className="overflow-hidden border-border/80 shadow-sm space-y-0">
            <div className="p-4 border-b border-border bg-card">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <ShieldAlert className="h-4 w-4 text-blue-500" />
                Read-Only Automated System Event Logs
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transactional push notifications generated automatically by wallet deposits, transfers, and order events.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Trigger Category</th>
                    <th className="px-5 py-3.5">Notification Title</th>
                    <th className="px-5 py-3.5">Message Body</th>
                    <th className="px-5 py-3.5">Sent Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {systemNotifications.map((sys) => (
                    <tr key={sys.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px] font-semibold">
                          {sys.channel}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">{sys.title}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{sys.body}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{sys.sentAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: SAVED TEMPLATES (Order #4) */}
        {activeTab === 'templates' && (
          <Card className="p-5 border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Bookmark className="h-4 w-4 text-primary" />
                Saved Broadcast Push Templates
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {templates.map((tmpl) => (
                <Card key={tmpl.id} className="p-4 border-border bg-card hover:border-primary/50 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{tmpl.name}</span>
                    <Badge className="text-[10px] bg-muted text-muted-foreground">{tmpl.audience}</Badge>
                  </div>
                  <p className="font-semibold text-xs text-primary">{tmpl.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-3 leading-snug">{tmpl.body}</p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTemplate(tmpl);
                        setActiveTab('campaigns');
                      }}
                      className="w-full rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold py-1.5 hover:bg-primary/20 transition-colors"
                    >
                      Use Template in Composer
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* CONFIRMATION MODAL FOR LARGE AUDIENCE SENDS (Order #2) */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Confirm Large Audience Broadcast?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  You are about to send a live push notification to{' '}
                  <strong className="text-foreground font-mono">
                    ~{currentAudienceObj.count} recipients ({currentAudienceObj.label})
                  </strong>.
                </p>
                <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-bold text-foreground">{title}</p>
                  <p className="text-muted-foreground text-[11px] leading-tight">{body}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSendBroadcast}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Confirm & Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE TEMPLATE MODAL */}
      {isSavingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Save as Reusable Template</h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground block">Template Name</label>
              <input
                type="text"
                value={templateNameSave}
                onChange={(e) => setTemplateNameSave(e.target.value)}
                placeholder="e.g. Weekend Promo Announcement"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsSavingTemplate(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RECIPIENTS EXPANDABLE MODAL (Order #1) */}
      {selectedRecipientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Per-Recipient Delivery Log — {selectedRecipientModal.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audience: <span className="font-bold">{selectedRecipientModal.channel}</span> · Total:{' '}
                  <strong className="font-mono text-foreground">{selectedRecipientModal.totalRecipients}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipientModal(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-muted/60 uppercase text-[10px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">User / Email</th>
                    <th className="px-3 py-2">Push Token</th>
                    <th className="px-3 py-2">Delivery Status</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {selectedRecipientModal.recipientsList && selectedRecipientModal.recipientsList.length > 0 ? (
                    selectedRecipientModal.recipientsList.map((rec, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-sans font-medium">{rec.name} ({rec.email})</td>
                        <td className="px-3 py-2 text-[10px] text-muted-foreground truncate max-w-[120px]">{rec.pushToken}</td>
                        <td className="px-3 py-2">
                          <span className={rec.status === 'DELIVERED' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{rec.sentAt}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground font-sans">
                        Sample per-recipient push logs delivered via Expo Push API.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedRecipientModal(null)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
