-- Backfill: travar o valor exibido para assinaturas que ainda têm amount_cents NULL.
-- Usa o preço atual do plano como valor "travado" (evita que mudanças futuras no preço alterem o que o usuário vê).
UPDATE "Subscription" s
SET amount_cents = ROUND(p.price * 100)::INTEGER
FROM "Plan" p
WHERE p.id = s."plan_id" AND s.amount_cents IS NULL;

-- Idem para compras antigas (Histórico de compras) sem amount_cents preenchido.
UPDATE "Purchase" u
SET amount_cents = ROUND(p.price * 100)::INTEGER
FROM "Plan" p
WHERE p.id = u."plan_id" AND u.amount_cents IS NULL;
