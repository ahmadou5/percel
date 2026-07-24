-- AlterEnum
ALTER TYPE "VehicleType" ADD VALUE 'TRICYCLE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "recipientPhone" TEXT;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "dailyTransferUsage" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lastTransferDate" TIMESTAMP(3);
