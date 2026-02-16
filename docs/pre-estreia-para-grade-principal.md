# Transição pré-estreia → grade principal

## 1. O que temos hoje

### 1.1 Entidades
- **Game** (grade principal): `id`, `title`, `slug`, `championship`, `gameDate`, `videoUrl`, `thumbnailUrl`, `categoryId` (Category do site), `featured`, `order`. Tem `Purchase[]` (compra unitária) e acesso via assinatura (`Plan.acessoTotal`).
- **PreSaleGame** (pré-estreia): `id`, `title`, `slug`, `description`, `thumbnailUrl`, `videoUrl?`, `status` (PRE_SALE | FUNDED | PUBLISHED), `specialCategoryId`, `normalCategories`, `clubSlots`, etc. **Não tem vínculo com Game** e não participa de `Purchase`.

### 1.2 Quando a pré-estreia fica PUBLISHED
- **Regra atual** (`recalculatePreSaleGameStatus`): quando os 2 clubes estão PAID e `videoUrl` está preenchido → status vira **PUBLISHED**.
- **Na home** (`getGames()`): já são buscados jogos **Game** e **PreSaleGame com status PUBLISHED e videoUrl**. Os dois são misturados na grade; para PUBLISHED pré-estreia o link é **`/pre-estreia/assistir/[slug]`** (fluxo clube/código/usuário e senha), **não** `/jogo/[slug]`.
- **Consequência**: o mesmo jogo publicado não aparece como “conteúdo convencional” — não dá para comprar ou assinar para assistir pelo fluxo normal; quem não é clube vai para a tela de pré-estreia (código/usuário e senha).

### 1.3 Acesso ao conteúdo convencional
- **`canAccessGame(userId, gameId)`** em `src/lib/access.ts`: assinatura ativa com `acessoTotal` **ou** compra unitária do **Game** (pago e não expirado). Usa só `Game.id` e `Purchase.gameId`.
- **Página** `/jogo/[slug]`: busca apenas **Game** pelo slug; exibe vídeo, “Comprar este jogo” (`BuyGameButton` com `gameId`), “Ver planos e assinar”. Não conhece PreSaleGame.

### 1.4 O que não existe
- Nenhum vínculo automático PreSaleGame → Game quando vira PUBLISHED.
- Nenhum limite de dispositivos simultâneos por assinatura/compra na grade.
- Nenhuma sessão de streaming/heartbeat para jogos da grade (diferente da pré-estreia, que tem `ClubStreamSession`).

---

## 2. Objetivo

Fazer com que o **conteúdo da pré-estreia**, assim que **pago (2 slots) e publicado (videoUrl preenchido)**, fique disponível como **conteúdo principal**: mesmo vídeo, na grade, com **compra e assinatura** iguais ao conteúdo convencional.

---

## 3. Opções

### Opção A — Criar Game automaticamente ao publicar (recomendada)

**Ideia:** Quando PreSaleGame passa a PUBLISHED com `videoUrl`, criar (ou atualizar) um **Game** que espelha esse conteúdo. A grade e o acesso continuam 100% baseados em **Game** e **Purchase**.

**Implementação resumida:**
1. **Schema:** Em `Game`, adicionar `preSaleGameId String? @unique` e relação opcional com `PreSaleGame`.
2. **Serviço:** `syncPreSaleGameToGrade(preSaleGameId)`: se o PreSaleGame estiver PUBLISHED e com `videoUrl`, criar ou atualizar o Game (title, slug, videoUrl, thumbnailUrl, championship ex. "Pré-estreia Clubes", gameDate = createdAt do pré-estreia, featured, `preSaleGameId`). Slug do Game: usar o do PreSaleGame; se já existir Game com esse slug (outro jogo), usar sufixo (ex.: `-pre`).
3. **Quando chamar:** (a) Ao final de `recalculatePreSaleGameStatus` quando o novo status for PUBLISHED; (b) no PATCH do admin ao salvar com status PUBLISHED e videoUrl.
4. **Home:** Em `getGames()`, **deixar de** buscar PreSaleGame PUBLISHED para a grade; usar só **Game**. Os ex–pré-estreia passam a ser Game e aparecem com link `/jogo/[slug]`.
5. **Checkout / planos / acesso:** Nenhuma mudança; continuam usando `gameId` (Game) e `canAccessGame`.

**Prós:** Um único fluxo de “conteúdo vendável” (sempre Game); compra/assinatura e página `/jogo/[slug]` já prontos; sem duplicar regras de acesso.  
**Contras:** Duplicação de dados (title, slug, videoUrl, thumbnail entre PreSaleGame e Game); necessidade de manter Game em sync se o admin alterar título/thumbnail/video do PreSaleGame depois (opcional).

---

### Opção B — /jogo/[slug] e acesso unificados (slug resolve Game ou PreSaleGame)

**Ideia:** Manter PreSaleGame e Game separados. Na grade, PUBLISHED pré-estreia continua com link `/jogo/[slug]`. A página `/jogo/[slug]` passa a resolver: primeiro **Game**; se não achar, **PreSaleGame** (PUBLISHED e com videoUrl). Para PreSaleGame, acesso = mesma regra (assinatura com acesso total ou “compra” desse jogo). Para isso, **Purchase** precisaria aceitar compra “por pré-estreia” (ex. `preSaleGameId` em Purchase) e `canAccessGame`/`canAccessGameBySlug` considerariam Game ou PreSaleGame.

**Implementação resumida:**
1. **Schema:** Em `Purchase`, adicionar `preSaleGameId String?` e relação com `PreSaleGame`.
2. **Acesso:** `canAccessGameBySlug`: buscar por slug em Game; se não achar, em PreSaleGame (PUBLISHED). Se for PreSaleGame, acesso = hasFullAccess OU purchase com esse `preSaleGameId` (pago e não expirado).
3. **Checkout:** Permitir checkout com `preSaleGameId` em vez de `gameId` (e criar Purchase com `preSaleGameId`).
4. **Página /jogo/[slug]:** Buscar Game ou PreSaleGame por slug; exibir mesmo layout; usar `videoUrl` e, para “Comprar”, usar `BuyGameButton` com `preSaleGameId` quando for pré-estreia.
5. **Home:** Manter PUBLISHED pré-estreia em `getGames()` com **href = `/jogo/[slug]`** (em vez de `/pre-estreia/assistir/...`).

**Prós:** Não cria registro Game; PreSaleGame é a única fonte para esse conteúdo.  
**Contras:** Lógica de acesso, checkout e UI duplicada/condicional (Game vs PreSaleGame); mais pontos para manter e mais risco de inconsistência.

---

### Opção C — Só mudar o link na grade (sem compra/assinatura para ex–pré-estreia)

**Ideia:** Na home, PUBLISHED pré-estreia continuar na grade mas com link `/jogo/[slug]`. Em `/jogo/[slug]`, se não houver Game, buscar PreSaleGame PUBLISHED por slug e exibir o vídeo **sem** bloquear (ou bloquear com “Em breve” sem integração com planos). **Não** integrar com compra/assinatura para esse conteúdo.

**Prós:** Mudança mínima.  
**Contras:** Não atende ao objetivo de “clientes podem comprar ou assinar como conteúdo normal”; o conteúdo ex–pré-estreia não seria vendável na grade.

---

## 4. Recomendação

**Recomendação: Opção A (criar Game ao publicar).**

- Mantém uma única noção de “jogo na grade” (**Game**) e um único fluxo de acesso (assinatura + compra unitária via **Purchase** e `canAccessGame`).
- O vídeo e a URL já estão no PreSaleGame; ao passar para PUBLISHED, copiamos uma vez para o Game e a partir daí tudo (grade, página do jogo, checkout, planos) funciona como hoje.
- Implementação concentrada em: schema (`preSaleGameId` em Game), serviço de sincronização e chamadas no “recalcular status” e no PATCH do admin; ajuste em `getGames()` para não listar Pré-estreia PUBLISHED separado (pois já estará como Game).

Se quiser, na próxima etapa podemos desenhar os passos exatos de implementação da Opção A (arquivos a alterar e ordem de deploy).
