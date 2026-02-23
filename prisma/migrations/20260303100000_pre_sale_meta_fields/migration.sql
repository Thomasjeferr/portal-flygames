-- AlterTable
ALTER TABLE "PreSaleGame"
  ADD COLUMN IF NOT EXISTS "meta_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "meta_extra_per_team" INTEGER,
  ADD COLUMN IF NOT EXISTS "baseline_home_subs" INTEGER,
  ADD COLUMN IF NOT EXISTS "baseline_away_subs" INTEGER,
  ADD COLUMN IF NOT EXISTS "meta_home_total" INTEGER,
  ADD COLUMN IF NOT EXISTS "meta_away_total" INTEGER;

