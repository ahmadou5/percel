# Hub Route Picker

## Status
Done.

## Context
Percel waybill creation is moving from free-text addresses to an operational hub model. Users should pick an origin hub and destination hub, then provide local pickup details near the origin hub before moving to package and quote review.

## Files Involved
- `apps/user/types/hubs.ts`
- `apps/user/seed/hubs.ts`
- `apps/user/lib/hubs.ts`
- `apps/user/components/order/HubPicker.tsx`
- `apps/user/app/(tabs)/send/index.tsx`
- `apps/user/app/(tabs)/send/pickup-details.tsx`
- `apps/user/app/(tabs)/send/package.tsx`
- `apps/user/app/(tabs)/send/quote.tsx`
- `apps/user/app/(tabs)/send/_layout.tsx`

## Goal
Replace free-text pickup/delivery entry with hub-to-hub selection, show live route availability and ETA/fare preview, and capture local pickup details before the package and quote steps.

## Tasks
- [x] Add hub and route types plus starter seed data
- [x] Add a swappable local hub/route data service with `getRoute()`
- [x] Build a searchable hub picker modal with theme-consistent styling
- [x] Replace pickup/delivery text fields with hub selection in the send entry screen
- [x] Add live route preview and route unavailable handling
- [x] Add the local pickup details step and wire params through package/quote

## Decisions Made
- The first version should use a local mock data service, not a backend migration.
- Route preview should be derived from the selected hub pair before the package step.
- The existing quote/order backend can still receive composed address strings while the UI moves to hub-based selection.

## Blocked By
- No backend schema migration is required for the first pass, but a future Supabase table swap should remain possible.
- Route composition must stay aligned with the current order quote/create payloads.

## Next Agent Instructions
- Verify the hub flow on device and tune spacing if the modal or route cards feel cramped on smaller phones.
- If backend support for hubs is added later, swap the local seed service behind `lib/hubs.ts` without changing the screen contract.
