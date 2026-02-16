# Opção A — Implementação detalhada: Pré-estreia → Grade principal

Quando um **PreSaleGame** passa a **PUBLISHED** (com `videoUrl`), um **Game** é criado ou atualizado automaticamente. O jogo aparece na grade principal com link `/jogo/[slug]` e pode ser comprado/assinado como conteúdo convencional.

---

## 1. Schema (Prisma)

### 1.1 Alteração no modelo `Game`

**Arquivo:** `prisma/schema.prisma`

No modelo `Game`, adicionar:

- Campo opcional que aponta para o PreSaleGame de origem (quando o Game veio da pré-estreia).
- Relação opcional com `PreSaleGame`.

**Trecho a alterar (model Game):**

```prisma
model Game {
  id                String    @id @default(cuid())
  title             String
  slug              String    @unique
  championship      String    @map("championship")
  gameDate          DateTime  @map("game_date")
  description       String?
  videoUrl          String    @map("video_url")
  thumbnailUrl      String?   @map("thumbnail_url")
  featured          Boolean   @default(false)
  categoryId        String?   @map("category_id")
  order             Int       @default(0) @map("order")
  preSaleGameId     String?   @unique @map("pre_sale_game_id")   // NOVO
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  category    Category?     @relation(...)
  preSaleGame PreSaleGame?   @relation(fields: [preSaleGameId], references: [id], onDelete: SetNull)  // NOVO
  purchases   Purchase[]
  homeBanners HomeBanner[]
  playEvents  PlayEvent[]
}
```

- `preSaleGameId`: opcional, único (no máximo um Game por PreSaleGame).
- `onDelete: SetNull`: se o PreSaleGame for excluído, o Game não quebra; fica "solto" (opcionalmente pode-se apagar o Game no DELETE do admin; ver item 5.2).

### 1.2 Alteração no modelo `PreSaleGame`

Adicionar a relação inversa (um PreSaleGame pode ter no máximo um Game espelho):

```prisma
model PreSaleGame {
  // ... campos existentes ...

  specialCategory   PreSaleCategory       @relation(...)
  normalCategories  PreSaleGameCategory[]
  clubSlots         PreSaleClubSlot[]
  streamSessions    ClubStreamSession[]
  homeBanners       HomeBanner[]
  gradeGame         Game?                 // NOVO: Game na grade principal (quando PUBLISHED)
}
```

No Prisma isso se faz com a relação reversa: no `Game` já temos `preSaleGame PreSaleGame?` com `fields: [preSaleGameId]`; no `PreSaleGame` basta declarar `gradeGame Game?` (nome da relação no "lado um" de Game).

**Exemplo completo do PreSaleGame com a nova relação:**

```prisma
model PreSaleGame {
  id                    String    @id @default(cuid())
  title                 String    @map("title")
  description           String    @map("description")
  thumbnailUrl          String    @map("thumbnail_url")
  videoUrl              String?   @map("video_url")
  status                String    @default("PRE_SALE") @map("status")
  specialCategoryId     String    @map("special_category_id")
  featured              Boolean   @default(false) @map("featured")
  maxSimultaneousPerClub Int      @map("max_simultaneous_per_club")
  clubAPrice            Float     @map("club_a_price")
  clubBPrice            Float     @map("club_b_price")
  fundedClubsCount      Int       @default(0) @map("funded_clubs_count")
  slug                  String    @unique @map("slug")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  specialCategory   PreSaleCategory       @relation("SpecialCategory", fields: [specialCategoryId], references: [id], onDelete: Restrict)
  normalCategories  PreSaleGameCategory[]
  clubSlots         PreSaleClubSlot[]
  streamSessions    ClubStreamSession[]
  homeBanners       HomeBanner[]
  gradeGame         Game?                 // Game na grade (quando PUBLISHED)
}
```

Após editar o schema: `npx prisma generate` e `npx prisma db push` (ou migração).

---

## 2. Serviço de sincronização

### 2.1 Novo arquivo: `src/services/pre-sale-to-grade.service.ts`

Responsabilidade: dado um `preSaleGameId`, se o PreSaleGame estiver **PUBLISHED** e com **videoUrl**, criar ou atualizar o **Game** na grade (title, slug, videoUrl, thumbnailUrl, championship, gameDate, featured, preSaleGameId).

Regras:

1. Buscar PreSaleGame por id; se não existir ou não estiver PUBLISHED ou sem videoUrl, sair sem erro (idempotente).
2. Slug do Game:
   - Preferir o mesmo slug do PreSaleGame.
   - Se já existir outro **Game** (diferente do que estamos sincronizando) com esse slug, usar sufixo (ex.: `slug-pre` ou `slug-1`) com `uniqueSlug` em cima dos slugs existentes de Game.
3. Se já existir Game com `preSaleGameId === preSaleGame.id`: **atualizar** (title, videoUrl, thumbnailUrl, description, featured; championship e gameDate podem ser mantidos ou atualizados).
4. Se não existir: **criar** Game com:
   - title, description, videoUrl, thumbnailUrl, featured ← do PreSaleGame
   - championship = `"Pré-estreia Clubes"`
   - gameDate = PreSaleGame.createdAt
   - categoryId = preSaleGame.gradeCategoryId ?? null (já existe no formulário de pré-estreia: "Categoria na grade (quando publicado)")
   - order = próximo disponível (ex.: `_max(order) + 1`)
   - preSaleGameId = preSaleGame.id

Assinatura sugerida:

```ts
export async function syncPreSaleGameToGrade(preSaleGameId: string): Promise<{ game: Game | null; created: boolean } | null>
```

- Retorna `null` se PreSaleGame não estiver PUBLISHED ou sem videoUrl.
- Retorna `{ game, created: true }` se criou; `{ game, created: false }` se atualizou.

Tratamento de erro: em caso de falha (ex.: constraint de slug), logar e relançar ou retornar erro tipado, para o chamador decidir.

---

## 3. Onde chamar o serviço

### 3.1 Recalcular status da pré-estreia

**Arquivo:** `src/services/pre-sale-status.service.ts`

Após o `client.preSaleGame.update` que define `status` e `fundedClubsCount`:

- Se o **novo** status for **PUBLISHED**, chamar `syncPreSaleGameToGrade(preSaleGameId)`.
- Como o recalculate pode rodar dentro de uma transação (`tx`), duas opções:
  - Chamar o sync **fora** da transação, após o `return` do `run` (recomendado), para não misturar transação do Prisma com lógica que pode ser mais longa.
  - Ou chamar o sync dentro do `run` recebendo o mesmo `client` (tx) e fazendo o create/update do Game dentro da mesma transação.

Recomendação: após a transação, verificar se o jogo retornado tem `status === 'PUBLISHED'` e aí chamar `syncPreSaleGameToGrade(id)`. Assim o sync roda depois do commit.

Exemplo de fluxo:

```ts
// No final de recalculatePreSaleGameStatus, após run(tx):
const updated = await run(tx); // ou o que retorna do update
if (updated?.status === GameStatus.PUBLISHED && updated?.videoUrl?.trim()) {
  await syncPreSaleGameToGrade(preSaleGameId); // fora da tx
}
return updated;
```

(Se estiver passando `tx`, o `run` é chamado com `tx` e retorna o resultado do update; depois, fora do `$transaction`, chamar o sync.)

### 3.2 Edição do PreSaleGame no admin (PATCH)

**Arquivo:** `src/app/api/admin/pre-sale-games/[id]/route.ts` (PATCH)

Após o `prisma.preSaleGame.update` bem-sucedido:

- Se o jogo retornado tiver `status === 'PUBLISHED'` e `videoUrl` preenchido, chamar `syncPreSaleGameToGrade(id)`.
- Assim, quando o admin coloca manualmente em PUBLISHED e preenche o vídeo (ou altera título/thumbnail/video de um já PUBLISHED), o Game na grade é criado/atualizado.

---

## 4. Home: grade só com Game

**Arquivo:** `src/app/page.tsx`

Função `getGames()` hoje:

- Busca **Game** (todos).
- Busca **PreSaleGame** com status PUBLISHED e videoUrl e mistura na lista com `href: /pre-estreia/assistir/[slug]`.

Alteração:

- Remover a busca de **PreSaleGame** para a grade e a construção de `preSaleMapped`.
- Manter apenas a busca de **Game** e o `mappedGames`.
- Os jogos que vieram da pré-estreia já estarão como **Game** (com `preSaleGameId` preenchido) e passarão a aparecer com o link padrão do GameCard (que é `/jogo/[slug]` quando não há `href`), ou seja, como conteúdo convencional.

Assim, a grade passa a ter uma única fonte: **Game**. Quem quiser exibir "veio da pré-estreia" pode usar `game.preSaleGameId != null` (ex.: badge ou filtro no admin).

---

## 5. Casos especiais

### 5.1 PreSaleGame deixa de ser PUBLISHED (ex.: status voltar para FUNDED)

- Não é obrigatório apagar o Game: ele continua na grade e comprável. Se quiser "esconder" da grade quando despublicar, duas opções:
  - **A)** Não remover o Game; manter como está (recomendado para simplicidade).
  - **B)** Adicionar um campo em Game, ex. `hiddenFromCatalog Boolean @default(false)`, e ao despublicar o PreSaleGame setar `hiddenFromCatalog = true` no Game correspondente; na listagem da home, filtrar `where: { hiddenFromCatalog: false }`. A opção A evita schema novo e edge cases.

### 5.2 Exclusão do PreSaleGame (DELETE no admin)

**Arquivo:** `src/app/api/admin/pre-sale-games/[id]/route.ts` (DELETE)

- Antes de excluir o PreSaleGame, buscar **Game** com `preSaleGameId === id`.
- Se existir, excluir esse **Game** (e depois excluir o PreSaleGame como hoje).
- Assim não sobra um Game "órfão" na grade apontando para pré-estreia inexistente.

### 5.3 Slug duplicado

- O PreSaleGame já tem slug único na tabela dele; o Game tem slug único na tabela Game.
- Pode haver mesmo texto de slug entre as duas tabelas (ex.: "jogo-x"). Por isso, ao criar o Game, usar `uniqueSlug(preSaleGame.slug, existingGameSlugs)` onde `existingGameSlugs` são os slugs **apenas** da tabela Game. Assim nunca colide com outros Game; o PreSaleGame pode continuar com slug "jogo-x" e o Game pode ficar "jogo-x" ou "jogo-x-1" se "jogo-x" já existir em Game.

### 5.4 Ordem na grade (`order`)

- Ao criar o Game, definir `order` como no cadastro normal de jogos: por exemplo `(await prisma.game.aggregate({ _max: { order: true } }))._max.order ?? -1` e usar `maxOrder + 1`.
- Opcional: jogos vindos da pré-estreia podem ter `order` alto (ex.: 1000) para aparecerem no final da lista; depende da regra de negócio.

---

## 6. Resumo de arquivos a tocar

| Arquivo | Alteração |
|--------|-----------|
| `prisma/schema.prisma` | Game: `preSaleGameId`, relação `preSaleGame`; PreSaleGame: relação `gradeGame`. |
| `src/services/pre-sale-to-grade.service.ts` | **Novo**: `syncPreSaleGameToGrade(preSaleGameId)`. |
| `src/services/pre-sale-status.service.ts` | Após update, se status === PUBLISHED e videoUrl, chamar `syncPreSaleGameToGrade`. |
| `src/app/api/admin/pre-sale-games/[id]/route.ts` | PATCH: após update, se PUBLISHED e videoUrl, chamar sync. DELETE: antes de apagar PreSaleGame, apagar Game com esse preSaleGameId (se existir). |
| `src/app/page.tsx` | `getGames()`: remover busca e merge de PreSaleGame PUBLISHED; usar só Game. |

---

## 7. Ordem sugerida de implementação

1. Schema: adicionar `preSaleGameId` e relações; rodar `prisma generate` e `db push`.
2. Implementar `syncPreSaleGameToGrade` em `pre-sale-to-grade.service.ts`.
3. Chamar o sync em `recalculatePreSaleGameStatus` quando resultado for PUBLISHED com videoUrl.
4. Chamar o sync no PATCH de pre-sale-games quando o jogo salvo estiver PUBLISHED com videoUrl.
5. No DELETE de pre-sale-games, excluir o Game vinculado (se existir).
6. Ajustar `getGames()` na home para usar apenas Game.

Com isso, a Opção A fica detalhada e pronta para implementação passo a passo.
