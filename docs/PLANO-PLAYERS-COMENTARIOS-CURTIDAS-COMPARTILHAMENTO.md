# Plano: Comentários, curtidas e compartilhamento nos players de vídeo

## Desenho da área do player e do admin

- **Como fica na área do player:** abaixo do vídeo, uma barra com botão **Compartilhar** e **Curtir** (com contador); em seguida a seção **Comentários** (campo para escrever + lista de comentários aprovados).  
  Ver desenho: `assets/player-area-layout.png`

- **Onde fica no admin:**  
  - **Comentários:** nova página **Comentários** no menu do admin (`/admin/comentarios`), com filtros (tipo, status) e ações Aprovar/Rejeitar; opcional resumo na edição de cada jogo/live.  
  - **Compartilhamentos (e engajamento):** nas listas de **Jogos** e **Lives**, coluna "Compartilhamentos"; na **edição** de cada jogo e de cada live, bloco **Engajamento** (compartilhamentos, curtidas, comentários total e pendentes).  
  Ver desenho: `assets/admin-comentarios-share-placement.png`

---

## 1. Escopo: onde o usuário assiste

São as **páginas do player de vídeo** onde o torcedor assiste aos jogos:

| Página | Rota | Conteúdo |
|--------|------|----------|
| **Jogo (replay)** | `/jogo/[slug]` | Vídeo do jogo + cabeçalho (times, placar) + “Você também pode gostar”. Player: `VideoPlayer` → `VideoPlayerCard` ou `StreamCustomPlayer`. |
| **Live** | `/live/[id]` | Transmissão ao vivo ou replay da live. Player: `StreamCustomPlayer`. |
| **Pré-estreia** | `/pre-estreia/assistir/[slug]` | Assistir pré-estreia (já tem `PreSaleShareButton` em outro contexto). |

Hoje **não há** na área do player:
- **Comentários** (sobre o jogo/transmissão enquanto assiste).
- **Curtidas** (“X curtiram este jogo / esta live”).
- **Compartilhamento** na página do jogo ou da live (só existe share na pré-estreia).

A ideia é oferecer **comentários, curtidas e compartilhamento** nessas telas de **reprodução de vídeo**, abaixo ou ao lado do player.

---

## 2. Onde colocar na UI

- **Abaixo do player** (e do cabeçalho do jogo/live): uma barra ou seção com:
  - **Compartilhar** – botão “Compartilhar” (link da página atual).
  - **Curtir** – contador + botão “Curtir” / “Descurtir”.
- **Comentários** – seção “Comentários” logo abaixo (lista + campo para novo comentário).

Tudo **fora** do iframe/player (na página), para não interferir no vídeo. Quem não está logado pode ver contador de curtidas e comentários; para curtir e comentar, exige login.

---

## 3. Sugestões por funcionalidade

### 3.1 Compartilhamento (prioridade alta – mais simples)

- **Onde:** `/jogo/[slug]` e `/live/[id]` (e, se quiser, `/pre-estreia/assistir/[slug]`).
- **Como:** Botão “Compartilhar” reutilizando a lógica do `PreSaleShareButton`:
  - Web Share API no mobile (título + texto + URL).
  - Fallback: copiar link + “Link copiado!”.
- **Texto sugerido:**
  - Jogo: `Assista: [Time A] x [Time B] – [titulo]. [URL]`
  - Live: `Ao vivo: [titulo]. [URL]`
- **Implementação:** Componente genérico `ShareButton` (título, texto, url) e uso nas páginas do jogo e da live. Ao compartilhar (Web Share ou copiar link), chamar **POST /api/games/[id]/share** ou **POST /api/lives/[id]/share** para registrar a contagem (ver seção 7).

### 3.2 Curtidas (prioridade média)

- **Onde:** Na mesma área (abaixo do player) em `/jogo/[slug]` e `/live/[id]`.
- **Regras:** Apenas logado; uma curtida por usuário por jogo e por live.
- **Modelo de dados:**
  - **Jogo:** tabela `GameLike`: `id`, `gameId`, `userId`, `createdAt`; único `(gameId, userId)`.
  - **Live:** tabela `LiveLike`: `id`, `liveId`, `userId`, `createdAt`; único `(liveId, userId)`.
- **API:**
  - Jogo: `GET /api/games/[gameId]/likes` → `{ count, userLiked }`; `POST /api/games/[gameId]/likes` (toggle).
  - Live: `GET /api/lives/[liveId]/likes` → `{ count, userLiked }`; `POST /api/lives/[liveId]/likes` (toggle).
- **UI:** Ícone de coração + número; estado “curtido” ou “não curtido”; opcional animação ao curtir.

### 3.3 Comentários (prioridade média–alta)

- **Onde:** Seção “Comentários” abaixo da barra de compartilhar/curtir, na página do jogo e da live.
- **Regras:** Apenas logado; texto com limite (ex.: 500 caracteres); moderação a definir (aprovado antes ou exibir na hora com denúncia).
- **Modelo de dados:**
  - **Jogo:** tabela `GameComment`: `id`, `gameId`, `userId`, `body`, `createdAt`, opcional `status`.
  - **Live:** tabela `LiveComment`: `id`, `liveId`, `userId`, `body`, `createdAt`, opcional `status`.
  - Opcional: `parentId` para respostas.
- **API:**
  - Jogo: `GET /api/games/[gameId]/comments` (paginado); `POST /api/games/[gameId]/comments`.
  - Live: `GET /api/lives/[liveId]/comments` (paginado); `POST /api/lives/[liveId]/comments`.
- **UI:** Campo de texto + “Enviar”; lista com nome (ou “Torcedor”), data e corpo; opcional “Responder”.

---

## 4. Plano de introdução em fases

| Fase | Entregável | Onde |
|------|------------|------|
| **1** | Botão **Compartilhar** abaixo do player | `/jogo/[slug]` e `/live/[id]` |
| **2** | **Curtidas** (tabela + API + UI) | Jogo e Live |
| **3** | **Comentários** (tabela + API + seção na página) | Jogo e Live |
| **4** | (Opcional) Compartilhar na pré-estreia assistir, se ainda não tiver | `/pre-estreia/assistir/[slug]` |

Recomendação: começar pela **Fase 1** (compartilhamento nas páginas de jogo e live), depois **Fases 2 e 3** para engajamento no player de vídeo.

---

## 5. Resumo técnico

- **Compartilhamento:** Componente `ShareButton` reutilizável; inclusão na página do jogo e da live; sem backend.
- **Curtidas:** Novas tabelas `GameLike` e `LiveLike`; rotas em `/api/games/[gameId]/likes` e `/api/lives/[liveId]/likes`; bloco de UI abaixo do player.
- **Comentários:** Novas tabelas `GameComment` e `LiveComment`; rotas em `/api/games/[gameId]/comments` e `/api/lives/[liveId]/comments`; seção “Comentários” abaixo do player com lista e formulário.
- **Moderação:** Definir se comentários passam por aprovação ou saem na hora com denúncia (e lista no admin).

---

## 6. Controle no admin: aprovação de comentários

### 6.1 Fluxo de comentários

- Comentário criado pelo usuário → **status inicial:** `pending` (pendente de aprovação).
- No front (player), a **lista pública** de comentários exibe só os com `status = approved`.
- Admin **aprova** ou **rejeita** cada comentário; ao rejeitar, o comentário não aparece para ninguém (ou pode ter status `rejected` para histórico).

### 6.2 Modelo de dados dos comentários (com moderação)

- **GameComment:** `id`, `gameId`, `userId`, `body`, `status` (`pending` | `approved` | `rejected`), `createdAt`, `reviewedAt` (opcional), `reviewedBy` (opcional, admin userId).
- **LiveComment:** idem com `liveId` em vez de `gameId`.
- Incluir relação com **User** para exibir no admin: e-mail e nome de quem comentou.

### 6.3 Onde colocar no admin

**Opção A – Página central “Comentários” (recomendada)**  
- Nova rota: **`/admin/comentarios`**.
- Lista todos os comentários (jogos + lives) com filtros:
  - **Tipo:** Jogo | Live
  - **Status:** Pendentes | Aprovados | Rejeitados
  - Opcional: buscar por jogo/live (slug ou título) ou por usuário (e-mail/nome).
- Colunas: data, **usuário** (nome/e-mail), tipo (Jogo/Live), **conteúdo** (título do jogo ou da live + trecho do comentário), **status**, ações.
- Ações por comentário: **Aprovar** | **Rejeitar** (e, se quiser, “Excluir” que apaga o registro).
- Ao aprovar/rejeitar: PATCH na API atualiza `status`, `reviewedAt`, `reviewedBy`.

**Opção B – Dentro de cada jogo e cada live**  
- Em **`/admin/jogos/[id]/editar`**: aba ou seção **“Comentários”** listando só comentários daquele jogo, com aprovar/rejeitar.
- Em **`/admin/lives/[id]/editar`**: idem para comentários daquela live.
- Ver ver ver quantos pendentes por jogo/live na listagem (ex.: badge “3 pendentes”).

**Sugestão:** ter as duas: página central **Comentários** para moderação em lote e, nas telas de edição do jogo e da live, um resumo (total, pendentes) + link “Ver todos os comentários” para a página central filtrada.

### 6.4 API admin para comentários

- **GET** `/api/admin/comments`  
  - Query: `?type=game|live`, `status=pending|approved|rejected`, `gameId=`, `liveId=`, `page=`, `limit=`.  
  - Retorno: lista de comentários com `game` ou `live` (id, título, slug), `user` (id, name, email), `body`, `status`, `createdAt`, `reviewedAt`.
- **PATCH** `/api/admin/comments/[id]`  
  - Body: `{ status: 'approved' | 'rejected' }`.  
  - Atualiza o comentário e preenche `reviewedAt`, `reviewedBy` (session.userId).
- Opcional: **DELETE** `/api/admin/comments/[id]` para remover definitivamente.

---

## 7. Contagem de compartilhamentos no admin

### 7.1 Como registrar o compartilhamento

- Hoje o compartilhamento é só no cliente (Web Share ou copiar link). Para **saber quantos compartilhamentos**, é preciso registrar no backend quando o usuário clica em “Compartilhar”.
- No componente **ShareButton**: após disparar o share (Web Share ou copiar), chamar uma API que incrementa o contador, por exemplo:
  - **POST** `/api/games/[gameId]/share` (sem body ou com `{ method: 'web_share' | 'copy' }`).
  - **POST** `/api/lives/[liveId]/share` (idem).
- Não é obrigatório estar logado para contar (qualquer clique em “Compartilhar” pode somar). Se quiser métrica por usuário, pode enviar `userId` quando houver sessão.

### 7.2 Modelo de dados

**Opção simples (recomendada):**  
- No **Game:** campo `shareCount` (Int, default 0).  
- No **Live:** campo `shareCount` (Int, default 0).  
- Cada POST em `/api/.../share` faz um incremento no contador (ex.: `UPDATE Game SET share_count = share_count + 1 WHERE id = ?`).

**Opção com histórico:**  
- Tabela **GameShare** / **LiveShare:** `id`, `gameId` ou `liveId`, `userId` (nullable), `createdAt`, opcional `method` (‘web_share’ | ‘copy’).  
- Contagem = `COUNT(*)` por jogo/live. Permite relatórios por período ou por usuário, ao custo de mais armazenamento.

### 7.3 Onde exibir no admin

- **Lista de jogos** (`/admin/jogos`): coluna **“Compartilhamentos”** com o número (e opcional ordenação por mais compartilhados).
- **Lista de lives** (`/admin/lives`): coluna **“Compartilhamentos”** idem.
- **Editar jogo** (`/admin/jogos/[id]/editar`): bloco ou card **“Engajamento”** com totais: compartilhamentos, curtidas (quando existir), comentários (total e pendentes).
- **Editar live** (`/admin/lives/[id]/editar`): mesmo bloco “Engajamento”.

Assim você tem **controle de aprovação de comentários** (quem comentou, aprovar/rejeitar) e **quantos compartilhamentos** por jogo e por live no admin.

Se quiser, na próxima etapa podemos implementar só a **Fase 1** (compartilhamento + contagem nas páginas do player de jogo e live).
