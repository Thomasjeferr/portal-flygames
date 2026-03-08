# Status da implementação – Comentários, curtidas e compartilhamento nos players

## ✅ Já implementado

### Schema e banco
- **Prisma:** `Game.shareCount`, `Live.shareCount`; modelos `GameLike`, `LiveLike`, `GameComment`, `LiveComment` com status (pending/approved/rejected) e reviewedAt/reviewedBy.
- **Migração:** `20260327100000_player_engagement_share_likes_comments` (tabelas e colunas).

### APIs públicas (player)
- **POST** `/api/games/[gameId]/share` – incrementa contador de compartilhamentos.
- **GET/POST** `/api/games/[gameId]/likes` – contagem e toggle de curtida.
- **GET/POST** `/api/games/[gameId]/comments` – lista aprovados (paginado) e criar (status pending).
- **POST** `/api/lives/[liveId]/share` – incrementa contador.
- **GET/POST** `/api/lives/[liveId]/likes` – contagem e toggle.
- **GET/POST** `/api/lives/[liveId]/comments` – lista e criar.

### Componentes no player
- **PlayerEngagement** – barra com Compartilhar + Curtir e seção de comentários.
- **PlayerShareButton** – Web Share / copiar link + callback para POST share.
- **PlayerLikeButton** – contador + toggle curtir.
- **PlayerCommentSection** – campo enviar + lista de comentários aprovados.

### Uso nas páginas
- **Jogo** (`/jogo/[slug]`): `PlayerEngagement` exibido quando o usuário tem acesso ao vídeo.
- **Live** (`/live/[id]`): `PlayerEngagement` exibido quando pode assistir.

### Admin
- **Menu:** item "Comentários" em `/admin/comentarios`.
- **Página Comentários:** filtros (tipo: Jogo/Live, status: Pendentes/Aprovados/Rejeitados), tabela com data, usuário, conteúdo, status, ações Aprovar/Rejeitar.
- **API admin:** `GET /api/admin/comments` (filtros), `PATCH /api/admin/comments/[id]` (status + entityType).
- **Lista de jogos** (`/admin/jogos`): exibe "X compartilhamentos" quando shareCount > 0.
- **Lista de lives** (`/admin/lives`): exibe "X compartilhamentos" quando shareCount > 0.
- **GET /api/admin/games/[id]:** retorna `shareCount`, `_count: { gameLikes, gameComments }`, `pendingComments`.
- **GET /api/admin/lives/[id]:** retorna `shareCount`, `_count: { liveLikes, liveComments }`, `pendingComments`.
- **Bloco Engajamento** nas páginas de edição:
  - **`/admin/jogos/[id]/editar`** – card com compartilhamentos, curtidas, comentários (total e pendentes) e link "Ver comentários" para Comentários filtrado por esse jogo.
  - **`/admin/lives/[id]/editar`** – mesmo card para a live, com link para Comentários filtrado por liveId.

---

## ⏳ Opcional (não no plano original)

- Badge "X pendentes" ao lado de "Comentários" no menu do admin (a página já busca o total de pendentes; só falta exibir no sidebar).
