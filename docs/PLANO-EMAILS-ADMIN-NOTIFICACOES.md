# Plano: E-mails de notificação para administradores

Objetivo: enviar e-mail para os admins quando ocorrem eventos importantes (novo usuário, compras, pedidos de cadastro de time/parceiro), **sem alterar APIs públicas nem banco de dados** além do necessário para configurar os destinatários.

---

## 1. Eventos a notificar

| # | Evento | Quando | Onde está no código hoje |
|---|--------|--------|---------------------------|
| 1 | **Novo usuário criou conta** | Após `User` ser criado em `/api/auth/register` | `src/app/api/auth/register/route.ts` |
| 2 | **Compra: plano patrocinador/torcedor (assinatura)** | Pagamento confirmado (Woovi ou Stripe) | `wooviPurchaseHandler.ts` (Woovi); `webhooks/stripe/route.ts` `invoice.paid` (Stripe) |
| 3 | **Compra: jogo avulso** | Pagamento confirmado (Woovi ou Stripe) | Mesmo que acima (Purchase com `plan.type === 'unitario'`) |
| 4 | **Compra: patrocínio empresa** | Primeiro pagamento do pedido de patrocínio (Stripe) | `webhooks/stripe/route.ts` – bloco `metadata.type === 'sponsor'` em `invoice.paid` |
| 5 | **Compra: pré-estreia (clube)** | Slot de pré-estreia marcado como pago (Woovi ou Stripe) | Woovi: `webhooks/woovi/route.ts` (correlationId `presale-{slotId}`) → `markSlotAsPaid`. Stripe: verificar se existe fluxo de pré-estreia com Stripe. |
| 6 | **Pedido de cadastro de time (solicitação)** | Criação de `TeamRequest` | `src/app/api/public/team-request/route.ts` |
| 7 | **Pedido de cadastro de time (painel)** | Criação de `Team` pendente em `/api/team-portal/teams` | `src/app/api/team-portal/teams/route.ts` |
| 8 | **Pedido de cadastro de parceiro** | Criação de `Partner` com status pendente | `src/app/api/public/partners/apply/route.ts` |

**Sugestão:** implementar todos os 8. Para pré-estreia via Stripe, só incluir notificação se já existir webhook Stripe que chame algo equivalente a `markSlotAsPaid`; caso contrário, apenas Woovi.

---

## 2. Destinatários dos e-mails (configuração)

**Opções:**

- **A)** Variável de ambiente `ADMIN_NOTIFY_EMAIL` (ou `ADMIN_NOTIFY_EMAILS` com vários e-mails separados por vírgula).  
  Prós: simples, sem migration. Contras: alterar destinatário exige deploy/env.

- **B)** Campo no banco: por exemplo em `EmailSettings` um campo `adminNotifyEmails` (texto, e-mails separados por vírgula), editável em **Admin > E-mails > Configurações**.  
  Prós: admin altera pelo painel. Contras: exige migration e ajuste na tela de configurações de e-mail.

- **C)** Reutilizar `SiteSettings.adminCredentialsEmail` como único destinatário das notificações.  
  Prós: zero migration. Contras: mistura “quem recebe credenciais de pré-estreia” com “quem recebe notificações operacionais”; pode não ser o mesmo e-mail.

**Recomendação:** **B** – novo campo `adminNotifyEmails` em `EmailSettings` (nullable string). Se vazio, fallback para `SiteSettings.adminCredentialsEmail`; se ainda vazio, fallback para `process.env.ADMIN_NOTIFY_EMAIL`. Assim: configurável no painel, com fallbacks para não quebrar quem já usa env ou só `adminCredentialsEmail`.

---

## 3. Conteúdo do e-mail (sugestão)

- **Assunto:** prefixo fixo para filtrar na caixa de entrada, ex: `[FlyGames Admin] ...`
- **Corpo:** texto simples e claro, com:
  - Nome do evento (ex: “Novo usuário”, “Nova compra – Assinatura”, “Pedido de cadastro de time”).
  - Dados mínimos úteis (ex: e-mail do usuário, nome do plano, valor, link para o painel).
  - Link direto para a área relevante do admin (ex: usuários, pedidos de patrocínio, solicitações de time, parceiros).

Não é obrigatório usar os templates transacionais existentes (tabela `EmailTemplate`): pode ser um e-mail “simples” enviado com `sendEmailToMany` (como já feito em `partners/apply`), com HTML mínimo e variáveis montadas no código. Assim não criamos muitos templates novos nem alteramos fluxo de templates.

---

## 4. Onde enviar (resumo técnico)

| Evento | Arquivo / função | Momento |
|--------|------------------|--------|
| Novo usuário | `api/auth/register/route.ts` | Após `prisma.user.create`, antes de enviar VERIFY_EMAIL ao usuário |
| Compra (plano/jogo avulso) Woovi | `lib/payments/wooviPurchaseHandler.ts` | Após enviar PURCHASE_CONFIRMATION ao usuário |
| Compra (plano/jogo avulso) Stripe | `api/webhooks/stripe/route.ts` (invoice.paid e payment_intent.succeeded) | Após criar/atualizar Purchase e enviar e-mail ao usuário |
| Patrocínio empresa | `api/webhooks/stripe/route.ts` (invoice.paid sponsor) | Após criar Sponsor e enviar SPONSOR_CONFIRMATION |
| Pré-estreia paga (Woovi) | `api/webhooks/woovi/route.ts` | Após `markSlotAsPaid` (e opcionalmente após criar conta clube) |
| TeamRequest | `api/public/team-request/route.ts` | Após `prisma.teamRequest.create` |
| Team (portal) | `api/team-portal/teams/route.ts` | Após `prisma.team.create` (time pendente) |
| Parceiro | `api/public/partners/apply/route.ts` | Após `prisma.partner.create` (já envia e-mail ao usuário; adicionar envio ao admin) |

---

## 5. Função auxiliar sugerida

Criar um módulo único, por exemplo `src/lib/email/adminNotify.ts`, que:

1. **Resolve destinatários:** lê `EmailSettings.adminNotifyEmails` → `SiteSettings.adminCredentialsEmail` → `process.env.ADMIN_NOTIFY_EMAIL`; normaliza para array de endereços (split por vírgula, trim, filtrar vazios).
2. **Se a lista for vazia:** não envia nada (return).
3. **Envia:** chama `sendEmailToMany(to, subject, html)` (já existente em `emailService.ts`).
4. **Assinatura sugerida:**  
   `sendAdminNotification(event: string, subjectSuffix: string, htmlBody: string): Promise<void>`  
   Ou, por evento:  
   `sendAdminNewUserNotification(user: { email, name })`,  
   `sendAdminPurchaseNotification(...)`,  
   etc., cada uma montando assunto + HTML e chamando a função genérica que resolve `to` e chama `sendEmailToMany`.

Não é necessário registrar esses envios em `EmailLog` como “templateKey” (podem ser logados como templateKey genérico, ex. `ADMIN_NOTIFY`, ou não logados, conforme preferência).

---

## 6. Checklist antes de implementar

- [ ] Confirmar lista de eventos (todos os 8 ou subset).
- [ ] Definir se usa **A**, **B** ou **C** para destinatários (recomendado **B** com fallbacks).
- [ ] Se **B**: definir nome do campo (`adminNotifyEmails`?) e migration; adicionar campo na tela Admin > E-mails > Configurações (leitura/edição).
- [ ] Definir texto padrão de assunto (ex: `[FlyGames Admin]`) e nível de detalhe do corpo (links sim/não, quais dados incluir).
- [ ] Para pré-estreia: confirmar se existe fluxo Stripe que marca slot como pago; se não, notificar só no Woovi.
- [ ] Garantir que falha no envio do e-mail ao admin **não** falhe o fluxo principal (registro, compra, pedido). Usar `.catch(() => {})` ou try/catch e apenas log.

---

## 7. Sugestões adicionais (opcional)

- **Inscrição paga em torneio (Copa):** quando `markTournamentRegistrationAsPaidById` for chamado (Woovi), pode ser útil notificar o admin (“Time X pagou inscrição no torneio Y”). Mesmo padrão: chamar `sendAdminNotification` após o fluxo principal.
- **Resumo diário:** não faz parte deste escopo; pode ser fase 2 (job que envia um e-mail por dia com totais de cadastros/compras).
- **Rate limit:** em geral não é necessário limitar envio para o admin; são poucos eventos por dia. Se no futuro houver muitos, pode-se agrupar notificações (ex: um e-mail a cada 1h com lista de “novos usuários na última hora”).

---

## 8. Resumo para você avaliar e dar OK

1. **Eventos:** Novo usuário; compra (assinatura, jogo avulso, patrocínio empresa, pré-estreia clube); pedido de cadastro de time (TeamRequest + Team portal); pedido de cadastro de parceiro. Incluir também notificação quando um time paga inscrição em torneio (Woovi)? Sim/Não.
2. **Destinatários:** Novo campo `adminNotifyEmails` em configurações de e-mail (Admin), com fallback para `adminCredentialsEmail` e depois `ADMIN_NOTIFY_EMAIL`. Concorda?
3. **Conteúdo:** E-mail simples (assunto tipo `[FlyGames Admin] Novo usuário: email@...`), corpo com tipo de evento + dados mínimos + link para o painel. Sem novos templates no banco, usando `sendEmailToMany`. OK?
4. **Falha no envio:** Não bloquear registro/compra/pedido; apenas logar erro. OK?

Assim que você aprovar (e opcionalmente ajustar algum ponto), dá para implementar na ordem: configuração (migration + tela) → `adminNotify.ts` → chamadas em cada um dos fluxos listados acima.
