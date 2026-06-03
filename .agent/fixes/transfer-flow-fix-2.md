# Transfer Flow Fix 2

## Status
Completed.

## Context
The wallet transfer flow has multiple regressions affecting both inter-app transfers and bank transfers:
- the transfer card can disappear or reflow unexpectedly during validation/loading,
- recipient phone lookup fires inconsistently,
- the review step incorrectly includes PIN entry,
- PIN validation can re-run repeatedly for a single submission,
- success and failure outcomes are only handled with alerts instead of dedicated modals.

## Files Involved
- `apps/user/app/(tabs)/wallet/transfer.tsx`
- `apps/user/components/wallet/WalletFlow.tsx`
- `apps/user/components/wallet/WalletFlowProgress.tsx`
- `apps/user/hooks/useWallet.ts`
- `apps/user/lib/wallet.ts`
- `apps/api/src/modules/wallet/wallet.controller.ts`
- `apps/api/src/modules/wallet/wallet.service.ts`

## Goal
Stabilize the transfer flow for both transfer modes, make review and PIN confirmation behave correctly, and add explicit success/failure states with receipt export support.

## Root Causes
- The transfer screen auto-advances steps off validation state, so the lookup card unmounts as soon as validation resolves and can appear to vanish during load/focus/re-render churn.
- The recipient lookup effect depends on the mutation object rather than the stable mutate function and does not guard stale responses, so validation can restart or resolve out of order.
- The review step currently renders the PIN input inline instead of opening a separate PIN modal.
- PIN verification is not protected by a submission guard, so a single attempt can be retriggered across rerenders or repeated taps.
- Transfer completion only shows alerts, so there is no durable success/failure state or receipt export path.

## Tasks
- [x] Document the transfer-flow root causes in this note
- [x] Fix the disappearing card / unstable lookup behavior
- [x] Make recipient phone validation consistent
- [x] Move PIN entry out of the review screen and into a modal
- [x] Guard PIN validation so it runs once per submission attempt
- [x] Add success and failure modals for both transfer modes
- [x] Add receipt generation/download from the success modal
- [x] Verify parity between inter-app and bank transfer flows

## Decisions Made
- Review screens should only show transaction details.
- PIN entry is a modal that appears only after the user explicitly taps `Send money`.
- Recipient photos should use `avatarUrl` when available and fall back to initials when not.
- Receipt export can reuse the existing Expo print/share pattern already used by the transactions screen.

## Blocked By
- None.

## Next Agent Instructions
- No follow-up required unless a regression appears in the transfer flow.
- If you need to inspect the implementation again, start with `apps/user/app/(tabs)/wallet/transfer.tsx` and `apps/api/src/modules/wallet/wallet.service.ts`.
