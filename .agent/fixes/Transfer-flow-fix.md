# Transfer Flow Fix

## Status
Pending.

## Context
The transfer and bill-payment flows are only partially aligned with the security preferences and theme system.

- The biometric toggle is persisted in `apps/user/store/preferences.store.ts` as `confirmTransactionsBiometricEnabled`, not a generic `biometricEnabled` flag.
- Shared biometric prompting already exists in `apps/user/lib/localAuthentication.ts` via `triggerBiometricAuth()`.
- The transfer screen has a biometric branch already, but the rest of the payment screens still go straight to their confirm/pay actions without consulting the shared biometric preference.
- The shared `PinInput` component already exists at `apps/user/components/ui/PinInput.tsx`, but some payment flows still need to be wired to it consistently and show a spinner while verifying.
- Theme propagation is centered on `apps/user/lib/theme.ts` and `apps/user/app/_layout.tsx`, but several screens still hardcode colors instead of consuming `useAppPalette()` / `Colors`.

## Files Involved
- `apps/user/store/preferences.store.ts`
- `apps/user/lib/localAuthentication.ts`
- `apps/user/components/ui/PinInput.tsx`
- `apps/user/app/(tabs)/wallet/transfer.tsx`
- `apps/user/app/(tabs)/wallet/airtime.tsx`
- `apps/user/app/(tabs)/wallet/data.tsx`
- `apps/user/app/(tabs)/wallet/tv.tsx`
- `apps/user/app/(tabs)/wallet/electricity.tsx`
- `apps/user/app/(tabs)/wallet/topup.tsx`
- `apps/user/app/(tabs)/wallet/transactions.tsx`
- `apps/user/app/(tabs)/orders/index.tsx`
- `apps/user/app/(tabs)/orders/[id].tsx`
- `apps/user/app/(tabs)/orders/rate/[id].tsx`
- `apps/user/app/(tabs)/profile/security.tsx`
- `apps/user/app/settings/notifications.tsx`
- `apps/user/app/settings/preferences.tsx`
- `apps/user/app/settings/[slug].tsx`
- `apps/user/app/referrals.tsx`
- `apps/user/app/auth-lock.tsx`
- `apps/user/lib/theme.ts`
- `apps/user/app/_layout.tsx`

## Goal
Make all transfer and payment confirmations biometric-first when enabled, fall back cleanly to the shared PIN UI when needed, and remove hardcoded colors from the remaining themed screens.

## Tasks
- [ ] Step 1: Shared auth util
- [ ] Step 2: Apply auth flow to all payment services
- [ ] Step 3: Extract/reuse the shared 4-box PIN component everywhere
- [ ] Step 4: Propagate theme tokens across remaining screens
- [ ] Step 5: Verify immediate theme updates from Preferences

## Scan Notes
- `apps/user/app/(tabs)/wallet/transfer.tsx` already reads `confirmTransactionsBiometricEnabled` and calls `promptBiometricAuthentication()`, but it still needs to be normalized against the shared helper flow and the final PIN/modal behavior.
- `apps/user/app/(tabs)/wallet/airtime.tsx` has a confirm/pay action at the review step, but no biometric-first gate and no PIN modal.
- `apps/user/app/(tabs)/wallet/data.tsx` has a review/pay action at the final step, but no biometric-first gate and no PIN modal.
- `apps/user/app/(tabs)/wallet/tv.tsx` has a review/pay action at the final step, but no biometric-first gate and no PIN modal.
- `apps/user/app/(tabs)/wallet/electricity.tsx` has a review/pay action at the final step, but no biometric-first gate and no PIN modal.
- `apps/user/app/(tabs)/wallet/topup.tsx` should be re-checked for payment-confirmation behavior, but the current scan did not find a PIN confirmation modal there.
- `apps/user/components/ui/PinInput.tsx` is already the shared 4-box PIN component; the remaining work is reuse and consistency, not a new implementation.
- `apps/user/lib/theme.ts` already resolves the active palette from the preferences store and system scheme.
- `apps/user/app/_layout.tsx` already injects the navigation theme via `ThemeProvider`, so the remaining theme work is mostly on screens still using hardcoded colors.

## Root Causes
- The biometric preference exists, but most payment screens never read it at confirmation time.
- The shared biometric helper exists, but the payment flows are not consistently calling it before opening the PIN step.
- The PIN UI was duplicated or skipped in some payment flows instead of using the existing 4-box component everywhere.
- Some screens still hardcode colors like `#fff`, `#000`, and `backgroundColor: 'black'` instead of using `useAppPalette()` or `Colors`, so theme changes do not fully propagate.

## Blocked By
- Confirm whether `apps/user/app/(tabs)/wallet/topup.tsx` needs the same biometric-first confirm pattern or should remain checkout-only.
- Verify whether any other payment or receipt modal exists outside the wallet routes that also needs the shared auth gate.
- Theme cleanup should be validated against every route that still imports `Colors` directly or uses literal color values in styles.

## Next Agent Instructions
- Start with `apps/user/lib/localAuthentication.ts` and keep the biometric fallback semantics centralized there.
- Update every payment confirmation entry point to call the shared biometric helper before showing PIN UI.
- Reuse `apps/user/components/ui/PinInput.tsx`; do not create another PIN component.
- Replace hardcoded colors with theme tokens in the listed screens, then verify Preferences updates propagate immediately without restarting the app.
- If you run out of context, continue from this file and update the task checkboxes as each subtask is completed.
