# Customer KYC + Transaction Modal

## Status
Completed. Top-up completion and receipt exports now surface success or failure from the shared result modal.

## Context
Two customer-app changes are being finalized in the current workspace:
- customer KYC uses Paystack bank-account identification for BVN-linked verification, while Smile stays isolated to the driver app,
- transaction completion and receipt exports for wallet top-up and bill payments should use the in-app result modal instead of native alerts.

## Checked So Far
- `apps/api/src/lib/paystack.ts` already exposes `validateCustomerIdentity(...)` and test-mode credentials.
- `apps/api/src/modules/user/user.service.ts` already routes customer BVN verification through Paystack.
- `apps/user/app/settings/kyc.tsx` already presents the customer KYC form with BVN, account number, bank selector, and pending state.
- `apps/user/components/TransactionResultModal.tsx` already exists and matches the requested modal shape.
- `apps/user/app/(tabs)/wallet/airtime.tsx`, `data.tsx`, `electricity.tsx`, and `tv.tsx` already use the shared result modal pattern.
- `apps/user/app/(tabs)/wallet/topup.tsx` now shows success or failure after the Paystack session closes.
- `apps/user/app/(tabs)/wallet/transactions.tsx` and `transfer.tsx` now use the shared modal for receipt export results.

## Next Steps
- No immediate follow-up needed for this slice.
