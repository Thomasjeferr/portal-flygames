-- Make special_category_id optional (for Pré-estreia Meta games)
ALTER TABLE "PreSaleGame" ALTER COLUMN "special_category_id" DROP NOT NULL;
