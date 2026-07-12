CREATE TYPE "PaymentProvider" AS ENUM ('MONNIFY', 'PAYSTACK', 'SQUAD');

ALTER TABLE "Wallet" ADD COLUMN "paymentProvider" "PaymentProvider";

CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "AppSetting" ("key", "value", "updatedAt")
VALUES ('payment.activeProvider', '{"provider":"MONNIFY"}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
