# Plano de Reaproveitamento – MVP Copa Mata-Mata (FlyGames)

Documento de auditoria do projeto e plano para implementar o módulo **Copa Mata-Mata** com inscrição FREE / PAID / GOAL, sem quebrar funcionalidades existentes.

---

## 1. Stack e infraestrutura atual

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript |
| **Backend** | Next.js API Routes (mesmo repositório) |
| **Banco de dados** | PostgreSQL via Prisma ORM |
| **Autenticação** | Sessão por cookie (`portal_session`), tabela `Session`, `getSession()` em `src/lib/auth.ts` |
| **Pagamento** | Stripe (cartão, assinaturas recorrentes), Woovi (PIX). Config em `PaymentConfig` |
| **E-mail** | Resend (templates em `EmailTemplate`, `sendTransactionalEmail`) |
| **Hospedagem** | Implícito Vercel (uso de `@vercel/blob`) – não há Supabase |

Não existe entidade “campeonato” ou “torneio” hoje; existe apenas o texto livre `Game.championship` e a organização por `Category`.

### 1.1 Conflito com “championships nas categorias”?

**Resposta: não há conflito hoje.**

- **Não existe tabela `tournaments`** no banco hoje. O que existe é:
  - **`Game.championship`** – coluna **String** (texto livre) em `Game`; o admin digita o nome do campeonato em cada jogo (ex.: "Copa XYZ", "Campeonato Municipal").
  - **`Category`** – modelo para agrupamento na home (“Jogos por campeonato” usa na prática as **categorias**, não o texto championship).
  - Na página **/jogos**, o filtro “Todos os campeonatos” é apenas uma lista de **valores distintos** de `Game.championship` (strings), não uma tabela própria.

- Criar a tabela **`tournaments`** para a Copa Mata-Mata **não conflita** com nada existente: é uma tabela nova, e `Game.championship` continua sendo uma string (não vira FK para essa tabela no MVP).

- **Conflito possível no futuro:** o documento `CAMPEONATOS-ANALISE-E-POSSIBILIDADE.md` sugere criar uma entidade **Championship** para o **conteúdo** (dropdown em Jogos, `Game.championshipId` opcional, nome/logo/ano). Seria “campeonato para uso livre” nas categorias/grade. Se isso for implementado depois, existiriam dois conceitos com nome parecido:
  - **Championship (conteúdo)** = rótulo de competição para jogos (dropdown, exibição em cards/súmula).
  - **Championship (Copa)** → **Tournament** = torneio mata-mata com inscrições FREE/PAID/GOAL, chaveamento, partidas.

**Recomendação de nomenclatura (evitar confusão):**

| Opção | Uso na Copa | Tabelas | Deixa livre para conteúdo |
|-------|-------------|---------|----------------------------|
| **A** | Manter “championship” na Copa | `championships`, `championship_teams`, `championship_subscriptions`, `matches` | Quando implementarem o campeonato de conteúdo, usar outro nome (ex.: **Competition** / `competitions` ou **ContentChampionship** / `content_championships`). |
| **B** ✓ **ADOTADA** | Nome distinto para a Copa | **Tournament**: `tournaments`, `tournament_teams`, `tournament_subscriptions`, **TournamentMatch**: `tournament_matches` | Sim. O nome **Championship** fica livre para a entidade de conteúdo (dropdown em Jogos) descrita no doc de análise. |

**Nomenclatura adotada: Opção B.** O restante deste documento usa **Tournament** (tabelas `tournaments`, `tournament_teams`, `tournament_subscriptions`, `tournament_matches`). O nome Championship fica reservado para a futura entidade de “campeonato/categoria para uso livre” em Jogos.

---

## 2. Banco de dados – o que já existe

### 2.1 Modelos relevantes

| Modelo | Uso atual | Reaproveitamento para Copa |
|--------|-----------|----------------------------|
| **User** | Login, perfil, favoriteTeamId, role (user \| admin \| club_viewer) | ✅ Reutilizar; torcedor apoia time e assina plano da copa |
| **Team** | Times do portal (crestUrl, name, slug, responsibleEmail, etc.) | ✅ Reutilizar; times inscritos na copa são os mesmos `Team` |
| **Plan** | Planos de assinatura (unitario \| recorrente, price, teamPayoutPercent, acessoTotal) | ⚠️ Estender ou criar planos específicos para “ativação copa”; hoje não há tipo ligado a campeonato |
| **Subscription** | 1 por usuário (userId **unique**), planId, active, startDate, endDate, Stripe | ⚠️ Estender: hoje é só “assinatura portal”. Para GOAL da copa usar tabela **TournamentSubscription** (ativação por torneio), sem alterar Subscription. |
| **Purchase** | Compra de plano/jogo (userId, planId, gameId?, teamId?, paymentStatus) | ✅ Reutilizar para pagamento avulso; para GOAL usaremos assinatura (Subscription) |
| **Game** | Jogo de **conteúdo** (vídeo, slug, homeTeamId, awayTeamId, homeScore, awayScore, championship string, súmula) | ⚠️ **Não** reaproveitar para partidas do bracket: `Game` é para exibição de jogos com mídia/súmula. Criar modelo **TournamentMatch** para jogos da chave |
| **Category** | Agrupamento na home e grade (name, slug) | ❌ Não confundir com “campeonato”; Copa terá entidade própria |
| **PaymentConfig** | Woovi + Stripe keys | ✅ Reutilizar para cobrança PAID e assinatura GOAL |
| **EmailTemplate** | Templates transacionais (WELCOME, PURCHASE_CONFIRMATION, etc.) | ✅ Reutilizar; adicionar templates para confirmação de inscrição / meta copa se necessário |
| **Partner** | Parceiros/afiliados (refCode, comissão) | ✅ Opcional: manter compatível com futura venda de ingressos/planos copa |

### 2.2 O que **não** existe hoje

- Tabela **tournaments** (torneio com formato, max_teams, registration_mode, goal_*, status, bracket_status).
- Tabela **tournament_teams** (inscrição do time no torneio: team_status, goal_status, goal_current_supporters, etc.).
- Tabela **tournament_matches** para jogos do bracket (round, match_number, team_a_id, team_b_id, winner_team_id, next_match_id, etc.). O `Game` atual é para **conteúdo** (vídeo, slug público, súmula), não para “jogo da chave”.
- **Subscription** não tem `type` (PORTAL vs TOURNAMENT_ACTIVATION); é 1:1 com User (userId unique).
- Nenhuma tabela **tournament_subscriptions** (vínculo assinatura → torneio → time apoiado para contar meta).

Conclusão: campeonato, inscrições, partidas da chave e assinaturas “de ativação” precisam ser **criados** ou **estendidos** conforme abaixo.

---

## 3. Autenticação e acesso

- **Auth:** `getSession()` retorna `userId`, `email`, `name`, `role`. Proteção de rotas admin por `session?.role === 'admin'`.
- **Acesso a conteúdo:** `hasFullAccess(userId)` (assinatura ativa com acesso total), `canAccessGame()`, `canAccessApprovedResults()` (assinatura ou patrocínio pago).
- **Painel do time:** `getTeamAccess(teamId)` (cookie de painel ou e-mail responsável).

Reaproveitamento: toda a camada de auth e de acesso permanece. Para “acesso total ao conteúdo da copa” quando o usuário assina o plano de ativação (GOAL), pode-se:
- considerar “acesso total” apenas assinatura **PORTAL** com acesso total, **ou**
- estender `hasFullAccess()` para retornar true também se existir assinatura ativa do tipo TOURNAMENT_ACTIVATION para algum torneio publicado (conforme regra de negócio desejada).

---

## 4. Pagamento

- **Checkout plano:** `POST /api/checkout` (planId, gameId?, teamId?, method: pix \| card). Cria Purchase e, se recorrente, Stripe Subscription; webhook `invoice.paid` atualiza Subscription e cria Purchase de renovação.
- **Stripe:** `createStripeSubscription()` (metadata userId, planId), `createStripePaymentIntent()` (metadata purchaseId ou sponsorOrderId).
- **Woovi:** PIX para compra avulsa (Purchase).

Para a Copa:
- **FREE:** sem cobrança; apenas inscrição (tournament_teams com registration_type FREE).
- **PAID:** cobrança única por inscrição (novo fluxo: checkout de “inscrição no torneio” gerando Purchase ou nova entidade tipo TournamentPayment; valor em `tournament.registration_fee_amount`).
- **GOAL:** assinatura recorrente (mensal) vinculada ao torneio e ao time apoiado. Exige:
  - Plano (ou “produto”) específico do torneio com preço `goal_price_per_supporter`.
  - Tabela **tournament_subscriptions** (userId, tournamentId, teamSupportedId, stripeSubscriptionId, startedAt, endedAt, status) ligada à assinatura Stripe.
  - Contagem para meta: apenas assinaturas ativas em tournament_subscriptions, criadas no período goal_start_at .. goal_end_at, para aquele time. Assinantes já existentes do portal **não** contam.

Reaproveitamento: Stripe/Woovi e fluxo de checkout podem ser reutilizados; gravar o vínculo “esta assinatura é de ativação do torneio X para o time Y” em **tournament_subscriptions** (ver seção 7).

---

## 5. Pré-estreia Meta (analogia com GOAL)

O projeto já tem **Pré-estreia Meta** (`PreSaleGame` com `metaEnabled`, `baselineHomeSubs`, `metaHomeTotal`, `metaAwayTotal`): meta de **novos** assinantes por time para liberar um jogo. A contagem usa `User.favoriteTeamId` e assinaturas ativas.

Diferenças em relação ao GOAL da Copa:
- Pré-estreia: 2 times fixos, 1 jogo; meta por time; assinatura é a **do portal** (mesmo Plan).
- Copa GOAL: N times, meta por time no torneio; assinatura deve ser **específica** (registro em tournament_subscriptions) e só essa conta para a meta; período da meta (goal_start_at, goal_end_at) e lock_confirmation_on_goal.

Reaproveitamento: **conceito** de “contar apoiadores” e “atingiu meta” pode inspirar a lógica; **código** de contagem não é reutilizável direto porque a fonte dos dados será outra (tournament_subscriptions).

---

## 6. O que pode ser reutilizado

| Área | O que reutilizar |
|------|-------------------|
| **Times** | Model `Team` e todas as telas/APIs de listagem (admin, público). Inscrição na copa = criar registro em `tournament_teams` com `team_id` existente. |
| **Usuários e auth** | `User`, `Session`, `getSession()`, login, cadastro. Torcedor que “apoia time” na copa é o mesmo usuário. |
| **Admin** | Layout, sidebar (`AdminSidebar`), proteção por role. Adicionar item “Copa Mata-Mata” (ou “Campeonatos”) e subpáginas. |
| **Pagamento** | Stripe (PaymentIntent e Subscription), Woovi, `PaymentConfig`. Checkout e webhooks existentes como base; novos endpoints para “inscrição paga” e “assinatura ativação copa”. |
| **E-mail** | Resend, `EmailTemplate`, `sendTransactionalEmail`. Novos templates apenas se necessário (ex.: confirmação inscrição, meta atingida). |
| **Acesso** | `hasFullAccess()`, `canAccessGame()`, etc. Estender somente se a regra for “quem tem assinatura ativação copa também tem acesso total ao conteúdo da copa”. |
| **UI** | Componentes existentes (cards, tabelas, formulários), padrão de cores/estilo (netflix/futvar). Página pública da copa pode seguir o mesmo padrão. |

---

## 7. O que precisa ser estendido

| Área | Extensão necessária |
|------|----------------------|
| **Subscription** | Suportar assinaturas “de ativação da copa” sem quebrar a atual (1 por usuário, portal). **Recomendação:** não alterar Subscription; criar tabela **TournamentSubscription** (userId, tournamentId, teamSupportedId, stripeSubscriptionId, startedAt, endedAt, status). Assim `hasFullAccess()` e renovação portal continuam iguais. |
| **Plan** | Opcional: plano “Ativação Copa X” com preço = goal_price_per_supporter e vínculo implícito ao torneio; ou preço apenas em Tournament e criação de Stripe product/price por torneio. |
| **Checkout / Webhook** | Novo fluxo “Assinar para apoiar time na copa” (escolhe torneio, time, cria Stripe Subscription com metadata tournamentId + teamId). Webhook `invoice.paid` com metadata de copa: criar/atualizar **TournamentSubscription** e atualizar `goal_current_supporters` do `tournament_teams` correspondente. |

---

## 8. O que precisa ser criado do zero

| Item | Descrição |
|------|-----------|
| **Tabela `tournaments`** | name, season, region, format=SINGLE_ELIMINATION, max_teams (até 32), registration_mode (FREE \| PAID \| GOAL), registration_fee_amount (nullable), goal_required_supporters, goal_price_per_supporter, goal_start_at, goal_end_at, lock_confirmation_on_goal, status (DRAFT \| PUBLISHED \| IN_PROGRESS \| FINISHED), bracket_status (NONE \| GENERATED), timestamps. |
| **Tabela `tournament_teams`** | tournament_id, team_id, registration_type (FREE \| PAID \| GOAL), team_status (APPLIED \| IN_GOAL \| CONFIRMED \| REJECTED \| ELIMINATED), payment_status (nullable), goal_status (PENDING \| ACHIEVED \| EXPIRED), goal_current_supporters (cache), goal_achieved_at (nullable). Unique (tournament_id, team_id). |
| **Tabela `tournament_matches`** | tournament_id, round (32 \| 16 \| 8 \| 4 \| 2), match_number, team_a_id, team_b_id, scheduled_at, location, status (SCHEDULED \| LIVE \| FINISHED), score_a, score_b, penalties_a, penalties_b, winner_team_id, next_match_id, live_url, replay_url. Não reaproveitar `Game` para não misturar “jogo de conteúdo” com “jogo da chave”. |
| **Tabela `tournament_subscriptions`** | user_id, tournament_id, team_supported_id, stripe_subscription_id, started_at, ended_at, status. Permite contar “apoiadores” da meta e dar acesso ao conteúdo da copa. |
| **APIs Admin** | CRUD torneios, listar/aprovar/rejeitar inscrições, progresso da meta, gerar chaveamento, CRUD partidas (tournament_matches), inserir resultado e avanço automático (winner → next_match). |
| **APIs Públicas** | Listar torneio publicado, ranking de ativação (times IN_GOAL com X/meta), times confirmados, chaveamento (quando GENERATED). |
| **Checkout “Apoiar time” (GOAL)** | Página ou fluxo: escolher torneio (com registration_mode GOAL), escolher time (IN_GOAL), criar Stripe Subscription com metadata tournamentId + teamId + userId; webhook cria TournamentSubscription e incrementa goal_current_supporters; quando atingir meta, team_status → CONFIRMED e goal_status → ACHIEVED. |
| **Página pública da copa** | Uma página (ex.: `/copa/[slug]` ou `/torneios/[slug]`) com os 3 blocos: Ranking de Ativação (IN_GOAL), Times Confirmados (CONFIRMED), Chaveamento (quando bracket_status = GENERATED). |
| **Lógica de negócio** | Regras: chaveamento só se confirmed_teams >= max_teams; ao finalizar partida, calcular winner e preencher next_match; lock_confirmation_on_goal (não rebaixar CONFIRMED mesmo que cancelamentos); apenas assinaturas em tournament_subscriptions criadas no período da meta e ativas contam; assinantes já existentes do portal não contam. |

---

## 9. Riscos técnicos

| Risco | Mitigação |
|-------|------------|
| **Alterar Subscription (userId unique)** | Evitar: criar tabela **TournamentSubscription** separada para ativação da copa, sem mexer em Subscription. Assim `hasFullAccess()` e renovação portal continuam iguais. |
| **Reutilizar Game para partidas do bracket** | Não reutilizar: Game tem slug, videoUrl, súmula, categoryId; é conteúdo. Criar **TournamentMatch** só para bracket (round, next_match_id, winner). Evita mistura e queries pesadas. |
| **Contagem de meta em tempo real** | Manter cache `goal_current_supporters` em tournament_teams; atualizar no webhook (nova assinatura em tournament_subscriptions) e em job ou ao cancelar (decrementar). Consistência: transações ao atualizar contador e ao passar para CONFIRMED. |
| **Dois “tipos” de assinatura (portal vs copa)** | Deixar claro no código e na documentação: Subscription = portal; TournamentSubscription = copa. Planos “ativação copa” podem ser Plans normais com flag ou nome convenção, ou preço só no Tournament. |
| **Conflito com Pré-estreia Meta** | Pré-estreia usa favoriteTeamId + Subscription ativa do portal. Copa GOAL usa TournamentSubscription. Não compartilhar contagem. |
| **Permissões e responsável do time** | Inscrição na copa pode ser feita pelo admin ou pelo responsável do time (TeamManager / responsibleEmail). Definir quem pode “aplicar” (APPLIED) e quem aprova (admin). |

---

## 10. Sugestão de estrutura final (resumo)

- **tournaments** – Configuração da copa (max_teams, registration_mode, goal_*, status, bracket_status).
- **tournament_teams** – Inscrição do time (team_status, goal_status, goal_current_supporters, goal_achieved_at).
- **tournament_matches** – Partidas do bracket (round, team_a_id, team_b_id, winner_team_id, next_match_id, score, status).
- **tournament_subscriptions** – Assinaturas “ativação” (user_id, tournament_id, team_supported_id, período, status) para contagem da meta e acesso ao conteúdo da copa.
- **Subscription** – Sem alteração de constraint; continua 1 por usuário para o portal.
- **Plan** – Pode ganhar tipo ou relação opcional com tournament para planos “ativação copa”; ou preço só em Tournament e criação de produto Stripe por torneio.
- **Game** – Mantido para jogos de conteúdo (vídeo, súmula). Opcional: link de um **TournamentMatch** a um **Game** (ex.: “transmissão desta partida”) se no futuro uma partida da chave tiver vídeo no mesmo sistema.

Fluxos:
- **FREE:** admin ou time aplica → tournament_teams (APPLIED) → admin aprova → CONFIRMED.
- **PAID:** time aplica → checkout inscrição → pagamento → tournament_teams (CONFIRMED ou APPLIED até confirmar pagamento).
- **GOAL:** time aplica → IN_GOAL; torcedor assina “ativação copa” escolhendo time → tournament_subscriptions + incremento goal_current_supporters; ao atingir meta → CONFIRMED, goal_status ACHIEVED; lock_confirmation_on_goal impede voltar atrás.

Admin: criar/editar torneio, listar inscrições, aprovar/rejeitar, ver progresso meta, gerar chaveamento, gerenciar partidas, inserir resultado com avanço automático.

Frontend: uma página da copa com ranking de ativação, times confirmados e chaveamento.

---

## 11. Próximos passos (implementação incremental)

1. **Etapa 1 – Modelos e migrations**  
   Criar tabelas `tournaments`, `tournament_teams`, `tournament_matches`, `tournament_subscriptions` no Prisma; rodar migration. Sem alterar Subscription/Plan ainda.

2. **Etapa 2 – Admin básico**  
   CRUD torneios (criar, editar, max_teams, registration_mode, goal_* quando GOAL). Listar inscrições (tournament_teams), aprovar/rejeitar (FREE/PAID). Sem meta nem pagamento ainda.

3. **Etapa 3 – Inscrição PAID**  
   Fluxo de pagamento para inscrição paga (checkout ou endpoint) e atualização de payment_status / team_status em tournament_teams.

4. **Etapa 4 – Meta GOAL e assinatura**  
   Tabela tournament_subscriptions; checkout “Apoiar time” (Stripe Subscription com metadata); webhook atualiza contagem e CONFIRMED quando meta atingida; regra “só novos assinantes no período” e lock_confirmation_on_goal.

5. **Etapa 5 – Página pública**  
   Ranking de ativação (IN_GOAL), times confirmados (CONFIRMED), botão “Apoiar este time” (GOAL).

6. **Etapa 6 – Chaveamento**  
   Gerar tournament_matches (round 32, 16, 8, 4, 2) a partir dos confirmados; sorteio ou ordem fixa; bracket_status = GENERATED.

7. **Etapa 7 – Partidas e avanço**  
   Admin: inserir resultado (score, penalties); calcular winner; preencher team_a_id/team_b_id do next_match; avanço automático até a final.

Cada etapa deve ser documentada (o que foi feito e onde) e não quebrar funcionalidades existentes.

---

## 12. Implementação – Etapas concluídas

### Etapa 1 – Modelos e migrations ✅
- **Prisma:** Novos modelos `Tournament`, `TournamentTeam`, `TournamentMatch`, `TournamentSubscription` em `prisma/schema.prisma` (seção COPA MATA-MATA).
- **Migration:** `20260227174742_add_tournaments_copa_mata_mata` – tabelas `tournaments`, `tournament_teams`, `tournament_matches`, `tournament_subscriptions`.
- **Relações:** User.tournamentSubscriptions; Team.tournamentTeams, tournamentMatchesAsA/B/Won, tournamentSubscriptionsAsSupported.
- Nenhuma alteração em Subscription ou Plan.

### Etapa 2 – Admin básico ✅
- **Sidebar:** Item "Copa Mata-Mata" → `/admin/torneios` em `src/components/admin/AdminSidebar.tsx`.
- **APIs:**
  - `GET/POST /api/admin/tournaments` – listagem paginada (filtro por status) e criação.
  - `GET/PATCH/DELETE /api/admin/tournaments/[id]` – detalhe, atualização e exclusão.
  - `GET/POST /api/admin/tournaments/[id]/teams` – listar inscrições e inscrever time (admin).
  - `PATCH /api/admin/tournaments/[id]/teams/[teamId]` – aprovar (CONFIRMED) ou rejeitar (REJECTED).
- **Páginas admin:**
  - `/admin/torneios` – lista de torneios, filtro por status, links para inscrições e editar.
  - `/admin/torneios/novo` – formulário de criação (nome, slug, max_teams, registration_mode, goal_* quando GOAL, status).
  - `/admin/torneios/[id]/editar` – formulário de edição.
  - `/admin/torneios/[id]` – detalhe do torneio, lista de times inscritos, botões Aprovar/Rejeitar, formulário para inscrever novo time.

### Etapa 3 – Inscrição PAID ✅
- **Schema:** Em `tournament_teams` foram adicionados `payment_gateway` e `payment_external_id` (migration `tournament_teams_payment_gateway`). Coluna opcional `registration_stripe_subscription_id` mantida (usada apenas para outros fluxos; no PAID com cartão usamos pagamento único, então fica `null`).
- **API de checkout:** `POST /api/tournament-registration/checkout` (body: `tournamentId`, `teamId`, `method: 'pix' | 'card'`). Apenas para torneios com `registration_mode = PAID`; admin pode pagar por qualquer time, responsável pelo time apenas pelo próprio time (`isTeamManager` em `src/lib/access.ts`). **PIX:** gera cobrança Woovi (`externalId` = id do `TournamentTeam`), retorna `qrCode`, `qrCodeImage`, `expiresAt`, `tournamentTeamId`. **Cartão:** cria Stripe **PaymentIntent** (pagamento único), grava `payment_external_id = paymentIntentId`, retorna `clientSecret`.
- **APIs de status e sync:** `GET /api/tournament-registration/[tournamentTeamId]/status` e `POST /api/tournament-registration/[tournamentTeamId]/sync-woovi` para consultar e sincronizar pagamento PIX.
- **Webhooks:** **Stripe:** em `payment_intent.succeeded`, se `metadata.tournamentId` e `metadata.teamId` existirem (e não for evento de invoice), chama `markTournamentRegistrationAsPaid(tournamentId, teamId)` sem subscriptionId. Inscrição PAID **não** é tratada em `invoice.paid`. **Woovi:** se `correlationID` for o `id` de um `TournamentTeam` com `payment_gateway = 'woovi'` e `payment_status = 'pending'`, chama `markTournamentRegistrationAsPaidById`.
- **Handler:** `src/lib/tournamentRegistrationPayment.ts` com `markTournamentRegistrationAsPaid(tournamentId, teamId, stripeSubscriptionId?)` e `markTournamentRegistrationAsPaidById`. No fluxo cartão (PaymentIntent) chama-se sem o 3º argumento.
- **Admin:** Na página de detalhe do torneio, para inscrição PAID com status APPLIED e pagamento não pago, botão **"Pagar inscrição"** abre modal com duas opções: **PIX** (exibe QR, poll em status + sync-woovi até confirmar) e **Cartão** (redireciona para `/admin/torneios/[id]/pagar-inscricao?teamId=xxx`, que chama o checkout e exibe o formulário Stripe com PaymentIntent e `return_url` para a página do torneio).

### Etapa 4 – Meta GOAL e assinatura ✅
- **Tabela tournament_subscriptions:** já existia (Etapa 1). Uma assinatura por (userId, tournamentId, teamSupportedId); contagem só de assinaturas ACTIVE com startedAt no período goal_start_at .. goal_end_at.
- **API checkout GOAL:** `POST /api/tournament-goal/checkout` (body: `tournamentId`, `teamId`). Apenas para torneios com `registration_mode = GOAL` e time IN_GOAL/APPLIED com `registrationType = GOAL`. Cria Stripe Subscription com `planId: 'tournament-goal'`, valor = `goal_price_per_supporter`, periodicity mensal, metadata: tournamentId, teamId, userId (incluído pelo createStripeSubscription).
- **Webhook Stripe:** Em `invoice.paid`, se metadata tem `tournamentId` e `teamId`: se `planId === 'tournament-goal'` → `processTournamentGoalSubscriptionPaid` (cria/atualiza TournamentSubscription, recalcula `goal_current_supporters`, e se ≥ meta → team_status CONFIRMED, goal_status ACHIEVED). (Inscrição PAID é pagamento único, confirmada em `payment_intent.succeeded`, não em invoice.paid.) Em `customer.subscription.deleted`, se planId tournament-goal: marca TournamentSubscription como CANCELED e recalcula contagem (respeitando `lock_confirmation_on_goal`).
- **Lib:** `src/lib/tournamentGoalPayment.ts` com `processTournamentGoalSubscriptionPaid` e `recalculateGoalSupportersAndConfirm` (conta ACTIVE no período, atualiza goal_current_supporters e opcionalmente CONFIRMED/ACHIEVED).
- **Admin:** Na página de detalhe do torneio, para modo GOAL e times IN_GOAL/APPLIED com registrationType GOAL, link **"Apoiar time"** para `/admin/torneios/[id]/apoiar-time?teamId=xxx`. Página `apoiar-time` chama o checkout GOAL e exibe formulário Stripe (assinatura recorrente); após pagamento, webhook atualiza contagem e pode confirmar o time ao atingir meta.

### Etapa 5 – Página pública ✅
- **Listagem:** `/torneios` lista torneios com `status = PUBLISHED`; link "Copa" no Header (desktop e mobile) para `/torneios`.
- **Página do torneio:** `/torneios/[slug]` (Server Component) exibe nome, temporada, total de times e dois blocos: (1) **Ranking de ativação** – times IN_GOAL/APPLIED com tipo GOAL, ordenados por `goal_current_supporters` desc, com texto "X / meta apoiadores" e botão **"Apoiar este time"** que leva a `/torneios/[slug]/apoiar?teamId=xxx`; (2) **Times confirmados** – grid com times CONFIRMED (escudo e nome). Só mostra bloco de ranking quando `registration_mode = GOAL`.
- **Página Apoiar (pública):** `/torneios/[slug]/apoiar` (Client Component) com `teamId` em query. Verifica sessão (`/api/auth/me`); se não logado, exibe mensagem e link para `/entrar?redirect=...`. Se logado, busca torneio por slug via `GET /api/public/tournaments/[slug]`, chama `POST /api/tournament-goal/checkout` e exibe formulário Stripe (mesmo fluxo do admin); `return_url` = `/torneios/[slug]`.
- **API pública:** `GET /api/public/tournaments/[slug]` retorna torneio publicado (id, name, slug, season, maxTeams, registrationMode, goal_*, teams com team e status) para a página pública e para a página apoiar obter `tournamentId` a partir do slug.

### Etapa 6 – Chaveamento ✅
- **Lib:** `src/lib/tournamentBracket.ts` – `generateBracket(tournamentId)`: valida torneio (bracket_status ≠ GENERATED, max_teams = 32), obtém 32 times confirmados, embaralha (sorteio), cria 31 `TournamentMatch` (rodadas 2, 4, 8, 16, 32) com `nextMatchId` ligando cada jogo ao próximo que recebe o vencedor; preenche `team_a_id` e `team_b_id` na 1ª fase (R32) com os pares do sorteio; atualiza `tournament.bracket_status = 'GENERATED'`.
- **API:** `POST /api/admin/tournaments/[id]/generate-bracket` – apenas admin; chama `generateBracket`; retorna 400 se já gerado ou times insuficientes. `GET /api/admin/tournaments/[id]/matches` – lista partidas da chave com teamA, teamB, winnerTeam.
- **Admin:** Na página do torneio, botão **"Gerar chave"** (quando `bracket_status = NONE` e confirmados ≥ max_teams); após gerar, seção **Chaveamento** lista partidas por rodada (1ª fase, Oitavas, Quartas, Semifinal, Final) com #, times, placar e vencedor.
- **Página pública:** Em `/torneios/[slug]`, quando `bracket_status = GENERATED`, busca partidas e exibe bloco **Chaveamento** com as mesmas rodadas e confrontos (times e placar quando preenchido).

### Etapa 7 – Partidas e avanço ✅
- **Lib:** Em `src/lib/tournamentBracket.ts`, função **`saveMatchResult(tournamentId, matchId, { scoreA, scoreB, penaltiesA?, penaltiesB? })`**: valida partida (existe, não FINISHED, tem times), calcula vencedor (placar; empate usa pênaltis se informados), atualiza a partida (scoreA, scoreB, penalties, winnerTeamId, status FINISHED) e **avança** o vencedor para o próximo jogo (convenção: jogo ímpar → teamA do próximo, jogo par → teamB do próximo).
- **API:** **PATCH /api/admin/tournaments/[id]/matches/[matchId]** (body: scoreA, scoreB, penaltiesA?, penaltiesB?) – apenas admin; chama `saveMatchResult`; retorna 400 se partida já finalizada, sem times ou empate sem pênaltis.
- **Admin:** Na seção Chaveamento, para cada partida não finalizada que já tem times: formulário com placar (scoreA x scoreB), pênaltis opcionais (A e B) e botão **Salvar**. Ao salvar, resultado é gravado e o vencedor é colocado automaticamente no próximo jogo da chave. Partidas finalizadas exibem placar, pênaltis (se houver) e vencedor.

---

*Documento gerado a partir da auditoria do projeto FlyGames/Portal Futvar para o MVP Copa Mata-Mata.*
