# Planejamento: Melhores momentos e cortes nos jogos

**Objetivo:** Permitir inserir, por jogo, cortes (clipes) dos melhores lances e melhores momentos, exibidos em uma área dedicada na página do jogo.

---

## 1. Visão geral

- **Onde aparece:** Na página do jogo (`/jogo/[slug]`), em uma seção **"Melhores momentos"** (ou "Cortes") abaixo do player principal e acima ou abaixo do bloco de engajamento (curtir, compartilhar, comentários).
- **Quem insere:** Admin no painel do jogo (ex.: tela de edição do jogo ou nova tela "Cortes / Melhores momentos").
- **O que o usuário vê:** Lista (ou carrossel) de clipes com thumbnail, título e duração; ao clicar, reproduz o corte (modal ou inline).

---

## 2. Desenho de referência

Foi gerado um wireframe com a área "Melhores momentos" na página do jogo:

- **Arquivo:** `assets/jogo-melhores-momentos-wireframe.png` (no projeto Cursor) ou copie para `docs/jogo-melhores-momentos-wireframe.png` para versionar no repositório.
- **Conteúdo do desenho:**

- Player principal do jogo no topo.
- Seção **"Melhores momentos"** com subtítulo "Cortes e melhores lances".
- Linha horizontal de cards (scroll no mobile): cada card com thumbnail 16:9, título (ex.: "Gol aos 23'", "Defesa incrível") e badge de duração (ex.: 0:45).
- Indicação de mais itens à direita (scroll).
- Abaixo, a seção "Você também pode gostar" permanece como hoje.

Use esse desenho como referência visual para o layout.

---

## 3. Modelo de dados (sugestão)

Criar uma entidade **`GameHighlight`** (ou `GameClip`) vinculada ao jogo:

```prisma
model GameHighlight {
  id           String   @id @default(cuid())
  gameId       String   @map("game_id")
  title        String   // ex.: "Gol aos 23'", "Defesa incrível"
  description  String?  // opcional
  videoUrl     String   @map("video_url")  // URL do vídeo (Cloudflare Stream, YouTube, ou arquivo)
  thumbnailUrl String?  @map("thumbnail_url")
  durationSec  Int?     @map("duration_sec") // duração em segundos (para exibir "0:45")
  order        Int      @default(0) @map("order") // ordem de exibição
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  game Game @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@map("game_highlights")
}
```

No modelo **`Game`** (em `prisma/schema.prisma`), adicionar:

```prisma
highlights GameHighlight[]
```

**Alternativa:** Se os cortes forem apenas timestamps do mesmo vídeo do jogo (início e fim), o modelo pode ter `startAtSec` e `endAtSec` em vez de `videoUrl` separado; aí o player do jogo principal usaria esses pontos para “pular” para o momento. Para **cortes como vídeos separados** (melhor para compartilhamento e SEO), o modelo acima é mais adequado.

---

## 4. Armazenamento dos vídeos

- **Opção A – Cloudflare Stream:** Já usado no projeto para o jogo completo. Upload de cada corte como um vídeo; `videoUrl` = URL do Stream (ex.: `https://customer-xxx.cloudflarestream.com/...`). Gera thumbnail e duração via API.
- **Opção B – YouTube / Vimeo:** Admin cola link; o front exibe embed ou player. Menos controle de branding.
- **Opção C – Arquivo (Blob/Storage):** Upload de MP4 para Vercel Blob ou S3; `videoUrl` = URL pública. Exige processamento manual (ou job) para thumbnail/duração.

**Recomendação:** Manter consistência com o jogo (Cloudflare Stream) quando possível; permitir também URL externa (YouTube) para flexibilidade.

---

## 5. APIs

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/api/games/[gameId]/highlights` ou `/api/jogo/[slug]/highlights` | Listar cortes do jogo (público, apenas jogo publicado). Retorna array ordenado por `order` e `createdAt`. |
| GET | `/api/admin/games/[gameId]/highlights` | Listar cortes (admin). |
| POST | `/api/admin/games/[gameId]/highlights` | Criar corte (admin): body com `title`, `videoUrl`, `thumbnailUrl?`, `durationSec?`, `order?`. |
| PATCH | `/api/admin/games/[gameId]/highlights/[highlightId]` | Editar corte. |
| DELETE | `/api/admin/games/[gameId]/highlights/[highlightId]` | Excluir corte. |

Regras de negócio:

- Só exibir na página pública se o jogo estiver publicado (`status PUBLISHED` ou equivalente) e, se houver, respeitar `displayMode` (ex.: não mostrar mídia se for `public_no_media`).
- Duração e thumbnail podem ser opcionais: se não informados, tentar obter do Stream (ou exibir placeholder e “— min”).

---

## 6. Admin: onde inserir os cortes

### 6.1 Avaliação: usar o formulário onde se criam/editam os jogos

**Sua ideia:** Inserir os cortes (melhores momentos) no próprio formulário onde você cria ou edita os jogos — tanto para **jogos ao vivo** (depois de publicados) quanto para **pré-estreia**.

**Avaliação:** Faz sentido e é a opção mais prática.

| Ponto | Avaliação |
|-------|-----------|
| **Um só lugar** | Quem edita o jogo já está no contexto certo; não precisa abrir outra tela para gerenciar cortes. |
| **Jogos (live)** | No formulário de **criar jogo** (`/admin/jogos/novo`) e **editar jogo** (`/admin/jogos/[id]/editar`): adicionar uma seção "Melhores momentos" (lista de cortes + botão "Adicionar corte"). No **novo**, a seção pode ficar ativa só depois de salvar o jogo pela primeira vez (aí já existe `gameId`). |
| **Pré-estreia** | Hoje existem dois fluxos: **Pré-estreia Clubes** (`/admin/pre-estreia/novo` e `/[id]/editar`) e **Pré-estreia Meta** (`/admin/pre-estreia-meta/...`). São entidades **PreSaleGame**, não **Game**. Para ter cortes na pré-estreia, é preciso definir: (1) criar modelo **PreSaleGameHighlight** (igual ao GameHighlight, mas com `preSaleGameId`) e (2) adicionar a mesma seção "Melhores momentos" nos formulários de criar/editar pré-estreia. Assim, qualquer um dos jogos — live ou pré-estreia — tem cortes no mesmo tipo de formulário. |
| **Formulário longo** | Para não poluir a tela: deixar "Melhores momentos" como **seção recolhível** (accordion) ou com botão "Adicionar corte" que abre um **modal** (ou painel lateral). A listagem de cortes já cadastrados fica compacta (thumbnail + título + editar/remover). |
| **Quando aparecer** | Na **edição** sempre mostrar a seção. Na **criação** de jogo (ou pré-estreia), mostrar depois do primeiro save ou já mostrar desabilitada com o texto "Salve o jogo primeiro para adicionar cortes". |

**Resumo:** Colocar os cortes no formulário de criação/edição de **cada tipo** de jogo (jogos ao vivo e pré-estreia) é coerente e evita menu extra. Para pré-estreia, é necessário um modelo equivalente (ex.: `PreSaleGameHighlight`) e a mesma UI nos formulários de pré-estreia.

---

### Onde exatamente (recomendação)

- **Opção A – Na própria tela de edição do jogo:** Aba ou seção "Melhores momentos" com lista de cortes, botão "Adicionar corte", campos (título, URL do vídeo, thumbnail opcional, duração, ordem) e exclusão.
- **Opção B – Tela dedicada:** Menu admin "Jogos" → clicar no jogo → submenu "Cortes / Melhores momentos" → CRUD só de highlights.

**Recomendação:** Opção A (seção no formulário), com a seção recolhível ou em modal para não deixar o form gigante. Para **pré-estreia**, repetir a mesma ideia nos formulários de pré-estreia (novo + editar), usando um modelo de highlights vinculado a `PreSaleGame`.

---

## 7. Página do jogo (front)

- **Componente:** Ex.: `GameHighlights` ou `MelhoresMomentos`.
- **Dados:** Buscar via `GET /api/jogo/[slug]/highlights` (ou incluir no SSR da página do jogo, ex.: `include: { highlights: true }`).
- **Comportamento:**
  - Se não houver cortes, não renderizar a seção.
  - Layout: título "Melhores momentos", subtítulo opcional, lista horizontal (grid em desktop, scroll em mobile) de cards.
  - Cada card: thumbnail, título, duração; ao clicar, abrir modal com player do corte ou navegar para uma rota `/jogo/[slug]/cortes/[highlightId]` (opcional).
- **Player dos cortes:** Reutilizar o mesmo componente de vídeo do projeto (ex.: `VideoPlayer`), passando a `videoUrl` do corte. Se for Stream, aplicar mesma lógica de assinatura/limite de telas se o produto exigir.

---

## 8. Ordem de implementação sugerida

1. **Fase 1 – Dados e API**
   - Criar modelo `GameHighlight` no Prisma; migration.
   - Implementar GET público (por slug ou gameId) e CRUD admin (POST, PATCH, DELETE).
   - (Opcional) Integração com Cloudflare Stream para preencher `thumbnailUrl` e `durationSec` a partir do `videoUrl`.

2. **Fase 2 – Admin**
   - Adicionar seção ou tela "Melhores momentos" na edição do jogo.
   - Formulário: título, URL do vídeo (e opcionalmente upload para Stream), ordem.
   - Listagem com editar/remover e reordenar (drag-and-drop ou campos de ordem).

3. **Fase 3 – Página do jogo**
   - Incluir highlights na query da página (ou fetch no cliente).
   - Implementar componente de lista/carrossel de cortes conforme wireframe.
   - Ao clicar em um corte: modal ou página com player usando a `videoUrl` do highlight.

4. **Fase 4 – Polish**
   - Acessibilidade (teclado, foco, labels).
   - Tratamento de erro (vídeo indisponível, falha ao carregar).
   - (Opcional) SEO: meta ou schema para vídeos destacados.

---

## 9. Checklist de decisões

- [ ] Cortes são **vídeos separados** (novo modelo) ou apenas **marcadores de tempo** no vídeo do jogo?
- [ ] Armazenamento: só Cloudflare Stream, só URL externa (YouTube), ou ambos?
- [ ] Exibir cortes só para quem tem acesso ao jogo ou para todos (amostra grátis)?
- [x] **Admin:** Seção "Melhores momentos" **dentro do formulário** de criar/editar jogo (e, se for o caso, no formulário de pré-estreia) — avaliado positivamente.
- [ ] **Pré-estreia:** Ter cortes também para pré-estreia? Se sim, criar modelo `PreSaleGameHighlight` e mesma seção nos formulários de pré-estreia (clubes e meta).
- [ ] Reprodução: modal na mesma página ou nova rota `/jogo/[slug]/cortes/[id]`?

---

## 10. Resumo

- **Desenho:** Wireframe da área "Melhores momentos" na página do jogo (arquivo de referência no projeto).
- **Modelo:** `GameHighlight` com `gameId`, `title`, `videoUrl`, `thumbnailUrl`, `durationSec`, `order`. Para pré-estreia: `PreSaleGameHighlight` com `preSaleGameId` (mesma estrutura).
- **APIs:** GET público + CRUD admin para highlights por jogo (e, se houver, por pré-estreia).
- **Admin:** Inserir/editar/excluir cortes **no próprio formulário** de criar/editar jogo (e, se desejado, no formulário de pré-estreia), em seção recolhível ou com "Adicionar corte" em modal — avaliado positivamente.
- **Front:** Seção abaixo do player com cards de cortes; clique abre player (modal ou página).

Com isso, você tem um plano claro para implementar a área de cortes e melhores momentos nos jogos.
