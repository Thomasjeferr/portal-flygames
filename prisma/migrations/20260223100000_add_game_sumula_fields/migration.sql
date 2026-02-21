-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "display_mode" TEXT NOT NULL DEFAULT 'internal',
ADD COLUMN     "home_score" INTEGER,
ADD COLUMN     "away_score" INTEGER,
ADD COLUMN     "venue" TEXT,
ADD COLUMN     "referee" TEXT;
