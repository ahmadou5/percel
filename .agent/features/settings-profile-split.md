# Settings / Profile Split

## Status
Pending.

## Context
The current single account page should split into a Profile page and a Settings page. Profile owns the avatar, name, ID, verified badge, refer-and-earn banner, and a single entry row into Settings. Settings owns the full menu groups and logout confirmation.

## Files Involved
- `apps/user/app/(tabs)/profile/index.tsx`
- `apps/user/app/(tabs)/profile/edit.tsx`
- `apps/user/app/(tabs)/profile/security.tsx`
- `apps/user/app/settings/index.tsx`
- `apps/user/app/settings/[slug].tsx`
- `apps/user/app/(tabs)/_layout.tsx`

## Goal
Separate identity/profile concerns from account settings without losing the current navigation flow.

## Tasks
- [ ] Profile screen layout
- [ ] Avatar with camera badge
- [ ] Verified chip
- [ ] Refer and earn banner
- [ ] Settings entry row
- [ ] Settings screen with 3 grouped menu sections
- [ ] Logout confirmation bottom sheet
- [ ] Navigation wiring between Profile and Settings

## Decisions Made
- Settings tab opens Profile page first.
- Profile has a single row that navigates into Settings.
- Delete the old combined page only after both new pages are confirmed working.

## Blocked By
- Do not remove the old page until the new routes are fully wired and tested.
- Menu items should continue to respect the app-lock gating rules.

## Next Agent Instructions
- Start by mapping the current profile/account/settings routing.
- Keep the new Profile page lightweight and make Settings the full menu hub.
- Only delete the old combined page after the new flow is verified end-to-end.

