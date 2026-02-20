-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "favorite_team_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_favorite_team_id_idx" ON "User"("favorite_team_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_favorite_team_id_fkey" FOREIGN KEY ("favorite_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
