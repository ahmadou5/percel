-- AlterEnum
ALTER TYPE "WalletTransactionCategory" ADD VALUE 'PAYOUT';

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "Payout" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "walletTransactionId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" TEXT,
    "bankCode" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "provider" "PaymentProvider",
    "providerReference" TEXT,
    "failureReason" TEXT,
    "rejectionReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_walletTransactionId_key" ON "Payout"("walletTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_providerReference_key" ON "Payout"("providerReference");

-- CreateIndex
CREATE INDEX "Payout_driverId_idx" ON "Payout"("driverId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
