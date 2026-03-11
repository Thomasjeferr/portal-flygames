-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancellation_requested_at" TIMESTAMP(3);
