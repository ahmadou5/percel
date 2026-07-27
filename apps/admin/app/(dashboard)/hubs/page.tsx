import { HubsRoutesManager } from '@/components/hubs-routes-manager';
import { loadHubs, loadRoutes, type AdminHub, type AdminRoute } from '@/lib/admin-data';

export default async function HubsPage() {
  let hubs: AdminHub[] = [];
  let routes: AdminRoute[] = [];

  try {
    const [loadedHubs, loadedRoutes] = await Promise.all([loadHubs(), loadRoutes()]);
    hubs = loadedHubs;
    routes = loadedRoutes;
  } catch (error) {
    // Graceful fallback during Next.js static builds
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Hubs & Connecting Routes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure interstate parcel hubs and routes. Set transit times, hub base pricing modifiers, and inspect network topology.
        </p>
      </div>

      <HubsRoutesManager initialHubs={hubs} initialRoutes={routes} />
    </div>
  );
}

