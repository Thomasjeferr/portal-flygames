-- Pré-estreia: teamId no slot; 1:N conta clube por time (vários slots por conta)
-- 1) Novas colunas
ALTER TABLE "PreSaleClubSlot" ADD COLUMN "team_id" TEXT;
ALTER TABLE "PreSaleClubSlot" ADD COLUMN "club_viewer_account_id" TEXT;
ALTER TABLE "ClubViewerAccount" ADD COLUMN "team_id" TEXT;

-- 2) Backfill: vincular slot à conta existente (antes de remover pre_sale_club_slot_id)
UPDATE "PreSaleClubSlot" s
SET club_viewer_account_id = c.id
FROM "ClubViewerAccount" c
WHERE c.pre_sale_club_slot_id = s.id;

-- 3) Remover FK antiga e coluna
ALTER TABLE "ClubViewerAccount" DROP CONSTRAINT "ClubViewerAccount_pre_sale_club_slot_id_fkey";
ALTER TABLE "ClubViewerAccount" DROP COLUMN "pre_sale_club_slot_id";

-- 4) Índice único e FK para nova relação
CREATE UNIQUE INDEX "ClubViewerAccount_team_id_key" ON "ClubViewerAccount"("team_id");
ALTER TABLE "PreSaleClubSlot" ADD CONSTRAINT "PreSaleClubSlot_club_viewer_account_id_fkey"
  FOREIGN KEY ("club_viewer_account_id") REFERENCES "ClubViewerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
