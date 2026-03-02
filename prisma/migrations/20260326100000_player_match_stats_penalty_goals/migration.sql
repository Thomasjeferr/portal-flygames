-- AlterTable
ALTER TABLE "player_match_stats" ADD COLUMN IF NOT EXISTS "penalty_goals" INTEGER NOT NULL DEFAULT 0;
