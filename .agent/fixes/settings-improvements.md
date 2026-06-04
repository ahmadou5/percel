# Settings Improvements

## Status
Pending.

## Context
The user settings area is split across a generic settings hub, a generic slug-based detail route, the profile security screen, and the runtime bootstrap. The requested fintech-style polish needs three separate feature completions:
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
- [ ] Theme preferences screen
- [ ] Theme persistence and app-wide theme context
- [ ] Custom theme modal with accent/background swatches and preview
- [ ] Notifications settings screen
- [ ] Remove auto permission request on app launch
- [ ] Home-screen notification reminder modal with 24-hour dismissal cooldown
- [ ] Security screen biometric wiring
- [ ] Separate `Access Wallet` and `Confirm Transactions` toggles
- [ ] Dynamic biometric type label

## Decisions Made
- Implement the features in this order: Theme, Notifications, Biometrics.
- Persist all user-controlled settings through the existing preferences store pattern unless a new store is required for theme palette details.
- Keep the visual style aligned with the Equify-style reference: rounded cards, clear status pills, and right-aligned active indicators.

## Blocked By
- The theme flow needs a dedicated persisted preference, not just the device color scheme, before the new preferences screen can be considered complete.
- Notification permission handling must move out of runtime bootstrap before the reminder modal can behave correctly.
- Biometric state should be split into separate capabilities before the security screen can reflect the requested two-toggle design.

## Next Agent Instructions
- Start with theme because it is the foundation for the rest of the settings polish.
- Then remove the startup push-permission request and add the settings-driven notification flow.
- Finish by wiring biometric enablement to `expo-local-authentication` and separating wallet access from transaction confirmation.
- Update these checkboxes as each subtask is completed.
