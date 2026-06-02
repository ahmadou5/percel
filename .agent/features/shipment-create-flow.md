# Shipment Create Flow

## Status
Pending.

## Context
Create tab should ship a 5-step shipment flow: Sender details, Receiver details, Package details, Delivery options, Review and Pay. Success creates a waybill in the `PCL-YYYYMMDD-XXXX` format and routes into Orders.

## Files Involved
- `apps/user/app/(tabs)/send/index.tsx`
- `apps/user/app/(tabs)/send/package.tsx`
- `apps/user/app/(tabs)/send/quote.tsx`
- `apps/user/app/(tabs)/send/tracking/[id].tsx`
- `apps/user/app/(tabs)/send/_layout.tsx`
- `apps/user/app/(tabs)/orders/index.tsx`
- `apps/user/app/(tabs)/orders/[id].tsx`
- `apps/user/app/(tabs)/orders/rate/[id].tsx`
- `apps/user/hooks/useOrder.ts`
- `apps/user/lib/order.ts`
- `apps/api/src/modules/order/order.routes.ts`
- `apps/api/src/modules/order/order.controller.ts`
- `apps/api/src/modules/order/order.service.ts`
- `apps/api/src/modules/order/order.schema.ts`
- `packages/shared/src/types/order.types.ts`

## Goal
Deliver a complete shipment creation, tracking, and post-payment order experience that is consistent end-to-end.

## Tasks
- [ ] Step 1: Sender details
- [ ] Step 2: Receiver details
- [ ] Step 3: Package details
- [ ] Step 4: Delivery options
- [ ] Step 5: Review and Pay
- [ ] Waybill success screen
- [ ] QR code display
- [ ] Share waybill action
- [ ] Orders list screen
- [ ] Order detail screen with tracking timeline
- [ ] Track Package screen

## Decisions Made
- Service tier cards should use the same selection pattern as the Data plan cards.
- Chip selection should use the same pattern as the Airtime screen.
- Waybill number format is `PCL-YYYYMMDD-XXXX`.

## Blocked By
- Backend payload/response contract must stay aligned with the step flow.
- Navigation wiring should be validated before deeper UI work.

## Next Agent Instructions
- Build Step 1 first.
- Confirm the navigation path through Steps 1-5 before adding the success view.
- Reuse the existing order/timeline components instead of inventing parallel UI.

