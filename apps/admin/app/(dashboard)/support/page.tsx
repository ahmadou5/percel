import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { loadDashboardOrders } from '@/lib/admin-data';

export default async function SupportDeskPage() {
  const orders = await loadDashboardOrders();

  // Mock open disputes for customer/driver resolution
  const openDisputes = [
    {
      id: 'dsp_88102',
      orderId: orders[0]?.id ?? 'ord_123',
      trackingCode: orders[0]?.trackingCode ?? 'PCL-772819',
      customer: orders[0]?.user ?? 'Amina Bello',
      driver: orders[0]?.driver ?? 'Tunde Bakare',
      reason: 'Driver delayed pickup for over 45 minutes without status update.',
      status: 'UNDER_REVIEW',
      openedAt: '30 mins ago',
      chatSnippet: [
        { sender: 'Amina Bello (User)', text: 'Hello driver, where are you? It has been 45 minutes.', at: '14:20' },
        { sender: 'Tunde Bakare (Driver)', text: 'Heavy traffic on Third Mainland Bridge, on my way now.', at: '14:25' },
      ],
    },
    {
      id: 'dsp_88103',
      orderId: orders[1]?.id ?? 'ord_124',
      trackingCode: orders[1]?.trackingCode ?? 'PCL-991204',
      customer: orders[1]?.user ?? 'Emeka Nnamdi',
      driver: orders[1]?.driver ?? 'David Oladipo',
      reason: 'Package seal arrived partially opened.',
      status: 'ESCALATED',
      openedAt: '2 hours ago',
      chatSnippet: [
        { sender: 'Emeka Nnamdi (User)', text: 'The package seal was torn when delivered.', at: '12:10' },
        { sender: 'David Oladipo (Driver)', text: 'The box was fragile, I handled it carefully.', at: '12:15' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Customer Support & Dispute Desk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review active order disputes, inspect chat transcripts between users and drivers, and issue refunds.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Open Disputes</p>
          <p className="mt-2 text-2xl font-bold text-warning">{openDisputes.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Requires admin intervention</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resolved Today</p>
          <p className="mt-2 text-2xl font-bold text-success">14</p>
          <p className="mt-1 text-xs text-success">Avg resolution: 12 mins</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Customer Satisfaction</p>
          <p className="mt-2 text-2xl font-bold text-primary">4.9 / 5.0</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on post-dispute ratings</p>
        </Card>
      </div>

      {/* Open Disputes Cards */}
      <div className="grid gap-6">
        {openDisputes.map((dispute) => (
          <Card key={dispute.id} className="overflow-hidden border border-border/80 p-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{dispute.trackingCode}</span>
                  <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                    {dispute.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Customer: <span className="font-medium text-foreground">{dispute.customer}</span> · Driver: <span className="font-medium text-foreground">{dispute.driver}</span> · Opened: {dispute.openedAt}
                </p>
              </div>
              <DetailActions
                actions={[
                  {
                    label: 'Issue Refund to User',
                    tone: 'default',
                    prompt: 'Refund amount or note for customer wallet credit',
                    actionUrl: `/api/admin/disputes/${dispute.id}/refund`,
                    successMessage: `Refund credited to ${dispute.customer} for order ${dispute.trackingCode}`,
                  },
                  {
                    label: 'Resolve (No Refund)',
                    tone: 'secondary',
                    actionUrl: `/api/admin/disputes/${dispute.id}/resolve`,
                    successMessage: `Dispute ${dispute.trackingCode} marked resolved.`,
                  },
                  {
                    label: 'Suspend Driver',
                    tone: 'danger',
                    prompt: 'Reason for driver suspension',
                    actionUrl: `/api/admin/disputes/${dispute.id}/suspend-driver`,
                    successMessage: `Driver ${dispute.driver} suspended for dispute investigation.`,
                  },
                ]}
              />
            </div>

            {/* Dispute Details & Chat Transcript Preview */}
            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground">Dispute Reason</p>
                <p className="text-sm font-medium text-foreground">{dispute.reason}</p>
                <div className="pt-2">
                  <Link
                    href={`/orders/${dispute.orderId}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View Full Order Audit →
                  </Link>
                </div>
              </div>

              {/* Chat Transcript */}
              <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground">Live Order Chat Transcript</p>
                <div className="space-y-2 mt-2 max-h-36 overflow-y-auto">
                  {dispute.chatSnippet.map((msg, i) => (
                    <div key={i} className="text-xs rounded-lg border border-border/60 bg-muted/40 p-2">
                      <div className="flex items-center justify-between text-muted-foreground font-medium mb-0.5">
                        <span>{msg.sender}</span>
                        <span>{msg.at}</span>
                      </div>
                      <p className="text-foreground font-normal">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
