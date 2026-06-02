# Send Money Stepper Flow

## Status
Completed.

## Context
The wallet flows are still rendered as long scrollable forms with visible step labels/numbers. The correct pattern is progressive disclosure: one step visible at a time, completed steps fully collapsed, and only a slim top progress indicator or dots. This applies to bank transfer, inter-app transfer, airtime, data, TV, and electricity.

## Files Involved
### Current screens
- `apps/user/app/(tabs)/wallet/transfer.tsx` - current send money flow; contains `transferStep` state and visible in-form step content.
- `apps/user/app/(tabs)/wallet/airtime.tsx` - current airtime flow; uses `WalletStepper` and long scroll layout.
- `apps/user/app/(tabs)/wallet/data.tsx` - current data flow; uses `WalletStepper` and long scroll layout.
- `apps/user/app/(tabs)/wallet/tv.tsx` - current TV flow; uses `WalletStepper` and long scroll layout.
- `apps/user/app/(tabs)/wallet/electricity.tsx` - current electricity flow; uses `WalletStepper` and long scroll layout.

### Current shared helpers
- `apps/user/hooks/useWallet.ts` - current wallet hooks for transfer, lookup, bills, providers, and bank directory.
- `apps/user/lib/wallet.ts` - current provider/bill metadata, formatting helpers, bank directory types.
- `apps/user/components/wallet/WalletFlow.tsx` - shared `WalletStepper`, `ProviderBadge`, and provider label helpers used by bill flows.

### Backend/API files to update
- `apps/api/src/modules/wallet/wallet.controller.ts` - wallet endpoints already call bank lookup, provider lookup, bill purchase, and transfer methods.
- `apps/api/src/modules/wallet/wallet.service.ts` - currently exposes the wallet/bill API surface; needs any lookup or payload changes.
- `apps/api/src/lib/paystack.ts` - Paystack bank list / account resolve helpers live here.
- `apps/api/src/config/env.ts` - `PAYSTACK_SECRET_KEY` is already part of env config.
- `apps/api/src/lib/vtpass.ts` - provider service/variation/validation source for airtime, data, TV, and electricity.

## Goal
Rewrite the send money and utility purchase flows as step-by-step screens with slide transitions, no visible step numbers in the form body, and only one active step on screen at any time.

## Tasks
- [x] Audit the existing transfer, airtime, data, TV, and electricity screens against the progressive disclosure rules
- [x] Remove all visible step numbers and "Step 1 of 3" style labels from the form body
- [x] Add a single top-only progress indicator for each flow
- [x] Implement step transitions with `Animated.Value` translateX slide animations
- [x] Implement send money bank transfer as Step 1 lookup -> Step 2 amount -> Step 3 review
- [x] Implement send money inter-app transfer as Step 1 recipient lookup -> Step 2 amount -> Step 3 review
- [x] Add `useAccountLookup(accountNumber, bankCode)` in the wallet hook layer with 300ms debounce
- [x] Add Paystack bank list / account resolve wiring to the frontend and backend helper layers
- [x] Update provider endpoints and UI types to surface `logoUrl`
- [x] Rewrite airtime as 3-step progressive disclosure with provider detection first
- [x] Rewrite data as 3-step progressive disclosure with provider detection first
- [x] Rewrite TV as 3-step progressive disclosure with provider selection first
- [x] Rewrite electricity as 3-step progressive disclosure with provider selection first
- [x] Keep completed steps collapsed out of view entirely
- [x] Ensure header back button navigates to the previous step, not an in-form back button

## Decisions Made
- The only visible progress indicator will be a slim top bar or dot indicators.
- No numbered labels are allowed anywhere in the form body.
- Inter-app transfer uses internal user lookup before amount entry.
- Bank transfer uses Paystack bank lookup and account resolve after the 10-digit account number is entered.
- Provider logo rendering should use `logoUrl` when present, with a fallback to provider initials.
- Implementation order is: bank transfer, inter-app transfer, airtime, data, TV, electricity.

## Blocked By
- The current screens already include long-form layouts and shared stepper UI that must be replaced or hidden.
- `WalletStepper` is currently reused across several flows and needs to be retired or confined to the new top-only indicator pattern.
- The frontend hook layer does not yet expose `useAccountLookup`.
- Provider payloads may need backend `logoUrl` support if existing API responses do not already include it.

## Next Agent Instructions
- Start by rewriting `apps/user/app/(tabs)/wallet/transfer.tsx` into the bank-transfer and inter-app progressive disclosure flow.
- Add the new account lookup hook in `apps/user/hooks/useWallet.ts` or a dedicated wallet hook file before wiring the UI.
- After transfer is converted, move to `apps/user/app/(tabs)/wallet/airtime.tsx`, then `data.tsx`, `tv.tsx`, and `electricity.tsx` in that order.
- Keep each step isolated, slide-based, and single-purpose.
- If you stop mid-implementation, update this file with the exact flow and step where you stopped.

