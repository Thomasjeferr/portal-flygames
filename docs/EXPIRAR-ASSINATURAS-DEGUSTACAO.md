# Automatizar desativação ao acabar o plano degustação

O sistema já trata assinatura como **inativa na leitura** quando `endDate` passou. Para **atualizar o banco** (`active: false`) automaticamente, use uma das opções abaixo.

---

## Opção 1: Cron no Vercel (recomendado se você usa Vercel)

Foi criada a rota **`/api/cron/expire-subscriptions`**, que:

- Busca todas as `Subscription` com `active: true` e `endDate < agora`
- Atualiza para `active: false`

### Configuração

1. **Variável de ambiente** no Vercel (e no `.env.local` para testes):
   ```bash
   CRON_SECRET=uma-senha-forte-aleatoria
   ```

2. **Criar `vercel.json`** na raiz do projeto:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/expire-subscriptions",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```
   `0 2 * * *` = todo dia às 02:00 (horário do servidor). Ajuste se quiser (ex.: `0 */6 * * *` a cada 6 horas).

3. O Vercel chama a rota no horário agendado. A rota só aceita se o header for `Authorization: Bearer <CRON_SECRET>`. Se você definir `CRON_SECRET` no Vercel, o próprio cron do Vercel pode enviar esse header (consulte a doc do Vercel Cron para a versão atual).

**Nota:** Em alguns planos o Vercel envia um header próprio (ex.: `x-vercel-cron`). Se quiser aceitar só o cron do Vercel, você pode validar esse header em vez de (ou além de) `CRON_SECRET`. Por segurança, manter `CRON_SECRET` é recomendado.

---

## Opção 2: Cron externo (qualquer hospedagem)

Se você **não** usa Vercel ou quer rodar o cron em outro lugar:

1. Defina `CRON_SECRET` no ambiente da aplicação (e guarde o mesmo valor no serviço de cron).

2. Chame a rota **GET** ou **POST** no horário desejado (ex.: 1x por dia):
   ```bash
   curl -X GET "https://seu-dominio.com/api/cron/expire-subscriptions" \
     -H "Authorization: Bearer SEU_CRON_SECRET"
   ```

3. Agende esse comando em:
   - **GitHub Actions** (workflow com `schedule`)
   - **EasyCron / cron-job.org** (agendar requisição HTTP)
   - **Servidor próprio**: `crontab -e` com `curl` ou script que chama a URL

Resposta esperada (exemplo):
```json
{ "ok": true, "expiredCount": 3, "message": "3 assinatura(s) expirada(s) desativada(s)." }
```

---

## Opção 3: Desativação “preguiçosa” (sem cron)

Se você **não** quiser configurar cron, dá para desativar no banco **na primeira vez** que o sistema “enxergar” que a assinatura já expirou:

- Isso já está implementado nas rotas `/api/auth/me` e `/api/account`.

**Prós:** não depende de cron para corrigir o banco. **Contras:** o `active` só é atualizado quando o usuário (ou o front que chama essas rotas) faz uma requisição. O cron continua recomendado para relatórios e para expirar em lote sem depender de acesso do usuário.

A desativação preguiçosa está implementada em `/api/auth/me` e `/api/account`; o cron (Opção 1 ou 2) continua recomendado para expirar em lote.

---

## Resumo

| Abordagem        | Quando usar                          | O que fazer |
|------------------|--------------------------------------|-------------|
| **Vercel Cron**  | Deploy na Vercel                     | `vercel.json` + `CRON_SECRET` + rota já criada |
| **Cron externo** | Outro host ou cron já em outro lugar | Chamar GET/POST `/api/cron/expire-subscriptions` com `Authorization: Bearer CRON_SECRET` |
| **Lazy**         | Já implementada em `/api/auth/me` e `/api/account` | Atualiza `active: false` quando o usuário acessa e a assinatura já expirou |

Recomendação: usar **Opção 1** ou **Opção 2** com a rota `/api/cron/expire-subscriptions` rodando **pelo menos 1x por dia**, para manter o banco alinhado com o fim do plano degustação (7 dias, 30 dias, etc.).
