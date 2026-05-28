-- Add wallet PIN hash to users for transfer authorization
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "walletPinHash" TEXT;
