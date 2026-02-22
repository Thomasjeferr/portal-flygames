-- DropIndex
DROP INDEX "User_favorite_team_id_idx";

-- AlterTable
ALTER TABLE "EmailSettings" ALTER COLUMN "from_email" SET DEFAULT 'no-reply@flygames.app';

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "sumula_published_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "game_sumula_approvals" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "rejected_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sumula_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_stats" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "team_member_id" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "fouls" INTEGER NOT NULL DEFAULT 0,
    "yellow_card" BOOLEAN NOT NULL DEFAULT false,
    "red_card" BOOLEAN NOT NULL DEFAULT false,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_sumula_approvals_game_id_team_id_key" ON "game_sumula_approvals"("game_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_stats_game_id_team_member_id_key" ON "player_match_stats"("game_id", "team_member_id");

-- AddForeignKey
ALTER TABLE "game_sumula_approvals" ADD CONSTRAINT "game_sumula_approvals_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sumula_approvals" ADD CONSTRAINT "game_sumula_approvals_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
