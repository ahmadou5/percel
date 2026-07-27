import { loadDashboardNotifications } from '@/lib/admin-data';
import { NotificationsManager } from '@/components/notifications-manager';

export default async function NotificationsPage() {
  const notifications = await loadDashboardNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Broadcast Alerts & Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compose manual push broadcast campaigns, preview mobile lock screen alerts, manage saved templates, and view system transactional logs.
        </p>
      </div>

      <NotificationsManager initialNotifications={notifications} />
    </div>
  );
}

