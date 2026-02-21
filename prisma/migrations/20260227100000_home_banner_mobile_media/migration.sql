-- AlterTable
ALTER TABLE "HomeBanner" ADD COLUMN "mobile_media_type" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "HomeBanner" ADD COLUMN "mobile_media_url" TEXT;
