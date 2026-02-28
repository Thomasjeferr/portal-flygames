# Apoio por meta: percentual por time, time do coração e renda recorrente

Objetivo: quando o torcedor apoia um time na meta do campeonato, (1) salvar como **time do coração**, (2) definir um **percentual de repasse por time** (como nos planos) e (3) gerar **renda recorrente** para o time a cada cobrança, integrada ao saque.

---

## 1. Visão geral

Hoje, no apoio por meta (tournament-goal):

- Criamos **TournamentSubscription** (quem apoia qual time em qual torneio).
- Damos **Subscription (plano)** para acesso total ao portal.
- **Não** atualizamos `user.favoriteTeamId`.
- **Não** repassamos % do valor ao time (não existe earning).

A ideia é alinhar ao que já existe nos **planos**:

- Ao apoiar um time na meta → esse time vira o **time do coração** do usuário (`favoriteTeamId`).
- O admin define um **percentual de repasse** (ex.: 15%) **por time no torneio** (ou um valor padrão por torneio).
- A cada cobrança recorrente (Stripe `invoice.paid`), calculamos o valor que vai para o time e criamos um **earning**; esse earning entra no saldo disponível para **saque**, como os ganhos de planos e patrocínio.

---

## 2. Onde guardar o percentual

**Recomendação: por time no torneio (TournamentTeam).**

- Adicionar no modelo **TournamentTeam** o campo **`goalPayoutPercent`** (Int, 0–100, default 0).
- Assim você pode dar 10% para um time e 20% para outro no mesmo campeonato.
- No admin: ao **inscrever** um time no torneio (ou na tela de edição do torneio / lista de times), exibir campo “% repassado ao time (apoio meta)” e salvar em `goalPayoutPercent`.

**Alternativa:** um único percentual no **Tournament** (`goalTeamPayoutPercent`). Todos os times do torneio recebem o mesmo %. Mais simples, menos flexível.

---

## 3. Time do coração

- No **primeiro** pagamento de apoio (quando criamos ou reativamos a TournamentSubscription), atualizar o usuário:

  `User.update({ where: { id: userId }, data: { favoriteTeamId: teamId } })`

- Assim, quem apoia o time na meta já fica com esse time como “time do coração”, igual à escolha no checkout dos planos.
- Pode ser feito dentro de **processTournamentGoalSubscriptionPaid** (ou no webhook logo após), uma vez por usuário/time (ou sempre que quiser reforçar que aquele é o time apoiado).

---

## 4. Geração de renda recorrente (earnings)

- A cada **invoice.paid** do Stripe para assinatura **tournament-goal** (primeira cobrança e renovações):
  - Já temos: `userId`, `tournamentId`, `teamId` (time apoiado), valor cobrado (`amountCents`).
  - Buscar **TournamentTeam** pelo par `(tournamentId, teamId)` e ler **`goalPayoutPercent`**.
  - Se `goalPayoutPercent > 0`:
    - `amountToTeamCents = amountCents * goalPayoutPercent / 100`
    - Criar um registro de **earning** vinculado a essa assinatura de apoio.

- Para não misturar com compras de plano, o ideal é um modelo próprio para earning de apoio meta.

**Novo modelo sugerido: TeamTournamentGoalEarning**

- Campos:  
  `id`, `teamId`, `tournamentSubscriptionId` (opcional, nullable), `amountCents`, `status` (pending | paid), `paidAt`, `paymentReference`, `createdAt`
- Relações:  
  `Team` (teamId), `TournamentSubscription` (tournamentSubscriptionId opcional, onDelete: SetNull para manter ganhos ao excluir campeonato).
- Semelhante a **TeamPlanEarning**, mas referenciando **TournamentSubscription** em vez de **Purchase**.

Com isso:

- O time passa a ter “ganhos de apoio (meta)” além de “ganhos de planos” e “ganhos de patrocínio”.
- Você pode exibir no painel do time e usar no cálculo do **saldo disponível para saque**.

---

## 5. Integração com o saque do time

Hoje o time saca usando:

- **TeamPlanEarning** (itens em **TeamWithdrawalPlanItem**)
- **TeamSponsorshipEarning** (itens em **TeamWithdrawalSponsorshipItem**)

Para incluir os ganhos de apoio meta:

- Criar **TeamWithdrawalGoalItem** (ou nome parecido):  
  `withdrawalId`, `earningId` (referência a **TeamTournamentGoalEarning**), `amountCents`.
- Em **TeamWithdrawal**, adicionar relação com `TeamWithdrawalGoalItem[]`.
- No fluxo de saque:
  - **Saldo disponível** = soma de (TeamPlanEarning pendentes + TeamSponsorshipEarning pendentes + **TeamTournamentGoalEarning pendentes**).
  - Ao montar o saque, o time pode escolher sacar também parte (ou tudo) dos ganhos de meta, criando itens **TeamWithdrawalGoalItem** além dos de plano e patrocínio.

Assim, a renda do apoio meta fica no mesmo fluxo de saque que o time já usa.

---

## 6. Resumo do fluxo (passo a passo)

1. **Admin:** no torneio, ao inscrever ou editar um time, define **goalPayoutPercent** (ex.: 15%) para aquele time naquele torneio.
2. **Torcedor:** clica em “Quero apoiar este time” e assina (Stripe Subscription com metadata tournament-goal).
3. **Webhook invoice.paid (tournament-goal):**
   - Cria/atualiza **TournamentSubscription** e atualiza contagem da meta (já existe).
   - Garante **Subscription (plano)** para acesso ao portal (já existe).
   - **Novo:** atualiza **User.favoriteTeamId = teamId** (time do coração).
   - **Novo:** lê **TournamentTeam.goalPayoutPercent**; se > 0, calcula `amountToTeamCents` e cria **TeamTournamentGoalEarning** (teamId, tournamentSubscriptionId, amountCents, status: pending).
4. **Renovações:** a cada novo `invoice.paid` da mesma assinatura, repetir a criação de **TeamTournamentGoalEarning** (uma linha por cobrança), sem alterar de novo o `favoriteTeamId` se já for esse time.
5. **Painel do time:** listar ganhos de “Apoio (meta)” junto com planos e patrocínio; saldo disponível inclui esses earnings.
6. **Saque:** incluir **TeamTournamentGoalEarning** no saldo e permitir sacar via **TeamWithdrawalGoalItem**.

---

## 7. O que implementar (checklist)

| Item | Onde |
|------|------|
| Campo **goalPayoutPercent** (0–100) | Modelo **TournamentTeam** (migration + Prisma) |
| Admin: campo “% repassado ao time (apoio meta)” | Inscrição/edição de time no torneio (form + API) |
| Atualizar **favoriteTeamId** no primeiro apoio | processTournamentGoalSubscriptionPaid ou webhook |
| Modelo **TeamTournamentGoalEarning** | Schema + migration |
| Criar earning a cada invoice.paid (tournament-goal) | Webhook Stripe (após processTournamentGoalSubscriptionPaid) |
| Modelo **TeamWithdrawalGoalItem** + relação em TeamWithdrawal | Schema + migration |
| Saldo disponível incluindo goal earnings | API/ página de saque do time |
| Montar saque com itens de goal | Fluxo de criação de TeamWithdrawal |

---

## 8. Manter ganhos mesmo ao excluir o campeonato

**Requisito:** os ganhos dos times (TeamTournamentGoalEarning) devem ser preservados mesmo que o admin exclua o campeonato.

**Como garantir:**

1. **TeamTournamentGoalEarning.tournamentSubscriptionId** deve ser **opcional (nullable)** e a FK para **TournamentSubscription** com **onDelete: SetNull** (não Cascade).
2. Ao excluir o **Tournament**, o banco faz CASCADE em **TournamentSubscription** (todas as linhas daquele torneio somem).
3. Como o earning referencia TournamentSubscription com **SetNull**, o banco não apaga o earning; apenas coloca **tournamentSubscriptionId = null**.
4. O registro de earning continua com **teamId**, **amountCents** e **status** — o time segue com saldo disponível e pode sacar normalmente.

**Resumo:** sim, dá para fazer. Basta modelar o earning com referência opcional e SetNull. Ver fluxograma completo em **docs/FLUXOGRAMA-APOIO-META-GANHOS-E-EXCLUSAO.md**.

---

## 9. Observações

- **Cancelamento (customer.subscription.deleted):** não é preciso “devolver” earnings já gerados; apenas deixamos de criar novos. O time fica com o que já foi cobrado até o cancelamento.
- **Excluir campeonato:** ver seção 8; earnings são mantidos com tournamentSubscriptionId = null; o time continua podendo sacar.
- **Valor padrão:** se `goalPayoutPercent` for 0 ou null, não cria earning; o apoio só conta para a meta, sem repasse financeiro ao time.

Se quiser, o próximo passo é implementar em cima desse desenho (schema, webhook, admin e saque).
