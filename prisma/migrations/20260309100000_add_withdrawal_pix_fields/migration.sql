-- AlterTable
ALTER TABLE "PartnerWithdrawal" ADD COLUMN IF NOT EXISTS "pix_key" TEXT;
ALTER TABLE "PartnerWithdrawal" ADD COLUMN IF NOT EXISTS "pix_key_type" TEXT;
ALTER TABLE "PartnerWithdrawal" ADD COLUMN IF NOT EXISTS "pix_name" TEXT;

-- AlterTable
ALTER TABLE "TeamWithdrawal" ADD COLUMN IF NOT EXISTS "pix_key" TEXT;
ALTER TABLE "TeamWithdrawal" ADD COLUMN IF NOT EXISTS "pix_key_type" TEXT;
ALTER TABLE "TeamWithdrawal" ADD COLUMN IF NOT EXISTS "pix_name" TEXT;
