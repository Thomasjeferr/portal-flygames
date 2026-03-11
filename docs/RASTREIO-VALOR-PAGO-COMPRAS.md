# Rastreio: por que os valores das compras ficam errados

Este doc explica **onde** o valor é definido em cada fluxo e **por que** pode acabar gravado errado (ex.: R$ 29,00 em vez de R$ 5,03).

---

## Fluxo 1: Assinatura recorrente (cartão) – ex.: Patrocinador Torcedor R$ 5,03

### Caminho do valor

1. **Checkout** (`POST /api/checkout`): plano recorrente + cartão → **não cria Purchase**. Só chama Stripe (createStripeSubscription) e devolve `clientSecret`. O valor cobrado é o que o Stripe usa na criação da assinatura (ex.: R$ 5,03).
2. **Webhook Stripe `invoice.paid`**: é aqui que a Purchase e a Subscription são criadas/atualizadas.
   - Valor usado: `amountCents = typeof invoice.amount_paid === 'number' ? invoice.amount_paid : Math.round(plan.price * 100)`.
   - **Problema:** O objeto `event.data.object` (Invoice) às vezes vem **sem** `amount_paid` no payload. Aí caímos no fallback `plan.price * 100`. Se o plano no admin estava R$ 29,00, gravamos 2900 centavos → aparece R$ 29,00.
   - **Correção:** Se `invoice.amount_paid` não vier no evento, buscar a invoice completa com `stripe.invoices.retrieve(invoice.id)` e usar o `amount_paid` retornado. Assim nunca usamos `plan.price` quando o Stripe já cobrou outro valor. **(Implementado em `route.ts`: retrieve da invoice quando amount_paid ausente.)**

### Resumo

| Onde          | Valor usado hoje                    | Quando dá errado                         |
|---------------|-------------------------------------|------------------------------------------|
| invoice.paid  | invoice.amount_paid ?? plan.price   | amount_paid não vem no payload → plan.price (ex.: 29,00) |

---

## Fluxo 2: Jogo avulso (PIX Woovi) – ex.: Patrocinar 1 Jogo R$ 5,00

### Caminho do valor

1. **Checkout** (`POST /api/checkout`): plano unitário + PIX → **cria Purchase** com `amountCents = Math.round(plan.price * 100)`. Ex.: se o plano estava R$ 17,97, grava 1797.
2. Cria cobrança na Woovi com `value: amountCents` (centavos) e `externalId: purchase.id`.
3. **Webhook Woovi** (`CHARGE_COMPLETED`): chama `markWooviPurchaseAsPaid(correlationId, wooviChargeValueCents)`.
   - `wooviChargeValueCents` vem de `charge.value` ou `body.value`, com regra: se valor < 100 e decimal → tratar como reais (× 100).
   - **Problema:** Se `value` não vier no payload (outro formato/campo) ou vier em reais (5.00) e a regra antiga fazia `Math.round(5)` = 5 centavos, a gente podia ignorar ou gravar errado. E em `markWooviPurchaseAsPaid`, quando `amountCents` (do webhook) é `undefined`, usamos `purchase.amountCents ?? plan.price*100` → o valor do **checkout** (1797) permanece. Ou seja: **o valor que realmente foi pago (5,00) não sobrescreve o valor do checkout (17,97)**.
   - **Correção:** Garantir que o webhook sempre leia o valor do payload (tentar `charge.value`, `charge.valueWithDiscount`, `body.value`, `body.amount`) e **sempre** passar esse valor para `markWooviPurchaseAsPaid`. Quando o valor não for encontrado, logar aviso em produção. **(Implementado: fallbacks e log em `woovi/route.ts`.)**

### Resumo

| Onde              | Valor usado hoje                          | Quando dá errado                                      |
|-------------------|-------------------------------------------|--------------------------------------------------------|
| Checkout          | plan.price * 100 (ex.: 17,97 → 1797)      | Sempre; será sobrescrito pelo webhook se vier valor.  |
| Webhook Woovi     | charge.value (centavos ou reais)          | value ausente ou em outro campo → não sobrescreve.    |
| markWooviPurchaseAsPaid | wooviChargeValueCents ?? purchase.amountCents ?? plan | Se webhook não manda valor → fica 17,97 (checkout).   |

---

## Ajustes feitos no código

1. **Stripe `invoice.paid`:** Se `invoice.amount_paid` não estiver em `event.data.object`, buscar a invoice com `stripe.invoices.retrieve(invoice.id)` e usar o `amount_paid` retornado antes de qualquer fallback para `plan.price`. ✅
2. **Woovi:** Ler valor de `charge.value`, `charge.valueWithDiscount`, `charge.amount`, `body.value`, `body.amount`; logar quando o valor do gateway não for encontrado. ✅
3. **Registros antigos:** Os que já estão com 29,00 e 17,97 foram gravados antes dessas correções. Para corrigir no banco: rodar o script único `scripts/fix-amount-cents.ts` (variável `FIX_USER_EMAIL` e opcionalmente `SUBSCRIPTION_CENTS`, `PURCHASE_TORCEDOR_CENTS`, `PURCHASE_1JOGO_CENTS`) ou atualizar manualmente por id.
4. **Tela da conta:** Em Assinatura/Plano e Histórico de compras **não** exibimos o preço atual do plano (`plan.price`). Só exibimos o valor pago (`amountCents`); se não houver, exibe "—".

---

## Referência rápida de arquivos

| Arquivo | O que faz |
|---------|-----------|
| `src/app/api/checkout/route.ts` | Cria Purchase com plan.price; não cria Purchase em assinatura recorrente cartão. |
| `src/app/api/webhooks/stripe/route.ts` | invoice.paid: usa amount_paid ou plan.price; payment_intent.succeeded: usa obj.amount. |
| `src/app/api/webhooks/woovi/route.ts` | Lê valor do payload, chama markWooviPurchaseAsPaid(purchaseId, valueCents). |
| `src/lib/payments/wooviPurchaseHandler.ts` | Atualiza Purchase e Subscription com paidAmountCents (webhook ou fallback). |
