-- Melhorias na tabela team_requests: novos campos e status

-- Criar enum de status
CREATE TYPE "TeamRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

-- Adicionar novos campos
ALTER TABLE "team_requests" ADD COLUMN "city" TEXT;
ALTER TABLE "team_requests" ADD COLUMN "phone" TEXT;
ALTER TABLE "team_requests" ADD COLUMN "status" "TeamRequestStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "team_requests" ADD COLUMN "resolved_at" TIMESTAMP(3);

-- Atualizar team_name para NOT NULL (definir valor padrão para registros existentes sem nome)
UPDATE "team_requests" SET "team_name" = 'Não informado' WHERE "team_name" IS NULL;
ALTER TABLE "team_requests" ALTER COLUMN "team_name" SET NOT NULL;

-- Atualizar user_id para NOT NULL (remover registros órfãos sem usuário)
DELETE FROM "team_requests" WHERE "user_id" IS NULL;
ALTER TABLE "team_requests" ALTER COLUMN "user_id" SET NOT NULL;

-- Atualizar foreign key para CASCADE
ALTER TABLE "team_requests" DROP CONSTRAINT IF EXISTS "team_requests_user_id_fkey";
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
