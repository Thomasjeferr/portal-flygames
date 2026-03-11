-- CreateTable
CREATE TABLE "team_lineup_slots" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "team_member_id" TEXT NOT NULL,
    "tactical_position" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_lineup_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_lineup_slots_team_id_team_member_id_key" ON "team_lineup_slots"("team_id", "team_member_id");

-- AddForeignKey
ALTER TABLE "team_lineup_slots" ADD CONSTRAINT "team_lineup_slots_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_lineup_slots" ADD CONSTRAINT "team_lineup_slots_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
