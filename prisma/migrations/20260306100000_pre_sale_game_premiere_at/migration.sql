-- Data e hora da estreia do jogo (informativo)
ALTER TABLE "PreSaleGame" ADD COLUMN IF NOT EXISTS "premiere_at" TIMESTAMP(3);
