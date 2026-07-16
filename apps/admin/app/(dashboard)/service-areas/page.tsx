import { AdminServiceArea, loadServiceAreas } from '@/lib/admin-data';
import { ServiceAreasList } from '@/components/service-areas-list';

export default async function ServiceAreasPage() {
  let areas: AdminServiceArea[] = [];
  try {
    areas = await loadServiceAreas();
  } catch (e) {
    // Show empty list if API is unreachable during build
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Local Service Areas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage cities where intra-state same-day delivery is available. The app auto-detects the
          delivery type from pickup and drop-off addresses and uses these rates for per-km pricing.
        </p>
      </div>

      <ServiceAreasList initialAreas={areas} />
    </div>
  );
}
