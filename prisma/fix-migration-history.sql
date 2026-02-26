-- Corrige o histórico de migrações após renomear as pastas localmente.
-- 1) Ajusta os nomes no banco para bater com as pastas locais.
-- 2) Atualiza os checksums para que o Prisma não acuse "migration was modified after it was applied".
-- Execute UMA VEZ no banco (Neon SQL Editor ou: npx prisma db execute --file prisma/fix-migration-history.sql)
-- Depois rode: npx prisma migrate dev

UPDATE "_prisma_migrations"
SET "migration_name" = '20260218125821_add_sponsor_order_instagram',
    "checksum" = 'b5935c650258746419cd57ef069101eb04bb340bb977a228ad14f3e9db5924be'
WHERE "migration_name" = '20260213100000_add_sponsor_order_instagram';

UPDATE "_prisma_migrations"
SET "migration_name" = '20260218125822_add_watch_progress',
    "checksum" = '1558a7a0a890ca54a4b343849e8e7cb4c70009f339396eb643c157b3860589c3'
WHERE "migration_name" = '20260213110000_add_watch_progress';

-- Se já tiver renomeado antes, atualiza só o checksum (para "modified after applied"):
UPDATE "_prisma_migrations"
SET "checksum" = 'b5935c650258746419cd57ef069101eb04bb340bb977a228ad14f3e9db5924be'
WHERE "migration_name" = '20260218125821_add_sponsor_order_instagram';

UPDATE "_prisma_migrations"
SET "checksum" = '1558a7a0a890ca54a4b343849e8e7cb4c70009f339396eb643c157b3860589c3'
WHERE "migration_name" = '20260218125822_add_watch_progress';
