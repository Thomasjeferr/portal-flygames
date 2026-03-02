# Súmulas: análise e inclusão de gols por pênaltis

Documento que descreve **onde** as informações de súmula aparecem (admin, painel do time, página pública), **o que existe hoje** e **o que falta** para poder inserir e exibir **gols marcados por pênaltis**.

---

## 1. Onde a súmula aparece

| Local | Rota / origem | O que mostra |
|-------|----------------|--------------|
| **Admin** | `/admin/sumulas` → lista de jogos → `/admin/sumulas/[gameId]` | Formulário para preencher/editar: **placar** (mandante x visitante) e **por jogador**: G, A, F (faltas), Amarelo, Vermelho, Destaque. Salva via PATCH `/api/admin/sumulas/games/[gameId]`. |
| **Painel do time** (aprovar/rejeitar) | `/painel-time/times/[id]/sumulas` → lista → `/painel-time/times/[id]/sumulas/[gameId]` | Dados do jogo, **placar**, status das aprovações, botões Aprovar/Rejeitar e tabela **por jogador**: Jogador, G, A, Amarelo, Vermelho, Destaque (sem coluna F). Dados vêm de GET `/api/team-portal/teams/[id]/games/[gameId]`. |
| **Página pública** | `/resultados` (lista) → `/resultados/[slug]` (detalhe) + dropdown “Súmula” | Placar e tabela **por jogador**: Foto, Jogador, G, A, Amarelo, Vermelho, Destaque. Dados do dropdown vêm de GET `/api/resultados/[slug]/sumula`. |

---

## 2. Modelo de dados atual

### Game (jogo)

- **homeScore**, **awayScore**: placar total (gols do mandante e do visitante).
- **Não existe** hoje: `homePenaltyGoals`, `awayPenaltyGoals` nem “resultado da disputa de pênaltis” (isso existe só em **TournamentMatch**: `penaltiesA`, `penaltiesB`).

### PlayerMatchStats (estatísticas do jogador na partida)

| Campo       | Uso atual |
|------------|-----------|
| goals      | Total de gols do jogador na partida |
| assists    | Assistências |
| fouls      | Faltas (admin preenche; painel e público não exibem) |
| yellowCard | Cartão amarelo |
| redCard    | Cartão vermelho |
| highlight  | Destaque da partida |

**Não existe** hoje: `penaltyGoals` (gols marcados em cobranças de pênalti durante o jogo).

---

## 3. O que cada tela usa hoje

### 3.1 Admin – preencher súmula

- **Arquivo:** `src/app/admin/(dashboard)/sumulas/[gameId]/page.tsx`
- **API GET:** `GET /api/admin/sumulas/games/[gameId]` → retorna `homeScore`, `awayScore`, `homeStats[]`, `awayStats[]` (cada stat: `teamMemberId`, `goals`, `assists`, `fouls`, `yellowCard`, `redCard`, `highlight`).
- **API PATCH:** envia `homeScore`, `awayScore`, `homeStats`, `awayStats` com os mesmos campos.
- **Formulário:** inputs para placar; por jogador: **G**, **A**, **F**, Amarelo, Vermelho, Destaque. **Nada de “gols de pênalti”.**

### 3.2 Painel do time – aprovar/rejeitar

- **Arquivo:** `src/app/painel-time/times/[id]/sumulas/[gameId]/page.tsx`
- **API:** `GET /api/team-portal/teams/[id]/games/[gameId]` → retorna `homeScore`, `awayScore`, `homeStats`, `awayStats` (cada um: `goals`, `assists`, `yellowCard`, `redCard`, `highlight` + dados do jogador). **F (faltas)** não é exibido na tabela; **gols de pênalti** não existem.
- **Tabela:** Jogador, **G**, **A**, Amarelo, Vermelho, Destaque.

### 3.3 Página pública – resultados e súmula

- **Lista:** `src/app/resultados/page.tsx` + `ResultadosList` → jogos com súmula aprovada; mostra placar (homeScore x awayScore).
- **Detalhe:** `src/app/resultados/[slug]/page.tsx` → placar e, quando há stats, tabelas por time com: Jogador, **G**, **A**, Amarelo, Vermelho, Destaque (e em `resultados/[slug]` usa dados do próprio page, não do dropdown).
- **Dropdown “Súmula”:** `MatchSummaryDropdown` chama `GET /api/resultados/[slug]/sumula` → `stats.home` e `stats.away` com `goals`, `assists`, `yellow`, `red`, `highlight`. **Sem gols de pênalti.**

---

## 4. O que falta para “gols marcados por pênaltis”

Hoje **não há** em nenhum lugar:

- Campo para o **admin** informar quantos gols de cada jogador foram **de pênalti**.
- Exibição de **gols de pênalti** na tela do time (aprovar/rejeitar) nem na página pública.

Duas abordagens possíveis:

### Opção A – Só por jogador (recomendada para súmula)

- **No modelo:** em **PlayerMatchStats** adicionar `penaltyGoals Int @default(0)` (quantidade de gols do jogador que foram de pênalti).
- **Regra:** `penaltyGoals <= goals` (não pode ter mais gols de pênalti do que gols totais).
- **Admin:** nova coluna na tabela de stats, ex.: **“G pên.”** ou **“Pên.”**, com input numérico por jogador; incluir `penaltyGoals` no payload do PATCH e no GET da súmula.
- **Painel do time:** na tabela de estatísticas, exibir uma coluna **“G pên.”** (ou texto tipo “G (X pên.)”).
- **Página pública:** mesma coluna ou mesmo texto na tabela da súmula e no dropdown.

Assim você **insere** gols por pênaltis no admin e **apresenta** nos três contextos (admin, time, público).

### Opção B – Também no placar do jogo (opcional)

- **No modelo:** em **Game** adicionar, por exemplo, `homePenaltyGoals Int?` e `awayPenaltyGoals Int?` (totais de gols de pênalti do time no jogo).
- **Uso:** exibir ao lado do placar algo como “3 x 2 (1 x 0 de pênaltis)”.
- **Admin:** dois campos extras no formulário (totais por time); podem ser preenchidos à mão ou, no futuro, derivados da soma de `PlayerMatchStats.penaltyGoals` por time.

Se quiser só “quem fez gol de pênalti” na súmula, a **Opção A** basta. Se quiser também destacar o **total de gols de pênalti por time** no placar, aí entra a Opção B.

---

## 5. Resumo

| Onde | Placar | Por jogador | Gols de pênalti hoje? |
|------|--------|-------------|------------------------|
| Admin (preencher) | homeScore x awayScore | G, A, F, Amarelo, Vermelho, Destaque | **Não** – não há campo nem na API nem no formulário. |
| Painel do time (aprovar) | homeScore x awayScore | G, A, Amarelo, Vermelho, Destaque | **Não** – não existe no modelo nem na API. |
| Página pública | homeScore x awayScore | G, A, Amarelo, Vermelho, Destaque | **Não** – não existe no modelo nem na API. |

Para **poder inserir gols por pênaltis** e **mostrar** nos três lugares:

1. Adicionar em **PlayerMatchStats** o campo **penaltyGoals** (inteiro, default 0).
2. Incluir **penaltyGoals** no GET e no PATCH da súmula no admin (`/api/admin/sumulas/games/[gameId]`).
3. No **admin**: nova coluna “G pên.” (ou “Pên.”) no formulário de stats e envio no PATCH.
4. Na **API do painel do time** (`/api/team-portal/teams/[id]/games/[gameId]`): retornar `penaltyGoals` em cada stat.
5. Na **API pública** (`/api/resultados/[slug]/sumula`): retornar `penaltyGoals` em cada jogador de `stats.home` e `stats.away`.
6. No **painel do time** (página de aprovar súmula): exibir coluna “G pên.” (ou “G (X pên.)”).
7. Na **página pública** (detalhe do resultado + dropdown): exibir a mesma informação.

Se quiser, o próximo passo é implementar a **Opção A** (campo `penaltyGoals` em PlayerMatchStats + alterações nas APIs e telas acima) e, opcionalmente, a **Opção B** (totais no Game) em seguida.
