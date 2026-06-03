# KYC View Improvement

## Status
Completed.

## Context
Refactor the customer KYC screen into a multi-step flow, using the same step-by-step pattern already implemented on the Transfer page. The goal is to replace the current single long form with a staged flow such as Personal Info, ID Upload, and Review & Submit.

## Root Cause
- The customer KYC screen is implemented as one long, dense form, so users must parse all sections at once instead of progressing through a guided flow.
- The Transfer page already has a proven step-flow pattern with shared progress UI, back/next navigation, and step-specific content blocks, but KYC is not reusing that structure.
- The current KYC layout mixes identity fields, bank selection, consent, and submission actions in one view, which makes the page harder to scan and less consistent with other staged wallet flows.

## Affected Files
- `apps/user/app/settings/kyc.tsx`
- `apps/user/components/wallet/WalletFlowProgress.tsx`
- `apps/user/app/(tabs)/wallet/transfer.tsx`
- `apps/user/hooks/useProfile.ts`

## Plan
- [x] Scan the KYC screen implementation.
- [x] Scan the Transfer page step-flow pattern to mirror it.
- [x] Document the root cause and affected files in this note.
- [x] Refactor the KYC UI into logical steps without changing submission/API logic.
- [x] Verify light and dark themes render correctly.

## Next Agent Instructions
- No immediate follow-up needed for this slice.
