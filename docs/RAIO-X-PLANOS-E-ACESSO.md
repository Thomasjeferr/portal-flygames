# Raio-X: Planos e Formas de Acesso

Documento de referência sobre todos os **planos** (assinatura e patrocínio) e todas as **formas de acesso** a conteúdo no portal.

---

## 1. Planos no projeto

No projeto existem **dois tipos** de “planos”, em tabelas diferentes:

### 1.1 Planos de assinatura / jogo avulso (`Plan`)

- **Tabela:** `Plan` (Prisma)
- **Onde aparecem:** página `/planos` (listagem) e fluxo de checkout (`/checkout`).
- **API:** `GET /api/plans` — retorna planos ativos para exibição pública.
- **Campos principais:**
  - `name`, `type` (unitario | recorrente), `periodicity` (mensal | anual | personalizado)
  - `price`, `description`, `active`, `acessoTotal`
  - `duracaoDias` (unitário: dias de acesso ou null = ilimitado ao jogo)
  - `renovacaoAuto`, `featured` (Mais escolhido)
  - `teamPayoutPercent`, `partnerCommissionPercent`, `maxConcurrentStreams`
- **Logo:** o modelo **não possui campo de logo**. Os planos são exibidos como cards com nome, preço, descrição e benefícios (texto). Não há imagem/logo por plano de assinatura no banco.

### 1.2 Planos de patrocínio (`SponsorPlan`)

- **Tabela:** `SponsorPlan` (Prisma)
- **Onde aparecem:** página `/patrocinar` (listagem) e fluxo `/patrocinar/comprar`.
- **API pública:** `GET /api/public/sponsor-plans` — planos ativos.
- **Campos principais:**
  - `name`, `price`, `billingPeriod` (monthly | quarterly | yearly)
  - `benefits` (JSON array), `featuresFlags` (JSON)
  - `teamPayoutPercent`, `partnerCommissionPercent`, `sortOrder`, `isActive`
- **Logo:** o modelo **não possui campo de logo**. São cards com nome, preço e benefícios. O **logo** aparece depois da compra: quem vira **patrocinador** (registro em `Sponsor`) ou está em um **SponsorOrder** tem `logoUrl` (logo da empresa/marca).

---

## 2. Onde existem logos no projeto (resumo)

| Entidade         | Campo     | Uso |
|------------------|----------|-----|
| **Team**         | `crestUrl` | Escudo/logo do time (jogos, placar, painel do time). |
| **Sponsor**      | `logoUrl`  | Logo do patrocinador (carrossel, footer, player – conforme features). |
| **SponsorOrder** | `logoUrl`  | Logo informado no pedido de patrocínio (origem do logo do Sponsor). |
| **EmailSettings**| `logoUrl`  | Logo da marca nos e-mails transacionais. |
| **Plan**         | —          | Sem logo. |
| **SponsorPlan**  | —          | Sem logo. |

Ou seja: **planos em si (Plan e SponsorPlan) não têm logo**; logos são de **times**, **patrocinadores** e **e-mail**.

---

## 3. Formas de acesso a conteúdo

Todas as checagens de acesso relevantes estão em `src/lib/access.ts`. Resumo:

### 3.1 Acesso total (assinatura ativa)

- **Função:** `hasFullAccess(userId)`
- **Regra:** usuário tem **Subscription** ativa (`active` e `endDate >= hoje`) e o **Plan** vinculado tem `acessoTotal: true` (ou assinatura legada sem plano = acesso total).
- **Onde é usado:**
  - Dar acesso a **qualquer jogo** (base de `canAccessGame` / `canAccessGameBySlug`).
  - Liberar **Resultados aprovados** (súmulas) junto com patrocínio pago.
  - **Live:** se a live exige assinatura (`requireSubscription`), ter full access libera.
  - **Pré-estreia:** assinante com full access (ou admin) pode assistir sem sessão de clube.
  - **Apoio (meta) campeonato:** em alguns fluxos exige assinante com full access.
  - **API `/api/auth/me`:** retorna `hasFullAccess` para o front.
- **Resumo:** “assinante ativo com acesso total” = vê todo o catálogo de jogos (e demais conteúdos que dependem de assinatura).

### 3.2 Acesso a um jogo específico

- **Funções:** `canAccessGame(userId, gameId)` e `canAccessGameBySlug(userId, gameSlug)`.
- **Regra:**
  1. Se `hasFullAccess(userId)` → **true**.
  2. Senão: existe **Purchase** com `userId`, `gameId`, `paymentStatus: 'paid'`, não expirado (`expiresAt` null ou >= hoje) e `plan.active` → **true**.
- **Onde é usado:** página do jogo (`/jogo/[slug]`), API de stream assinado (`/api/video/stream-playback`), banners que dependem de acesso ao jogo, etc.
- **Resumo:** usuário pode assistir se for “assinante com acesso total” **ou** se comprou aquele jogo (plano unitário).

### 3.3 Resultados aprovados (súmulas)

- **Função:** `canAccessApprovedResults(userId)`
- **Regra:** `hasFullAccess(userId)` **ou** existe pelo menos um **SponsorOrder** com `userId` (ou e-mail) e `paymentStatus: 'paid'`.
- **Onde é usado:** página de resultados aprovados / súmulas para patrocinadores.
- **Resumo:** assinante com acesso total **ou** patrocinador (empresa) pago pode ver resultados aprovados.

### 3.4 Live

- **Funções:** `canAccessLive(userId, live)`, `canAccessLiveById(userId, liveId)`.
- **Regra:**
  - Se a live não exige assinatura nem compra avulsa → **true** (qualquer logado).
  - Se `requireSubscription` → **true** se `hasFullAccess(userId)`.
  - Se `allowOneTimePurchase` → **true** se existe **LivePurchase** pago para aquele usuário e live.
- **Onde é usado:** página `/live/[id]`.
- **Resumo:** acesso por “assinatura com acesso total” **ou** compra avulsa da live (quando permitido).

### 3.5 Mapa de acesso a vários jogos

- **Função:** `getGamesAccessMap(userId, gameIds)`
- **Regra:** para cada `gameId`, mesmo critério de `canAccessGame`: full access ou purchase pago e válido.
- **Onde é usado:** listagens onde se precisa saber de uma vez para quais jogos o usuário tem acesso (ex.: home, grade).
- **Resumo:** versão em lote de “pode assistir a este jogo?”.

### 3.6 Pré-estreia (pré-venda / clube)

- **Não está em `access.ts`.** Acesso é por:
  - **Assinante com full access ou admin:** pode assistir direto (checagem no front/API da pré-estreia).
  - **“Sou do clube”:** sessão de visualização via **ClubStreamSession** (`sessionToken` válido, não expirado) vinculada ao **PreSaleGame** e ao clube (slot/código).
- **Onde é usado:** página `/pre-estreia/assistir/[slug]`, API de início de sessão e de stream.
- **Resumo:** acesso por assinatura total/admin **ou** por sessão de clube (token enviado ao clube).

### 3.7 Campeonato – inscrição e apoio (meta)

- **Inscrição paga (PAID):** time paga inscrição (Stripe/Woovi); **TournamentTeam** com `paymentStatus: 'paid'` (e status de time confirmado).
- **Apoio por meta (GOAL):** torcedor faz **TournamentSubscription** (apoio ao time no campeonato). Acesso ao conteúdo do campeonato (ex.: replay) pode depender de **hasFullAccess** em alguns fluxos; o valor do apoio pode gerar ganho para o time (**TeamTournamentGoalEarning**).
- **Onde é usado:** páginas de torneio (`/torneios/[slug]`), apoiar (`/torneios/[slug]/apoiar`), API de checkout do goal, painel do time (ganhos “apoio meta”).
- **Resumo:** acesso à parte de “campeonato” vem de inscrição do time (paga) ou de regras específicas de pré-estreia/replay; apoio (meta) é uma forma de pagamento/apoio, não necessariamente a única chave de acesso a vídeo.

### 3.8 Responsável pelo time (bloqueio de compra)

- **Funções:** `isTeamManager(userId, teamId)`, `isTeamResponsible(userId)`.
- **Regra:** usuário é gestor do time (**TeamManager** ou e-mail igual a **Team.responsibleEmail** de time aprovado).
- **Uso:** **bloquear** que essa conta compre planos/jogos/patrocínio como cliente (para evitar mistura de papéis). Páginas `/planos` e `/jogo/[slug]` exibem aviso e não permitem compra com essa conta.
- **Resumo:** “conta de responsável” não pode usar botões de patrocinar/comprar; deve usar outra conta para comprar.

### 3.9 Já comprou como cliente (bloqueio de responsável)

- **Função:** `hasAnyPurchaseAsCustomer(userId, email)`
- **Regra:** existe **Purchase** pago, ou **SponsorOrder** pago (por userId ou email), ou **LivePurchase** pago.
- **Uso:** ao cadastrar time, se o e-mail já comprou algo no portal, não pode ser definido como responsável do time (evitar mesmo e-mail como cliente e como responsável).
- **Resumo:** impede que um “cliente” vire responsável do time com o mesmo e-mail.

---

## 4. Resumo visual: quem acessa o quê

| Conteúdo              | Quem acessa |
|-----------------------|-------------|
| **Jogo (replay)**     | `hasFullAccess` OU `Purchase` pago daquele jogo (plano unitário). |
| **Live**              | Conforme configuração da live: nada / assinatura (`hasFullAccess`) / compra avulsa (`LivePurchase`). |
| **Resultados aprovados** | `hasFullAccess` OU `SponsorOrder` pago (patrocinador). |
| **Pré-estreia**       | `hasFullAccess` ou admin OU sessão de clube (`ClubStreamSession` com token válido). |
| **Campeonato (replay/inscrição)** | Inscrição do time (PAID pago) ou regras específicas; apoio (goal) pode dar ganho ao time. |

---

## 5. Onde os “planos” são listados (sem logo)

- **Planos de assinatura/jogo:** `/planos` → dados de `GET /api/plans` (Plan ativos). Sem logo, só texto e preço.
- **Planos de patrocínio:** `/patrocinar` → dados de `GET /api/public/sponsor-plans` (SponsorPlan ativos). Sem logo, só nome, preço e benefícios.
- **Logos** aparecem depois: em **times** (crest), **patrocinadores** (Sponsor/SponsorOrder) e **e-mails** (EmailSettings).

Se no futuro quiser “logo do plano”, será necessário adicionar campo (ex.: `imageUrl` ou `logoUrl`) em **Plan** e/ou **SponsorPlan** e exibir nas respectivas páginas e APIs.
