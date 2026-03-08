-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "max_concurrent_streams" INTEGER;
