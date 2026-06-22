# DRIVER UI Improvement

## Status
IN PROGRESS - Implemented driver UI pass; pending device/runtime QA.

## Context
The Percel driver app is missing several screens and UI features that already exist in the user app. The implementation must match user-app UI parity: same dark premium theme, purple accents, card structure, spacing, and typography conventions. User app files are the source of truth and should be referenced, not modified.

## Scope
1. Settings screen parity
2. Notifications screen parity
3. Driver wallet card with Online/Offline toggle
4. Order accept/reject modal root-cause trace and end-to-end fix
5. Order history redesign

## Codebase Scan
Run and document findings before editing app code.

### Settings
- [x] Scan driver settings files
- [x] Scan user settings files and linked sub-screens

### Notifications
- [x] Scan driver notification files
- [x] Scan user notification files

### Wallet Card
- [x] Scan driver wallet files
- [x] Scan user wallet files
- [x] Scan driver online state usage

### Order Accept/Reject Modal
- [x] Scan driver accept/reject/order socket listeners
- [x] Scan driver socket initialization
- [x] Scan backend order creation and socket emission pipeline

### Order History
- [x] Scan driver order history files
- [x] Scan user order history files

## Findings
| Area | Driver file(s) found | User reference file(s) | Notes |
| --- | --- | --- | --- |
| Settings screen | No driver settings route before this pass; now `apps/driver/app/(tabs)/settings.tsx`, `_layout.tsx`, `FloatingTabBar.tsx` | `apps/user/app/settings/index.tsx`, `apps/user/app/settings/kyc.tsx`, `apps/user/app/settings/notifications.tsx`, `apps/user/app/(tabs)/profile/security.tsx`, `apps/user/app/(tabs)/wallet/transactions.tsx` | Added Settings with Profile/KYC, Transactions, Notification Preferences, Security, Support. |
| Notifications screen | No driver notifications route before this pass; now `apps/driver/app/(tabs)/notifications.tsx`, `apps/driver/hooks/useNotifications.ts`, `apps/driver/lib/notifications.ts` | `apps/user/app/(tabs)/notifications.tsx`, `apps/user/hooks/useNotifications.ts`, `apps/user/lib/notifications.ts`, `apps/user/components/NotificationDetailModal.tsx` | Added card list, read/unread states, timestamps, mark-read, mark-all, and detail modal. |
| Wallet card | `apps/driver/hooks/useWallet.ts`, `apps/driver/app/(tabs)/home.tsx`, now `apps/driver/components/DriverWalletCard.tsx` | `apps/user/app/(tabs)/index.tsx`, `apps/user/hooks/useWallet.ts`, `apps/user/app/(tabs)/wallet/*` | Replaced plain balance snapshot with premium driver wallet card. |
| Online toggle | `apps/driver/app/(tabs)/home.tsx`, `apps/driver/hooks/useDriverProfile.ts`, `apps/driver/lib/socket.ts`, `apps/driver/store/driver.store.ts` | n/a | Existing optimistic status mutation patches `/api/v1/driver/status` and emits socket events; wallet card now controls the same path. |
| Order modal (Socket.io) | `apps/driver/lib/socket.ts`, `apps/driver/app/(tabs)/home.tsx`, `apps/driver/hooks/useDriverOrders.ts` | n/a | Backend emits `new_order_available` from `apps/api/src/lib/realtime.ts`; matching worker sends payload in `apps/api/src/queues/orderMatching.worker.ts`; driver listens and shows an over-screen modal/bottom sheet. Countdown changed to 30s. Shared enum still says `order:new:available`, but live backend/client use `new_order_available`. |
| Order history | `apps/driver/app/(tabs)/history.tsx`, `apps/driver/hooks/useDriverOrders.ts` | `apps/user/app/(tabs)/orders/index.tsx`, `apps/user/app/(tabs)/wallet/transactions.tsx` | Driver history was already scoped via `/api/v1/driver/orders/history`; refined chip colors and route card styling. |

## Files Involved

### Driver App
- `apps/driver/app/(tabs)/settings.tsx`
- `apps/driver/app/(tabs)/notifications.tsx`
- `apps/driver/app/(tabs)/home.tsx`
- `apps/driver/app/(tabs)/history.tsx`
- `apps/driver/app/(tabs)/_layout.tsx`
- `apps/driver/components/DriverWalletCard.tsx`
- `apps/driver/components/navigation/FloatingTabBar.tsx`
- `apps/driver/hooks/useNotifications.ts`
- `apps/driver/hooks/useDriverProfile.ts`
- `apps/driver/hooks/useDriverOrders.ts`
- `apps/driver/lib/notifications.ts`
- `apps/driver/lib/socket.ts`

### User App Reference
- `apps/user/app/settings/index.tsx`
- `apps/user/app/settings/notifications.tsx`
- `apps/user/app/(tabs)/notifications.tsx`
- `apps/user/app/(tabs)/wallet/transactions.tsx`
- `apps/user/hooks/useNotifications.ts`
- `apps/user/lib/notifications.ts`

### Backend
- `apps/api/src/lib/realtime.ts`
- `apps/api/src/plugins/socket.ts`
- `apps/api/src/queues/orderMatching.worker.ts`
- `apps/api/src/modules/order/order.routes.ts`
- `apps/api/src/modules/order/order.service.ts`
- `packages/shared/src/types/realtime.types.ts`

## Root Causes
- Settings screen: driver had no route or dock entry; added a route and custom tab-bar registration.
- Notifications screen: driver had no notifications route/hook; added route, feed hook, formatter/types, and home bell navigation.
- Wallet card: driver home used a minimal balance card; added `DriverWalletCard` with balance, Transfer, Deposit, and Online/Offline toggle wired to existing status mutation/socket path.
- Order modal: backend and driver both use `new_order_available`; the main issue was incomplete modal parity/countdown behavior and no reject API. Existing reject path dismisses locally and emits a status update; backend offer expiry remains the authoritative timeout path.
- Order history: driver query was already scoped, but UI used simpler cards and emoji markers; updated route rows and status chip colors.

## Tasks
- [x] Settings: scan user implementation and driver availability
- [x] Settings: create or update driver Settings screen
- [x] Settings: wire Profile/KYC, Transactions, Notification Preferences, Security, and Support
- [x] Settings: verify Settings entry in driver navigation
- [x] Notifications: scan user implementation and driver availability
- [x] Notifications: scaffold/update driver Notifications screen
- [x] Notifications: implement card UI, read/unread state, timestamps, tap-to-detail, and empty state
- [x] Notifications: wire driver-scoped data and mark-read updates
- [x] Wallet: scan user wallet card and driver dashboard
- [x] Wallet: create/update driver wallet card with Transfer and Deposit actions
- [x] Wallet: add Online/Offline toggle with optimistic update and backend/socket sync
- [x] Wallet: place card on driver home/dashboard
- [x] Order modal: trace order creation to driver notification pipeline
- [x] Order modal: document event names, payloads, and gating
- [x] Order modal: implement or repair socket listener and modal trigger
- [x] Order modal: implement accept/reject/countdown behavior
- [ ] Order modal: verify end-to-end path as far as local tooling allows
- [x] Order history: scan user and driver history screens
- [x] Order history: document UI mismatches
- [x] Order history: refactor driver history to match user design tone
- [x] Order history: ensure driver-scoped order query and Settings -> Transactions route
- [x] Run targeted lint/type checks

## Decisions Made
- Use the user app implementation as the visual and navigation source of truth.
- Keep edits scoped to driver app and backend/socket code needed for the modal pipeline.
- Reuse existing driver online status mutation and socket events instead of creating a second availability path.

## Blocked By
- End-to-end test order placement requires running the API, worker, user app, and driver app against a live local/dev Supabase/Redis setup. Not performed in this pass.
- There is no backend reject endpoint yet (`POST/PATCH /driver/orders/:id/reject`); current reject behavior dismisses locally while the matching worker expires the offer.

## Next Agent Instructions
- Run a full device/emulator QA pass for: driver Settings tab, notification list/detail/read state, wallet card toggle, incoming order pop-up, and history cards.
- If strict parity is required for reject, add a backend driver reject endpoint that clears `order:offer:${orderId}` for the current driver and lets the matching worker advance immediately.
- Consider aligning `packages/shared/src/types/realtime.types.ts` with the actual backend/client event name `new_order_available`, or migrate backend/client together to `order:new:available`.
