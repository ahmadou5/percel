# Settings Improvements

## Status
Complete.

## Context
The user settings area is split across a generic settings hub, a generic slug-based detail route, the profile security screen, and the runtime bootstrap. The requested fintech-style polish needed three separate feature completions:
- a real theme/preferences screen with persisted theme selection and custom palette support,
- a user-controlled notifications permission flow with a home-screen reminder,
- and biometric toggles that actually call into `expo-local-authentication`.

## Root Cause
- Theme: there is no dedicated `settings/preferences` route, and the app theme still comes from `useColorScheme()` in `apps/user/app/_layout.tsx`, so the UI cannot persist or apply a user-selected theme. `apps/user/store/preferences.store.ts` also has no theme state.
- Notifications: `apps/user/components/UserRuntime.tsx` still auto-requests notification permission and registers push tokens on app startup. The settings flow does not expose a push enable/disable control, and there is no stored reminder dismissal timestamp.
- Biometrics: `apps/user/app/(tabs)/profile/security.tsx` only persists a single `appLockEnabled` switch. It does not separate wallet access from transaction confirmation, does not validate the device with `LocalAuthentication.authenticateAsync()` on enable, and does not surface the active biometric type.

## Files Involved
- `apps/user/app/_layout.tsx`
- `apps/user/app/(tabs)/_layout.tsx`
- `apps/user/app/(tabs)/index.tsx`
- `apps/user/app/(tabs)/profile/security.tsx`
- `apps/user/app/(tabs)/notifications.tsx`
- `apps/user/app/auth-lock.tsx`
- `apps/user/app/settings/index.tsx`
- `apps/user/app/settings/[slug].tsx`
- `apps/user/components/UserRuntime.tsx`
- `apps/user/lib/localAuthentication.ts`
- `apps/user/store/preferences.store.ts`

## Goal
Ship the three settings improvements with the same polished fintech treatment used in the reference screenshots:
1. Theme switcher + custom theme builder
2. User-controlled push notifications
3. Working biometric authentication toggles

## Tasks
- [x] Theme preferences screen
- [x] Theme persistence and app-wide theme context
- [x] Custom theme modal with accent/background swatches and preview
- [x] Notifications settings screen
- [x] Remove auto permission request on app launch
- [x] Home-screen notification reminder modal with 24-hour dismissal cooldown
- [x] Security screen biometric wiring
- [x] Separate `Access Wallet` and `Confirm Transactions` toggles
- [x] Dynamic biometric type label

## Decisions Made
- Implement the features in this order: Theme, Notifications, Biometrics.
- Persist all user-controlled settings through the existing preferences store pattern unless a new store is required for theme palette details.
- Keep the visual style aligned with the Equify-style reference: rounded cards, clear status pills, and right-aligned active indicators.

## Blocked By
Nothing — all three features are complete.

## Next Agent Instructions
- All settings improvements are done. The next task was to:
  1. Add a `Notifications.setNotificationHandler()` call in `apps/user/app/_layout.tsx` — **done**.
  2. Add `POST /admin/broadcast` endpoint in `apps/api/src/modules/admin/admin.routes.ts` — **done**.
  3. Add `BroadcastForm` UI in the admin app — **done**.
- Push notifications will only deliver reliably from a development build (`npx expo run:android`), not Expo Go.
