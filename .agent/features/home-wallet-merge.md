# Home Wallet Merge

## Status
Pending.

## Context
The wallet tab is being removed. Home should absorb balance display, deposit/transfer CTAs, quick actions, transactions, and the active deliveries banner.

## Files Involved
- `apps/user/app/(tabs)/index.tsx`
- `apps/user/app/(tabs)/wallet/index.tsx`
- `apps/user/app/(tabs)/_layout.tsx`
- `apps/user/components/navigation/FloatingTabBar.tsx`
- `apps/user/components/wallet/BalanceCard.tsx`
- `apps/user/components/wallet/TransactionItem.tsx`
- `apps/user/hooks/useWallet.ts`
- `apps/user/lib/wallet.ts`

## Goal
Move every wallet-facing surface into Home and remove the standalone wallet page without losing any wallet/bills functionality.

## Tasks
- [ ] Build the balance hero on Home
- [ ] Add currency selector / wallet switcher
- [ ] Add show-hide balance toggle
- [ ] Add deposit and transfer CTAs
- [ ] Add active deliveries banner
- [ ] Add quick actions row for Airtime, Data, TV, Electricity, Send Package, Track Package
- [ ] Add transactions preview list
- [ ] Add loading, empty, and error states for wallet sections
- [ ] Add notifications badge/link affordance
- [ ] Remove the wallet tab/page once all wallet UI is migrated

## Decisions Made
- Wallet page is removed entirely.
- Home owns all balance and wallet UI.
- Quick actions may need horizontal scrolling if 6 items do not fit.

## Blocked By
- The current Home layout needs an audit before moving UI.
- Remaining wallet subroutes still exist and need to be folded or deleted deliberately.

## Next Agent Instructions
- Start by auditing what currently exists on Home.
- Compare against the old wallet screens before deleting routes.
- Keep the migration incremental so tab/navigation wiring does not break.

