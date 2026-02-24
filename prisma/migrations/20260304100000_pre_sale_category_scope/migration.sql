-- Add scope to PreSaleCategory: CLUB = only Pré-estreia Clubes, META = only Pré-estreia Meta
ALTER TABLE "PreSaleCategory" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'CLUB';
