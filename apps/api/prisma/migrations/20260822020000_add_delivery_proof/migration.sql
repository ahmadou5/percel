-- Delivery proof of delivery (POD) fields on Order
ALTER TABLE "Order" ADD COLUMN "proofImageUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "proofOtp" TEXT;
ALTER TABLE "Order" ADD COLUMN "proofUploadedAt" TIMESTAMP(3);
