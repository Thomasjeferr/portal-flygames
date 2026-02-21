-- AlterTable Live: trocar team_id por home_team_id e away_team_id
ALTER TABLE "Live" DROP CONSTRAINT IF EXISTS "Live_team_id_fkey";
ALTER TABLE "Live" DROP COLUMN IF EXISTS "team_id";
ALTER TABLE "Live" ADD COLUMN "home_team_id" TEXT;
ALTER TABLE "Live" ADD COLUMN "away_team_id" TEXT;
ALTER TABLE "Live" ADD CONSTRAINT "Live_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Live" ADD CONSTRAINT "Live_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable PreSaleGame: trocar team_id por home_team_id e away_team_id
ALTER TABLE "PreSaleGame" DROP CONSTRAINT IF EXISTS "PreSaleGame_team_id_fkey";
ALTER TABLE "PreSaleGame" DROP COLUMN IF EXISTS "team_id";
ALTER TABLE "PreSaleGame" ADD COLUMN "home_team_id" TEXT;
ALTER TABLE "PreSaleGame" ADD COLUMN "away_team_id" TEXT;
ALTER TABLE "PreSaleGame" ADD CONSTRAINT "PreSaleGame_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PreSaleGame" ADD CONSTRAINT "PreSaleGame_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
