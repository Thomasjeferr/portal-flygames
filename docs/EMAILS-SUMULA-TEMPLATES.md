# E-mails de súmula: por que não há templates e o que existe hoje

## Resumo

Os e-mails do **processo de súmula** (disponível para aprovação, aprovada pelo outro time, rejeitada pelo outro time, aprovada por ambos, súmula atualizada) **não usam** a tabela de templates de e-mail (`EmailTemplate`). O conteúdo é montado **direto no código** e enviado pela função `sendEmailToMany`. Por isso esses e-mails **não aparecem** na tela de administração de templates e **não podem** ser editados pelo admin como os demais.

---

## Dois fluxos de e-mail no projeto

### 1. E-mails com template (tabela EmailTemplate)

- **Função:** `sendTransactionalEmail(to, templateKey, vars)`.
- **Fonte do conteúdo:** registro na tabela **EmailTemplate** (subject + htmlBody com variáveis tipo `{{name}}`).
- **Onde são criados:** seed `prisma/seed-emails.ts` (e depois podem ser editados no admin).
- **Templates que existem hoje:**
  - WELCOME  
  - VERIFY_EMAIL  
  - RESET_PASSWORD  
  - PASSWORD_CHANGED  
  - PURCHASE_CONFIRMATION  
  - SPONSOR_CONFIRMATION  
  - LIVE_PURCHASE_CONFIRMATION  
  - PRE_SALE_CREDENTIALS  
  - PRE_SALE_CREDENTIALS_NEW_PASSWORD  

Nenhum deles é de súmula. Por isso, na lista de “Templates de e-mail” do admin **não** aparecem templates de confirmação do processo de súmula.

### 2. E-mails de súmula (HTML no código)

- **Função:** `sendEmailToMany(to[], subject, html)`.
- **Fonte do conteúdo:** **HTML e assunto montados na própria rota** (strings no código).
- **Não** usam tabela de templates; **não** passam por `sendTransactionalEmail`.
- **Onde são enviados:**

| Momento | Arquivo | Assunto / Conteúdo |
|--------|---------|--------------------|
| Admin publica/atualiza súmula | `src/app/api/admin/sumulas/games/[gameId]/route.ts` (PATCH) | “Súmula disponível para aprovação” ou “Súmula atualizada” |
| Time aprova a súmula | `src/app/api/team-portal/teams/[id]/games/[gameId]/approve/route.ts` | “Súmula aprovada pelo outro time” (para o outro time) |
| Ambos aprovaram | Mesmo `approve/route.ts` | “Súmula aprovada por ambos os times” (para os dois times) |
| Time rejeita a súmula | `src/app/api/team-portal/teams/[id]/games/[gameId]/reject/route.ts` | “Súmula rejeitada pelo outro time” (para o outro time) |

Ou seja: **existem** e-mails de confirmação do processo de súmula e eles **são enviados**; o que **não** existe são **templates** desses e-mails no banco. O texto está fixo nas rotas acima.

---

## Por que foi assim?

Provavelmente para:

- Enviar para **vários destinatários** de uma vez (todos os responsáveis do time) com `sendEmailToMany`, sem precisar de um template com variáveis por destinatário.
- Ter o texto e o layout definidos direto na rota, sem depender de criar/gerir mais chaves na tabela de templates.

O efeito colateral é: o conteúdo **não** é editável pelo admin, **não** aparece na lista de templates e qualquer mudança de texto exige alteração de código e novo deploy.

---

## O que temos hoje (resumo)

| Tipo | Usa template (EmailTemplate)? | Editável no admin? | Onde está o conteúdo? |
|------|------------------------------|--------------------|------------------------|
| Compra, patrocínio, verificação, recuperação de senha, pré-estreia, etc. | Sim | Sim (Admin > E-mails > Templates) | Tabela EmailTemplate + seed-emails.ts |
| Súmula: disponível / atualizada / aprovada pelo outro / rejeitada pelo outro / aprovada por ambos | **Não** | **Não** | Código nas rotas (approve, reject, PATCH sumulas) |

Os e-mails de súmula **existem e são enviados**; só não estão centralizados como “templates de confirmação” no sistema de templates.

---

## Se quiser passar a usar templates para súmula

Para ter templates de e-mail de confirmação do processo de súmula (editáveis no admin e aparecendo na lista):

1. **Criar** os registros na tabela **EmailTemplate** (via seed ou migration), por exemplo:
   - SUMULA_DISPONIVEL
   - SUMULA_ATUALIZADA
   - SUMULA_OUTRO_APROVOU
   - SUMULA_OUTRO_REJEITOU
   - SUMULA_APROVADA_AMBOS

2. **Incluir** essas chaves no tipo `EmailTemplateKey` em `src/lib/email/emailService.ts`.

3. **Alterar** as rotas de súmula para, em vez de montar HTML e chamar `sendEmailToMany(subject, html)`, usar o template (ex.: montar `vars` e chamar `sendTransactionalEmail` para cada destinatário, ou criar uma variante que aceite templateKey e envie para vários).

4. **Rodar** o seed (ou script) que insere os novos templates e, se quiser, preencher subject/htmlBody com o mesmo texto que está hoje no código para manter o comportamento atual.

Assim os e-mails de súmula passam a ser “templates de confirmação” iguais aos outros e podem ser ajustados pelo admin.

---

## Implementação feita

- **Chaves criadas** em `EmailTemplateKey` e no seed `prisma/seed-emails.ts`:
  - `SUMULA_DISPONIVEL` – variáveis: `title`, `painel_url`
  - `SUMULA_ATUALIZADA` – variáveis: `title`, `painel_url`
  - `SUMULA_OUTRO_APROVOU` – variáveis: `title`, `approving_team_name`, `painel_url`
  - `SUMULA_OUTRO_REJEITOU` – variáveis: `title`, `rejecting_team_name`, `rejection_reason`, `painel_url`
  - `SUMULA_APROVADA_AMBOS` – variáveis: `title`, `resultados_url`

- **Rotas alteradas** para usar `sendTransactionalEmail` com esses templates:
  - `src/app/api/admin/sumulas/games/[gameId]/route.ts` (PATCH) – SUMULA_DISPONIVEL ou SUMULA_ATUALIZADA
  - `src/app/api/team-portal/teams/[id]/games/[gameId]/approve/route.ts` – SUMULA_OUTRO_APROVOU e SUMULA_APROVADA_AMBOS
  - `src/app/api/team-portal/teams/[id]/games/[gameId]/reject/route.ts` – SUMULA_OUTRO_REJEITOU

**Para ativar os novos templates no banco**, rode o seed de e-mails (local ou em produção):

```bash
npx tsx prisma/seed-emails.ts
```

Ou, se já existir um script no `package.json`: `npm run db:seed-emails`. Depois disso, os cinco templates aparecem em **Admin > E-mails > Templates** e podem ser editados.
