# Pagamentos (Woovi + Stripe)

## Variáveis de ambiente

### Woovi (Pix)
- `WOOVI_API_KEY` – Chave da API Woovi
- `WOOVI_WEBHOOK_SECRET` – (opcional) Segredo para validar webhooks

### Stripe (cartão)
- `STRIPE_SECRET_KEY` – Chave secreta do Stripe
- `STRIPE_WEBHOOK_SECRET` – Segredo do webhook (terminal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – Chave pública (para Stripe Elements no front)

## Webhooks

- **Woovi:** `POST /api/webhooks/woovi` – configurar na dashboard Woovi
- **Stripe:** `POST /api/webhooks/stripe` – usar `stripe listen` em desenvolvimento

Após pagamento confirmado, o sistema libera acesso (Purchase paid ou Subscription ativa).
