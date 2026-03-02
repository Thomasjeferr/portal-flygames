# Raio-X: Funções de Súmula (pré-deploy)

Resumo do estado atual do fluxo de súmula no projeto.

---

## Modelos (Prisma)

| Modelo | Uso |
|--------|-----|
| **Game** | `sumulaPublishedAt`: quando o admin publicou a súmula para os times. |
| **GameSumulaApproval** | Uma linha por (gameId, teamId). `status`: PENDENTE \| APROVADA \| REJEITADA; `rejectionReason`, `rejectedAt`, `approvedAt`. |
| **PlayerMatchStats** | Estatísticas por jogador na partida: `goals`, `assists`, `fouls`, `yellowCard`, `redCard`, `highlight`. Relaciona `game`, `team`, `teamMember`. |

---

## Fluxo resumido

1. **Admin** preenche a súmula em `/admin/sumulas` → escolhe jogo → `/admin/sumulas/[gameId]`: placar (home/away) e stats por jogador (mandante e visitante). Ao salvar (PATCH), grava `Game.homeScore`/`awayScore`, `PlayerMatchStats` (replace), `sumulaPublishedAt = now()` e **reseta** as duas aprovações para PENDENTE. Envia e-mail (SUMULA_DISPONIVEL ou SUMULA_ATUALIZADA) para os responsáveis dos dois times.
2. **Times** (painel do time) veem a lista em `/painel-time/times/[id]/sumulas` e o detalhe em `.../sumulas/[gameId]`: podem **Aprovar** ou **Rejeitar** (com motivo). Ao aprovar/rejeitar, são enviados e-mails (SUMULA_OUTRO_APROVOU, SUMULA_OUTRO_REJEITOU, SUMULA_APROVADA_AMBOS quando ambos aprovam).
3. **Público (resultados)** só vê súmula quando: `sumulaPublishedAt` preenchido **e** as duas aprovações com status APROVADA. Lista em `/resultados` (jogos com 2 aprovações + sumulaPublishedAt). Detalhe em `/resultados/[slug]`; o dropdown “Súmula” chama `GET /api/resultados/[slug]/sumula` e exibe placar + stats (G, A, amarelo, vermelho, destaque).

---

## APIs

| Método / Rota | Quem | Função |
|----------------|------|--------|
| **GET** `/api/admin/sumulas/games` | Admin | Lista todos os jogos com home/away, placar, `sumulaPublishedAt`, `sumulaApprovals`. |
| **GET** `/api/admin/sumulas/games/[gameId]` | Admin | Jogo com elencos (members ativos), `playerMatchStats` atuais, `sumulaApprovals`. Para preencher/editar súmula. |
| **PATCH** `/api/admin/sumulas/games/[gameId]` | Admin | Body: `homeScore`, `awayScore`, `homeStats[]`, `awayStats[]` (cada item: teamMemberId, goals, assists, fouls, yellowCard, redCard, highlight). Atualiza placar, substitui stats, seta `sumulaPublishedAt`, reseta aprovações para PENDENTE, envia e-mail. |
| **GET** `/api/team-portal/teams/[id]/games` | Time (acesso ao time) | Lista jogos do time com `sumulaPublishedAt` e status da aprovação do time. |
| **GET** `/api/team-portal/teams/[id]/games/[gameId]` | Time | Detalhe do jogo: placar, stats (home/away), `myApprovalStatus`, `otherTeamApproved`, `bothApproved`, motivos de rejeição. |
| **POST** `/api/team-portal/teams/[id]/games/[gameId]/approve` | Time | Marca aprovação do time como APROVADA. Dispara e-mails (outro aprovou / ambos aprovaram). |
| **POST** `/api/team-portal/teams/[id]/games/[gameId]/reject` | Time | Body: `{ reason }`. Marca aprovação como REJEITADA, grava motivo. Dispara e-mail (outro rejeitou). |
| **GET** `/api/resultados/[slug]/sumula` | Público | Retorna súmula **somente** se `sumulaPublishedAt` existe e as 2 aprovações são APROVADA. Retorna placar, times, stats (home/away) com id, name, photoUrl, goals, assists, yellow, red, highlight. |

---

## Páginas (UI)

| Página | Função |
|--------|--------|
| `/admin/sumulas` | Lista de jogos; link para cada `/admin/sumulas/[gameId]`. |
| `/admin/sumulas/[gameId]` | Formulário: placar, tabela de stats por jogador (mandante e visitante), salvar. Volta para lista. |
| `/painel-time/times/[id]/sumulas` | Lista de jogos do time com link para detalhe. |
| `/painel-time/times/[id]/sumulas/[gameId]` | Detalhe: título, data, campeonato, placar, status das aprovações, botões Aprovar / Rejeitar (se ainda não aprovou), exibição de stats e motivos de rejeição. |
| `/resultados` | Lista apenas jogos com súmula publicada e **duas aprovações**. Exige login (senão CTA cadastro/entrar). |
| `/resultados/[slug]` | Página do jogo com dropdown que carrega súmula via `MatchSummaryDropdown` → `GET /api/resultados/[slug]/sumula`. |

---

## E-mails (templates)

- **SUMULA_DISPONIVEL** – Admin publicou pela primeira vez. Vars: `title`, `painel_url`.
- **SUMULA_ATUALIZADA** – Admin atualizou súmula já publicada. Vars: `title`, `painel_url`.
- **SUMULA_OUTRO_APROVOU** – O outro time aprovou. Vars: `title`, `approving_team_name`, `painel_url`.
- **SUMULA_OUTRO_REJEITOU** – O outro time rejeitou. Vars: `title`, `rejecting_team_name`, `rejection_reason`, `painel_url`.
- **SUMULA_APROVADA_AMBOS** – Os dois aprovaram. Vars: `title`, `resultados_url`.

Envio: em `src/app/api/admin/sumulas/games/[gameId]/route.ts` (PATCH) e em `approve`/`reject` do team-portal.

---

## Pontos de atenção para deploy

1. **Jogo sem mandante/visitante**: PATCH da súmula retorna 400 (“Jogo precisa ter mandante e visitante”). Garantir que jogos que entram no fluxo de súmula tenham `homeTeamId` e `awayTeamId` preenchidos.
2. **Resultados**: Lista em `/resultados` usa `getApprovedSumulaGames()` (groupBy por gameId com 2 aprovações APROVADA + `sumulaPublishedAt` não nulo). Página do jogo e dropdown dependem da mesma regra na API pública.
3. **Stats**: Admin envia `fouls`; a API pública de resultados **não** expõe `fouls` no JSON (apenas goals, assists, yellow, red, highlight). Tela pública não mostra faltas; painel do time e admin sim (admin usa fouls no schema, painel exibe G, A, amarelo, vermelho, destaque).
4. **Sidebar admin**: Link “Súmula” em `AdminSidebar` aponta para `/admin/sumulas`.

---

## Conclusão

O fluxo está fechado: admin publica/atualiza súmula → times aprovam/rejeitam → quando ambos aprovam, a súmula fica visível em `/resultados` e no dropdown da página do jogo. APIs e páginas estão alinhadas com o schema (Game, GameSumulaApproval, PlayerMatchStats) e com os templates de e-mail documentados em `docs/EMAILS-SUMULA-TEMPLATES.md`.
