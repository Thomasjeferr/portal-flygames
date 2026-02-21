-- AlterTable
ALTER TABLE "Live" ADD COLUMN "team_id" TEXT;

-- AlterTable
ALTER TABLE "PreSaleGame" ADD COLUMN "team_id" TEXT;

-- AddForeignKey
ALTER TABLE "Live" ADD CONSTRAINT "Live_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSaleGame" ADD CONSTRAINT "PreSaleGame_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
