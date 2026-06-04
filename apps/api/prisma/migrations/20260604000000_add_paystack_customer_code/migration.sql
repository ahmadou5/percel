-- AlterTable
ALTER TABLE "User" ADD COLUMN "paystackCustomerCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_paystackCustomerCode_key" ON "User"("paystackCustomerCode");
