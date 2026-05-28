import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Operational preferences, roles, alert thresholds, and deployment controls.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <Badge>Roles</Badge>
          <h3 className="text-lg font-semibold tracking-tight">Access management</h3>
          <p className="text-sm text-muted-foreground">Assign admin scopes for support, finance, and dispatch teams.</p>
        </Card>
        <Card className="space-y-3 p-5">
          <Badge>Alerts</Badge>
          <h3 className="text-lg font-semibold tracking-tight">Thresholds</h3>
          <p className="text-sm text-muted-foreground">Set queue depth, refund, and KYC alert thresholds for the ops team.</p>
        </Card>
      </section>
      <Card className="space-y-3 p-5">
        <h3 className="text-lg font-semibold tracking-tight">Platform configuration</h3>
        <p className="text-sm text-muted-foreground">This shell is ready for real admin settings, role controls, and deployment configuration.</p>
      </Card>
    </div>
  );
}
