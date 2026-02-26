-- Baseline: registra no histórico as tabelas/colunas que já existem no banco (evita drift).
-- Usa IF NOT EXISTS para não falhar se já estiver aplicado.

-- Plan.featured
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;

-- PartnerWithdrawal
CREATE TABLE IF NOT EXISTS "PartnerWithdrawal" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_url" TEXT,

    CONSTRAINT "PartnerWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerWithdrawalItem" (
    "id" TEXT NOT NULL,
    "withdrawal_id" TEXT NOT NULL,
    "earning_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "PartnerWithdrawalItem_pkey" PRIMARY KEY ("id")
);

-- TeamWithdrawal
CREATE TABLE IF NOT EXISTS "TeamWithdrawal" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_url" TEXT,

    CONSTRAINT "TeamWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamWithdrawalPlanItem" (
    "id" TEXT NOT NULL,
    "withdrawal_id" TEXT NOT NULL,
    "earning_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "TeamWithdrawalPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamWithdrawalSponsorshipItem" (
    "id" TEXT NOT NULL,
    "withdrawal_id" TEXT NOT NULL,
    "earning_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "TeamWithdrawalSponsorshipItem_pkey" PRIMARY KEY ("id")
);

-- FKs (ignorar se já existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerWithdrawal_partner_id_fkey') THEN
        ALTER TABLE "PartnerWithdrawal" ADD CONSTRAINT "PartnerWithdrawal_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerWithdrawalItem_withdrawal_id_fkey') THEN
        ALTER TABLE "PartnerWithdrawalItem" ADD CONSTRAINT "PartnerWithdrawalItem_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "PartnerWithdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PartnerWithdrawalItem_earning_id_fkey') THEN
        ALTER TABLE "PartnerWithdrawalItem" ADD CONSTRAINT "PartnerWithdrawalItem_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "PartnerEarning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamWithdrawal_team_id_fkey') THEN
        ALTER TABLE "TeamWithdrawal" ADD CONSTRAINT "TeamWithdrawal_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamWithdrawalPlanItem_withdrawal_id_fkey') THEN
        ALTER TABLE "TeamWithdrawalPlanItem" ADD CONSTRAINT "TeamWithdrawalPlanItem_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "TeamWithdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamWithdrawalPlanItem_earning_id_fkey') THEN
        ALTER TABLE "TeamWithdrawalPlanItem" ADD CONSTRAINT "TeamWithdrawalPlanItem_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "TeamPlanEarning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamWithdrawalSponsorshipItem_withdrawal_id_fkey') THEN
        ALTER TABLE "TeamWithdrawalSponsorshipItem" ADD CONSTRAINT "TeamWithdrawalSponsorshipItem_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "TeamWithdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamWithdrawalSponsorshipItem_earning_id_fkey') THEN
        ALTER TABLE "TeamWithdrawalSponsorshipItem" ADD CONSTRAINT "TeamWithdrawalSponsorshipItem_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "TeamSponsorshipEarning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
