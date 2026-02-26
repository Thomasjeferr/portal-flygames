# Raio-X: Pagamento PIX (Woovi) não reconhecido após pagar

Quando o cliente paga o PIX na Woovi mas o sistema não marca a compra como paga, use este guia para diagnosticar e corrigir.

---

## Como o fluxo funciona

1. **Checkout** – Cria a compra (`Purchase`) e a cobrança na Woovi com `correlationID = purchase.id`. Salva na compra `paymentGateway: 'woovi'` e `externalId: id da cobrança Woovi`.
2. **Webhook** – A Woovi chama `POST /api/webhooks/woovi` quando o PIX é pago. O sistema valida a assinatura, lê `charge.correlationID` (que é o `purchase.id`) e chama `markWooviPurchaseAsPaid(purchaseId)`.
3. **Fallback (sync)** – O front, após ~30s de polling no status, chama `POST /api/checkout/purchase/:id/sync-woovi`, que consulta o status da cobrança na API Woovi/OpenPix e, se `COMPLETED`, marca a compra como paga.

Se **nenhum** dos dois caminhos funcionar, a compra fica “pendente” mesmo após o pagamento.

---

## Checklist de diagnóstico

### 1. URL do webhook na Woovi

- No painel da Woovi (configurações de webhook), a URL deve ser exatamente a do seu domínio em produção, por exemplo:
  - `https://seudominio.com/api/webhooks/woovi`
- Deve ser **HTTPS** (não HTTP).
- Não pode ser localhost (em produção a Woovi não alcança sua máquina).

**Como verificar:** No Admin do portal (Pagamentos), a “URL do webhook Woovi” exibida deve ser a mesma que está cadastrada na Woovi.

---

### 2. “Segredo do webhook” = chave **pública** RSA

O sistema valida a assinatura do webhook com **RSA** usando a **chave pública** da Woovi.

- No Admin > Pagamentos, o campo **“Segredo do webhook”** deve conter a **chave pública** fornecida pela Woovi.
- **Qual formato usar?** O código aceita **os dois** que a Woovi mostra na tela “Webhook Security”:
  - **Chave pública (PEM):** a que começa com `-----BEGIN PUBLIC KEY-----` e termina com `-----END PUBLIC KEY-----` — pode colar inteira, com quebras de linha.
  - **Chave pública Base64:** a linha única em Base64 (sem BEGIN/END) — pode colar assim; o sistema monta o PEM automaticamente.
- **Não** use um “segredo” aleatório ou senha. Se estiver errado, o webhook retorna **401 (Assinatura inválida)** e a compra não é marcada como paga.

**Como verificar:** Nos logs da aplicação (Vercel ou servidor), se aparecer:
`[Woovi webhook] Assinatura inválida (401). Verifique se o "Segredo do webhook" no Admin é a chave pública RSA da Woovi.`
→ Copie a chave pública correta no painel Woovi e cole no Admin.

---

### 3. Logs do webhook

Foram adicionados logs para facilitar o diagnóstico:

- **Chamada recebida:** `[Woovi webhook] {"event":"...","chargeStatus":"...","hasCharge":...,"chargeId":"..."}`
- **Evento de pagamento:** `[Woovi webhook] CHARGE_COMPLETED correlationID= ...`
- **Compra marcada como paga:** `[Woovi webhook] Compra marcada como paga: <purchaseId>`
- **Assinatura inválida:** `[Woovi webhook] Assinatura inválida (401)...`
- **Falta correlationID:** `[Woovi webhook] correlationID ausente no payload...`

**O que fazer:** Em produção (ex.: Vercel), abra os logs no momento em que o cliente paga.  
- Se **não** aparecer nenhuma linha `[Woovi webhook]`, o POST do webhook não está chegando (URL errada, firewall ou Woovi não configurada para essa URL).  
- Se aparecer 401, corrija o “Segredo do webhook” (chave pública).  
- Se aparecer “correlationID ausente”, o payload da Woovi pode ter mudado; os logs mostram `event` e as chaves do objeto `charge` para análise.

---

### 4. Fallback: sincronização manual (sync-woovi)

O front chama o sync após ~30 segundos. O sync usa a API OpenPix para consultar a cobrança pelo **id da cobrança** (`purchase.externalId`).

**Correção feita:** O endpoint de consulta foi alterado de `/api/v1/charge/:id` para `/api/openpix/v1/charge/:id`, alinhado à documentação OpenPix/Woovi. Se a Woovi usar outro path, o sync pode falhar (e o GET retornar 404 ou erro).

**Como verificar:**  
- Faça um pagamento PIX de teste e espere pelo menos 30s na tela do checkout.  
- Se após 30s a compra ainda não for marcada como paga, abra o DevTools (Network) e veja a resposta de `POST .../sync-woovi`. Se vier 200 com `paid: false, synced: false`, a API de consulta pode estar falhando (verifique logs do servidor: “Woovi get charge error” ou “getWooviChargeStatus”).

---

### 5. Resumo das causas mais prováveis

| Causa | Sintoma | Ação |
|-------|--------|------|
| URL do webhook errada ou não configurada na Woovi | Nenhum log `[Woovi webhook]` ao pagar | Configurar na Woovi a URL exata em produção (HTTPS) |
| “Segredo do webhook” não é a chave pública RSA | Log `Assinatura inválida (401)` | Colar no Admin a chave pública fornecida pela Woovi |
| Endpoint de consulta da API incorreto | Sync não encontra cobrança (paid: false, synced: false) | Já ajustado para `/api/openpix/v1/charge/:id`; se ainda falhar, conferir documentação Woovi/OpenPix |
| correlationID não encontrado no payload | Log `correlationID ausente` | Código já tenta `charge.correlationID`, `charge.correlationId`, `body.correlationID`, `body.correlationId`; se a Woovi mudar o formato, usar os logs para ajustar |

---

## Alterações feitas no código (raio-x)

1. **`src/lib/payments/woovi.ts`**  
   - GET da cobrança alterado para `GET /api/openpix/v1/charge/:id` (antes era `/api/v1/charge/:id`), para bater com o path usado na criação da cobrança e com a documentação OpenPix.

2. **`src/app/api/webhooks/woovi/route.ts`**  
   - Logs de diagnóstico (evento, chargeStatus, chargeId, correlationID, compra marcada como paga, 401 e correlationID ausente).  
   - Aceite de `correlationId` (camelCase) além de `correlationID` no payload.  
   - Mensagem clara em caso de 401 indicando que o “Segredo do webhook” deve ser a chave pública RSA.

Com isso, você consegue:  
- Ver nos logs se o webhook está sendo chamado e por que pode estar falhando.  
- Ter o fallback (sync) funcionando se o endpoint da API estiver correto.  
- Deixar explícito no Admin que o segredo do webhook é a chave pública RSA.

Se após seguir o checklist o problema continuar, envie um trecho dos logs no momento do pagamento (sem dados sensíveis) e a resposta do `sync-woovi` (e do GET da cobrança, se tiver) para analisar o próximo passo.
