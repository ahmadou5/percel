-- Retire the fictional ₦9,999,999,999.99 platform wallet seed.
-- The platform float is now tracked by real LedgerEntry settlements (payouts, order payments).
UPDATE "Wallet"
SET "balance" = 0, "ledgerBalance" = 0
WHERE "id" = '00000000-0000-0000-0000-000000000001'
  AND "balance" >= 9999999999;
