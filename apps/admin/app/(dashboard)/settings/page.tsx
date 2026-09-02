import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaymentProviderSettings } from '@/components/payment-provider-settings';
import { IdentityProviderSettings } from '@/components/identity-provider-settings';
import { ThemeCustomizer } from '@/components/theme-customizer';
import { AdminProfileEditor } from '@/components/admin-profile-editor';
import { MaintenanceModeControl } from '@/components/maintenance-mode-control';
import { AlertTriangle, Palette, UserCircle2 } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, appearance preferences, payment routing, and operational controls.
        </p>
      </div>

      {/* Profile section */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCircle2 size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Admin profile</h3>
            <p className="text-xs text-muted-foreground">Update your name, contact info, and password.</p>
          </div>
        </div>
        <AdminProfileEditor />
      </Card>

      {/* Theme customizer section */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Appearance</h3>
            <p className="text-xs text-muted-foreground">Personalize your accent color and light/dark mode preference.</p>
          </div>
        </div>
        <ThemeCustomizer />
      </Card>

      {/* Payment routing */}
      <PaymentProviderSettings />

      {/* Identity verification routing */}
      <IdentityProviderSettings />

      {/* Platform Operations / Maintenance Mode */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertTriangle size={16} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">Platform Operations</h3>
            <p className="text-xs text-muted-foreground">Control maintenance mode and broadcast system-wide messages to all users and drivers.</p>
          </div>
        </div>
        <MaintenanceModeControl />
      </Card>

      {/* Misc cards */}
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
        <p className="text-sm text-muted-foreground">
          Role controls and deployment configuration can sit beside payment routing as those controls become live.
        </p>
      </Card>
    </div>
  );
}

