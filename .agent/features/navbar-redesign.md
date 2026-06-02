# Navbar Redesign

## Status
Done, with one remaining follow-up.

## Context
FloatingTabBar component with 4 tabs: Home, Create, Orders, Settings. Motion is spring-based, theme-aware, and split between light/dark token sets.

## Files Involved
- `apps/user/components/navigation/FloatingTabBar.tsx`
- `apps/user/app/(tabs)/_layout.tsx`
- `apps/user/constants/palette.ts`
- `apps/user/constants/typography.ts`

## Goal
Keep the floating tab bar polished, stable, and motion-consistent without reintroducing layout drift.

## Tasks
- [x] `TAB_META` definition
- [x] `TabGlyph` spring animation
- [x] label absolute positioning fix
- [x] `activeLift` removal
- [x] `iconSlot` sizing
- [x] `borderWidth` 0.5
- [x] pressed scale `0.94`
- [ ] haptic feedback with `expo-haptics` on tab press

## Decisions Made
- Label is positioned `absolute` at `bottom: 0`.
- `activeLift` was removed.
- All motion lives in `TabGlyph`; `TabButton` stays thin.

## Blocked By
- None for the current visual pass.
- Haptics still need the `expo-haptics` wiring and dependency check.

## Next Agent Instructions
- Start in `FloatingTabBar.tsx`.
- Keep icon/label motion inside `TabGlyph`.
- Add haptics only on user-initiated tab presses, not on initial mount or programmatic navigation.
- Preserve the existing light/dark token split and the hidden-route behavior.

