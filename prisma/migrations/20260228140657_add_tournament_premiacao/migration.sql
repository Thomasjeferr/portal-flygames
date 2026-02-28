-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "craque_da_copa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "premiacao_tipo" TEXT,
ADD COLUMN     "premio_primeiro" DOUBLE PRECISION,
ADD COLUMN     "premio_quarto" DOUBLE PRECISION,
ADD COLUMN     "premio_segundo" DOUBLE PRECISION,
ADD COLUMN     "premio_terceiro" DOUBLE PRECISION,
ADD COLUMN     "trofeu_artilheiro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trofeu_campeao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trofeu_quarto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trofeu_terceiro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trofeu_vice" BOOLEAN NOT NULL DEFAULT false;
