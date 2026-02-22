-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "partner_commission_percent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SponsorPlan" ADD COLUMN "partner_commission_percent" INTEGER NOT NULL DEFAULT 0;
