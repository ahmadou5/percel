import { AdminServiceArea, loadServiceAreas } from '@/lib/admin-data';
import { ServiceAreasManager } from '@/components/service-areas-manager';

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
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Service Areas & Pricing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure base fares and per-km rates for intra-state same-day delivery and interstate routes. Customers select their order type explicitly (intra-state vs interstate) in the mobile app.
        </p>
      </div>

      <ServiceAreasManager initialAreas={areas} />
    </div>
  );
}

