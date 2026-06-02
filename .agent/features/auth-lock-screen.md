# Auth Lock Screen

## Status
Pending.

## Context
The lock screen appears when the app resumes from background and the session is active. It is full-screen, centered, has no navbar, shows 4 PIN dots, a custom 3x4 numpad, auto-triggers biometrics after 300ms, shakes on wrong PIN, and flashes green on success before returning home.

## Files Involved
- `apps/user/app/_layout.tsx`
- `apps/user/app/auth-lock.tsx`
- `apps/user/lib/localAuthentication.ts`
- `apps/user/store/auth.store.ts`
- `apps/user/store/preferences.store.ts`
- `apps/user/hooks/useWallet.ts`

## Goal
Lock and unlock the user session cleanly without disturbing the rest of the navigation stack.

## Tasks
- [ ] Add an `AppState` listener in the root layout
- [ ] Build the lock screen component
- [ ] Build the PIN dot row with animation
- [ ] Build the custom numpad grid
- [ ] Wire biometric auth through `expo-local-authentication`
- [ ] Add wrong PIN shake animation
- [ ] Add correct PIN green success animation
- [ ] Add logout button
- [ ] Add forgot PIN link

## Decisions Made
- Biometrics trigger automatically on mount after 300ms.
- No navbar on this screen.
- Logout uses the existing danger color token.

## Blocked By
- Confirm the `expo-local-authentication` dependency is already present before changing dependencies.
- App lock behavior must stay in sync with the persisted auth and preferences stores.

## Next Agent Instructions
- Check `apps/user/package.json` first.
- If the dependency is already installed, wire the hook and screen flow before touching the package manifest.
- Keep the lock screen isolated from the tab bar.

