-- Sponsor: vínculo ao pedido e à assinatura Stripe (recorrência + revogar acesso ao cancelar)
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "sponsor_order_id" TEXT;
ALTER TABLE "Sponsor" ADD COLUMN IF NOT EXISTS "external_subscription_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Sponsor_sponsor_order_id_key" ON "Sponsor"("sponsor_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "Sponsor_external_subscription_id_key" ON "Sponsor"("external_subscription_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sponsor_sponsor_order_id_fkey') THEN
    ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_sponsor_order_id_fkey" FOREIGN KEY ("sponsor_order_id") REFERENCES "SponsorOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
