-- AlterEnum safely
ALTER TYPE "VehicleType" ADD VALUE IF NOT EXISTS 'TRICYCLE';

-- AlterTable Order safely
ALTER TABLE "Order" 
ADD COLUMN IF NOT EXISTS "recipientName" TEXT,
ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;

-- AlterTable Wallet safely
ALTER TABLE "Wallet" 
ADD COLUMN IF NOT EXISTS "dailyTransferUsage" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastTransferDate" TIMESTAMP(3);
