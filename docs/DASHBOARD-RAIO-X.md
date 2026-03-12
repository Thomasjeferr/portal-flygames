# Raio-X do Dashboard Admin

Verificação de cada métrica do dashboard em relação aos dados reais do sistema.

---

## Fonte dos dados

- **API:** `GET /api/admin/dashboard` → `src/app/api/admin/dashboard/route.ts`
- **Página:** `src/app/admin/(dashboard)/page.tsx` (consome a API e exibe os KPIs, gráficos e tabelas)

---

## 1. KPIs (cards do topo)

### 1.1 Usuários novos — `X / Y` (Hoje / 7 dias)

| O que aparece | Fonte no sistema | Fiel? |
|---------------|------------------|--------|
| **Hoje** | `User` onde `createdAt` entre início e fim de **hoje** (00:00–23:59) | ✅ Sim |
| **7 dias** | `User` onde `createdAt >= 7 dias atrás` (0h de hoje -7) | ✅ Sim |

**Query:** `prisma.user.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } })` e `prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } })`.

---

### 1.2 Assinantes ativos — Total e Mensal / Anual

| O que aparece | Fonte no sistema | Fiel? |
|---------------|------------------|--------|
| **Total** | Soma de assinantes com `Subscription.active === true` **e** `Subscription.endDate >= agora` | ✅ Sim |
| **Mensal / Anual** | Agrupamento pelo campo `Plan.periodicity` (`mensal` ou `anual`) | ✅ Sim |

**Query:** `prisma.subscription.findMany({ where: { active: true, endDate: { gte: now } }, include: { plan: true } })`, depois contagem por `plan.periodicity`.

**Alinhamento:** Mesmo critério usado no resto do sistema (auth/me, conta, acesso a jogos): assinatura ativa só conta com `active` + `endDate >= now`. Degustação expirada não entra.

---

### 1.3 Receita do mês

| O que aparece | Fonte no sistema | Fiel? |
|---------------|------------------|--------|
| **Valor** | Soma de (1) **Purchase** pagas no mês + (2) **PreSaleClubSlot** PAID no mês | ✅ Sim |

**Detalhe:**

- **Purchase:** valor usado é **`Purchase.amountCents`** quando preenchido (valor realmente pago), senão fallback para `plan.price`. Assim a receita reflete o que foi efetivamente pago (conforme `docs/RASTREIO-VALOR-PAGO-COMPRAS.md`).
- **PreSaleClubSlot:** usa o preço do slot (`clubAPrice` ou `clubBPrice` do jogo) → correto.
- Filtro de período: `Purchase.createdAt >= início do mês`; `PreSaleClubSlot.paidAt >= início do mês`.

**Conclusão:** ✅ Fiel: receita do mês e por dia usam `amountCents` quando existir; tabela Top jogos também usa `amountCents` na “Receita est.”.

---

### 1.4 Compras unitárias (mês)

| O que aparece | Fonte no sistema | Fiel? |
|---------------|------------------|--------|
| **Número** | Contagem de **Purchase** com `paymentStatus === 'paid'`, `createdAt >= início do mês`, e `plan.type === 'unitario'` | ✅ Sim |

**Query:** `prisma.purchase.count({ where: { paymentStatus: 'paid', createdAt: { gte: monthStart }, plan: { type: 'unitario' } } })`.

---

### 1.5 Acessos — `X / Y` (Hoje / 7 dias)

| O que aparece | Fonte no sistema | Fiel? |
|---------------|------------------|--------|
| **Hoje** | Contagem de **VisitLog** com `createdAt` entre início e fim de hoje | ✅ Sim |
| **7 dias** | Contagem de **VisitLog** com `createdAt >= 7 dias atrás` | ✅ Sim |

**Query:** `prisma.visitLog.count` com filtros de data em `createdAt`. Depende de o portal registrar visitas na tabela `VisitLog` (middleware ou API de analytics).

---

### 1.6 Jogos publicados

| O que aparece | Fonte no sistema | Fiel? |
|---------------|------------------|--------|
| **Número** | Contagem de **Game** com **vídeo disponível**: `videoUrl` não nulo e não vazio (jogos que podem ser assistidos). | ✅ Sim |

**Query:** `prisma.game.count({ where: { AND: [ { videoUrl: { not: null } }, { videoUrl: { not: '' } } ] } })`.

**Observação:** Considera “publicado” o jogo que tem vídeo (mesmo critério do alerta “Jogo sem vídeo”, invertido).

---

### 1.7 Pré-estreias — PRE / FUND / PUB

| O que aparece | Fonte no sistema | Fiel? |
|---------------|------------------|--------|
| **Por status** | Contagem de **PreSaleGame** agrupada por `status` (`PRE_SALE`, `FUNDED`, `PUBLISHED`) | ✅ Sim |

**Query:** `prisma.preSaleGame.groupBy({ by: ['status'], _count: { id: true } })`.

---

## 2. Gráficos (últimos 30 dias)

### 2.1 Receita por dia

- **Fonte:** Mesmas compras e slots do “receita do mês”, filtradas por `createdAt` (Purchase) ou `paidAt` (PreSaleClubSlot) nos últimos 30 dias, agrupadas por dia.
- **Valor por compra:** `amountCents / 100` quando existir, senão `plan.price`. ✅ Fiel ao valor pago.

### 2.2 Cadastros por dia

- **Fonte:** `User.createdAt` nos últimos 30 dias, agrupado por dia. ✅ Fiel.

### 2.3 Plays por dia

- **Fonte:** **PlayEvent** com `createdAt` nos últimos 30 dias, agrupado por dia. ✅ Fiel ao que está registrado em `PlayEvent` (depende de o player/backend registrar o evento).

---

## 3. Tabelas

### 3.1 Top 10 jogos mais assistidos (30 dias)

| Coluna | Fonte | Fiel? |
|--------|--------|--------|
| **Jogo / Campeonato / Plays** | **PlayEvent** agrupado por `gameId` nos últimos 30 dias, ordenado por quantidade de plays; dados do jogo vêm de **Game**. | ✅ Sim |
| **Receita est.** | Soma do valor pago das **Purchase** pagas **do mês** com `gameId` igual ao do jogo: usa `amountCents` quando existir, senão `plan.price`. | ✅ Fiel |

**Observação:** A “receita est.” é intencionalmente estimada e limitada às compras do mês; para bater com “receita do mês” por jogo, faz sentido. Para valor realmente recebido, usar `amountCents` quando existir.

### 3.2 Pré-estreias em andamento

- **Fonte:** **PreSaleGame** com `status IN ('PRE_SALE', 'FUNDED')` e `metaEnabled === false`; “Financiado” = quantidade de **PreSaleClubSlot** com `paymentStatus: 'PAID'`; “Total” = soma dos preços desses slots. ✅ Fiel.

---

## 4. Alertas operacionais

- **Jogo sem vídeo:** **Game** com `videoUrl === ''`. ✅ Fiel.
- **Banner expirando em 48h:** **HomeBanner** ativos com `endAt` não nulo e entre agora e 48h à frente. ✅ Fiel.
- **Falhas de webhook:** **WebhookEvent** com `status === 'FAILED'` e `createdAt` nas últimas 24h. ✅ Fiel.

---

## 5. Resumo: fidelidade ao sistema

| Área | Situação | Ação sugerida |
|------|----------|----------------|
| Usuários novos, Assinantes ativos, Compras unitárias, Acessos, Pré-estreias (KPIs e status), Plays, Top jogos (plays), Pré-estreias em andamento, Alertas | ✅ Consistentes com as tabelas e regras atuais | Nenhuma obrigatória |
| Receita do mês e por dia; Receita est. por jogo | ✅ Usam amountCents quando existir; fallback para plan.price | — |
| Jogos publicados | ✅ Conta apenas jogos com vídeo (videoUrl não nulo e não vazio) | — | “publicado” no modelo; se sim, aplicar no `count` |

---

## 6. Conclusão

As informações do dashboard vêm diretamente do banco (User, Subscription, Plan, Purchase, VisitLog, PlayEvent, PreSaleGame, PreSaleClubSlot, Game, HomeBanner, WebhookEvent) e estão **alinhadas** com o que o sistema considera “assinante ativo” (active + endDate) e com os períodos (hoje, 7 dias, mês, 30 dias). As únicas melhorias recomendadas são: (1) usar `amountCents` nas métricas de receita quando existir, para máxima fidelidade ao valor pago; (2) conferir se “Jogos publicados” deve filtrar por algum status de publicação.
