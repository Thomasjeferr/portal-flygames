-- SponsorPlan: tipo (empresarial/torcedor), fidelidade e aceite contratual
ALTER TABLE "SponsorPlan" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'sponsor_company';
ALTER TABLE "SponsorPlan" ADD COLUMN IF NOT EXISTS "has_loyalty" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SponsorPlan" ADD COLUMN IF NOT EXISTS "loyalty_months" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SponsorPlan" ADD COLUMN IF NOT EXISTS "loyalty_notice_text" TEXT;
ALTER TABLE "SponsorPlan" ADD COLUMN IF NOT EXISTS "require_contract_acceptance" BOOLEAN NOT NULL DEFAULT false;

-- SponsorOrder: aceite contratual no checkout
ALTER TABLE "SponsorOrder" ADD COLUMN IF NOT EXISTS "contract_accepted_at" TIMESTAMP(3);
ALTER TABLE "SponsorOrder" ADD COLUMN IF NOT EXISTS "contract_version" TEXT;
ALTER TABLE "SponsorOrder" ADD COLUMN IF NOT EXISTS "contract_snapshot" TEXT;

-- Sponsor: snapshot do contrato e fidelidade (preenchido no webhook)
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "plan_type" TEXT;
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "has_loyalty" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "loyalty_months" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "loyalty_start_date" TIMESTAMP(3);
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "loyalty_end_date" TIMESTAMP(3);
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "contract_status" TEXT;
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "cancellation_requested_at" TIMESTAMP(3);
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;

-- Backfill: planos existentes permanecem sponsor_company sem fidelidade
-- (já aplicado pelos defaults acima)
