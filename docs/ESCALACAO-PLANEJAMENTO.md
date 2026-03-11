# Planejamento – Módulo Escalação (Modelo 1)

## Objetivo
Permitir que o time monte a escalação de forma visual: lista de jogadores à esquerda (drag) e campo com posições táticas à direita (drop). Salvar para uso futuro (overlay, pré-jogo).

## Análise do que já existe (não quebrar)

### Rotas e layout
- **Layout do time:** `src/app/painel-time/times/[id]/layout.tsx`
  - Usa `getTeamAccess(teamId)` para autorização.
  - Menu: Comissões, Elenco, Súmulas, Dados do time, Patrocinadores, Campeonatos.
  - Estilo: `max-w-4xl mx-auto`, link "← Voltar ao painel", crest + nome do time.
- **Elenco:** `src/app/painel-time/times/[id]/elenco/page.tsx` (client)
  - GET `/api/team-portal/teams/[id]/members` para lista de membros.
  - Não alterar: cadastro de jogadores permanece só no Elenco.

### Dados
- **TeamMember:** id, teamId, name, role, number, position, photoUrl, isActive.
- **Roles de jogadores:** PLAYER, GOALKEEPER, ATLETA (comissão: PRESIDENTE, TREINADOR, etc.).
- **API members:** GET (lista), POST (criar), PATCH (editar), DELETE. Usar apenas GET para Escalação.

### Autenticação
- `getTeamAccess(teamId)` em `src/lib/team-portal-auth.ts` (TeamManager).

## Escolhas de implementação

### 1. Nova rota
- **Página:** `src/app/painel-time/times/[id]/escalacao/page.tsx` (client).
- **Menu:** Adicionar link "Escalação" no `layout.tsx` do time (entre Elenco e Súmulas).

### 2. Persistência da escalação
- **Modelo:** `TeamLineupSlot` (nova tabela).
  - `teamId` (FK Team), `teamMemberId` (FK TeamMember), `tacticalPosition` (GOL | ZAG | LAT | VOL | MEI | ATA), `order` (int, para ordem dentro da posição).
  - Um jogador só pode estar em uma posição por vez (único por teamId + teamMemberId).
  - Ao salvar: substituir todos os slots do time pelos atuais (delete + insert).
- **API:** 
  - `GET /api/team-portal/teams/[id]/lineup` → retorna `{ slots: { tacticalPosition, order, teamMemberId }[] }`.
  - `POST /api/team-portal/teams/[id]/lineup` → body `{ slots: { teamMemberId, tacticalPosition, order }[] }` → substitui slots do time.

### 3. UI (modelo 1 – campo clássico)
- **Coluna esquerda:** Lista de jogadores do elenco (foto, nome, posição, número). Filtrar por role in [PLAYER, GOALKEEPER, ATLETA] e isActive. Ordenação por nome. Itens arrastáveis (HTML5 drag and drop).
- **Coluna direita:** Campo estilizado com 6 zonas táticas: GOL, ZAG, LAT, VOL, MEI, ATA. Cada zona é área de drop. Dentro da zona: chips dos jogadores (foto, nome, posição). Permitir arrastar da lista para o campo e, opcionalmente, entre zonas ou de volta para a lista.
- **Botão:** "Salvar escalação" (verde, FlyGames). Ao salvar, chamar POST lineup e mostrar feedback.
- **Estilo:** Mesma identidade da página de Elenco: `bg-futvar-dark`, `border-white/10`, `rounded-xl`, `text-futvar-light`, `bg-futvar-green`, etc. Campo com fundo verde (futvar-field) e linhas discretas (field-pattern se existir).

### 4. Drag and drop
- Usar HTML5 Drag and Drop (sem nova dependência). Arrastar jogador da lista para uma zona; ao soltar, adicionar à zona e remover da lista (ou manter cópia na lista e mostrar “no campo” com indicador). Ao salvar, enviar apenas os que estão no campo.
- Alternativa simples: lista sempre mostra todos; no campo, mostrar apenas os que foram colocados. Um mesmo jogador não pode estar em duas zonas (ao soltar em nova zona, move).

### 5. O que não fazer
- Não alterar `TeamMember` nem o fluxo de cadastro em Elenco.
- Não alterar API de members além do uso read-only.
- Não alterar layout geral do painel (apenas adicionar um link no menu).

## Arquivos a criar/alterar

| Ação | Arquivo |
|------|--------|
| Criar | `docs/ESCALACAO-PLANEJAMENTO.md` (este) |
| Alterar | `prisma/schema.prisma` (model TeamLineupSlot + relação Team, TeamMember) |
| Criar | `prisma/migrations/XXXXXX_add_team_lineup_slot/migration.sql` |
| Criar | `src/app/api/team-portal/teams/[id]/lineup/route.ts` (GET + POST) |
| Alterar | `src/app/painel-time/times/[id]/layout.tsx` (link Escalação) |
| Criar | `src/app/painel-time/times/[id]/escalacao/page.tsx` (página client com 2 colunas + drag-and-drop + Salvar) |

## Ordem de implementação
1. Schema + migration.
2. API lineup (GET/POST).
3. Link no layout.
4. Página Escalação (lista + campo + DnD + salvar).
