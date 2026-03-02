-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "elenco_change_rule" TEXT NOT NULL DEFAULT 'FULL',
ADD COLUMN     "elenco_changes_per_phase" INTEGER,
ADD COLUMN     "elenco_deadline_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN     "elenco_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tournament_team_elenco" (
    "id" TEXT NOT NULL,
    "tournament_team_id" TEXT NOT NULL,
    "team_member_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phase_round" INTEGER,

    CONSTRAINT "tournament_team_elenco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_team_elenco_changes" (
    "id" TEXT NOT NULL,
    "tournament_team_id" TEXT NOT NULL,
    "phase_round" INTEGER NOT NULL,
    "changes_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_team_elenco_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_team_elenco_tournament_team_id_team_member_id_key" ON "tournament_team_elenco"("tournament_team_id", "team_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_team_elenco_changes_tournament_team_id_phase_rou_key" ON "tournament_team_elenco_changes"("tournament_team_id", "phase_round");

-- AddForeignKey
ALTER TABLE "tournament_team_elenco" ADD CONSTRAINT "tournament_team_elenco_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "tournament_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_team_elenco" ADD CONSTRAINT "tournament_team_elenco_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_team_elenco_changes" ADD CONSTRAINT "tournament_team_elenco_changes_tournament_team_id_fkey" FOREIGN KEY ("tournament_team_id") REFERENCES "tournament_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
