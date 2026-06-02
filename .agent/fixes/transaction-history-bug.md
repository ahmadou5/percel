# Transaction History Bug

## Status
Completed.

## Context
The transaction history screen showed incorrect credit/debit totals, the list container collapsed instead of filling the remaining space, and tapping a row only showed a minimal detail view.

## Files Involved
- `apps/user/app/(tabs)/wallet/transactions.tsx` - transaction history list, summary card, and transaction detail modal.
- `apps/user/hooks/useWallet.ts` - `useTransactions` infinite query used by the screen.
- `apps/user/lib/wallet.ts` - transaction formatting helpers and labels.
- `apps/user/package.json` - receipt export dependencies for image/PDF output.

## Goal
Fix the transaction history screen so credits/debits show total loaded amounts, the history card fills the available space, and the modal can share a receipt as an image or PDF.

## Root Cause Found
- The summary totals were derived from the visible/filtered set instead of the full loaded transaction array.
- The list wrapper did not force the `FlashList` to expand to the available height.
- The row detail modal was too small and lacked receipt-style actions.

## Tasks
- [x] Audit the transaction history screen and data flow before editing
- [x] Recompute credits and debits from the full loaded transaction set
- [x] Expand the history card so the list fills the available space
- [x] Add a transaction detail modal with richer receipt content
- [x] Add receipt export actions for image and PDF sharing where available
- [x] Verify the edited screen with lint

## Decisions Made
- Credits and debits now represent total loaded amounts, not the current search-filtered subset.
- The list uses an explicit flex contract on both the card container and the `FlashList` surface.
- The modal includes a receipt preview plus image/PDF export actions.

## Blocked By
- None.

## Next Agent Instructions
- If you want a more branded receipt later, replace the inline PDF HTML with a dedicated receipt template and add logo/QR data.
- If web support becomes important, add a web-specific receipt sharing fallback and test the modal in Expo web.
