import { Card } from '@/components/ui/card';
import { loadDashboardNotifications } from '@/lib/admin-data';

export default async function NotificationsPage() {
  const rows = await loadDashboardNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Broadcast notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Live notification history from the Percel API.</p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr><th className="px-5 py-4">Audience</th><th className="px-5 py-4">Title</th><th className="px-5 py-4">Body</th><th className="px-5 py-4">Sent</th></tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4 font-medium">{item.channel}</td>
                <td className="px-5 py-4">{item.title}</td>
                <td className="px-5 py-4 text-muted-foreground">{item.body}</td>
                <td className="px-5 py-4 text-muted-foreground">{item.sentAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
