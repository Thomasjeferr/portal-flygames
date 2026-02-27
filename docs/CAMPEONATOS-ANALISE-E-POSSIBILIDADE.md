# Análise: Área de Campeonatos e Integração com o Sistema

Este documento analisa o sistema atual e a possibilidade de implementar uma área para **criar e administrar campeonatos**, casando com o que já existe no portal.

---

## 1. Estado atual: como “campeonato” aparece hoje

### 1.1 Dados no banco

- **Game** possui o campo **`championship`** (String, obrigatório). É um **texto livre**: o admin digita o nome do campeonato ao cadastrar ou editar o jogo (ex.: "Campeonato Municipal", "Copa XYZ").
- Não existe tabela **Campeonato** nem entidade relacionada. Não há vínculo de jogo com um “campeonato” reutilizável.

### 1.2 Category (categoria)

- Existe o model **Category** (id, name, slug, order, active).
- **Game** tem **`categoryId`** opcional (FK para Category).
- **Uso atual**: na **home**, as faixas “Jogos por campeonato” agrupam jogos pela **categoria** (categoryId), não pelo texto `championship`. O nome da categoria vira o título da seção. Pré-estreias publicadas também podem estar vinculadas a uma categoria para a grade.

Ou seja:

- **Category** = agrupamento na home e no catálogo (uma “gaveta” de jogos).
- **championship** (string) = rótulo por jogo, exibido em cards, resultados, súmula e filtros, digitado à mão em cada jogo.

### 1.3 Onde o “campeonato” é usado

| Local | Fonte | Uso |
|-------|--------|-----|
| Admin – Novo/Editar jogo | Campo texto `championship` | Digitação livre |
| Admin – Lista de jogos | `game.championship` | Exibição em lista |
| Admin – Súmulas | `game.championship` | Listagem de jogos |
| Home – Faixas “Jogos por campeonato” | **Category** (não championship) | Agrupa por categoria; título = category.name |
| Página pública /jogos | `distinct championship` dos jogos | Filtro “Todos os campeonatos” |
| Resultados aprovados / detalhe do jogo | `game.championship` | Exibição (ex.: “Campeonato Municipal – 26/02/2026”) |
| Súmula (dropdown) | `competitionName` = `game.championship` | Título da competição |

Conclusão: hoje não há “cadastro de campeonatos”; há apenas texto livre por jogo e categorias para organização na home.

---

## 2. Objetivo da área de campeonatos

- **Criar** campeonatos (nome, slug, ano, logo, descrição, ativo, ordem, etc.).
- **Administrar** (listar, editar, desativar, ordenar).
- **Vincular jogos** a um campeonato escolhido em um dropdown (em vez de digitar texto).
- **Manter compatibilidade** com home, catálogo, resultados e súmula.

---

## 3. Opções de desenho

### Opção A – Nova entidade Championship (recomendada)

- Criar model **Championship** (ex.: id, name, slug, shortName, year?, logoUrl?, description?, order, active, createdAt, updatedAt).
- **Game** ganha **`championshipId`** (FK opcional) e mantém **`championship`** (string) por um tempo para migração e fallback.
- **Admin**:
  - Nova seção **“Campeonatos”**: listagem, novo, editar, excluir (com checagem: só se nenhum jogo vinculado, ou reassociação).
  - Em **Jogos (novo/editar)**: dropdown “Campeonato” com lista de campeonatos ativos; opcionalmente “Outro (livre)” que preenche `championship` e deixa `championshipId` null.
- **Exibição**: onde hoje se usa `game.championship`, passar a usar `game.championship?.name ?? game.championship` (string legada) para não quebrar nada.
- **Home**: pode continuar agrupando por **Category** como hoje; ou, em uma segunda fase, agrupar por **Championship** (e usar Championship.name como título da faixa).
- **Página /jogos**: filtro de campeonato pode vir da tabela Championship + valores distintos legados de `championship` (para jogos sem championshipId).

**Vantagens**: modelo claro, um lugar único para nome/logo/ano do campeonato, evita digitação errada e duplicada. **Desvantagem**: migração e ajustes em vários pontos (admin + exibição).

### Opção B – Reaproveitar Category como “Campeonato”

- Tratar **Category** como “campeonato” (ou renomear no admin para “Campeonatos”).
- Adicionar em **Category** campos úteis (ex.: year, logoUrl, description).
- **Game** já tem **categoryId**; passar a usar Category também como “campeonato” na exibição (em vez do texto `championship`).
- **Admin**: menu “Categorias” vira (ou ganha submenu) “Campeonatos”; CRUD de categorias já existe em `/admin/categorias`. Só padronizar que, ao criar/editar jogo, o admin escolhe a categoria/campeonato e o sistema grava `game.championship = category.name` (ou só categoryId e exibe category.name em todo lugar).

**Vantagens**: pouca mudança de schema, reuso da home (já agrupa por categoria). **Desvantagens**: Category hoje é genérica (pode ser usada para “Pré-estreia”, “Replay” etc.); misturar “campeonato” com “categoria de exibição” pode confundir. Além disso, um jogo hoje pode ter categoryId para a home e um texto `championship` diferente.

### Opção C – Híbrido (Championship + Category)

- **Championship**: entidade nova para “campeonato” (nome, ano, logo, etc.).
- **Game**: `championshipId` (FK para Championship) e mantém `categoryId` (Category) para **agrupamento na home**.
- Assim: “campeonato” = competição (Championship); “categoria” = gaveta de exibição (Category). Um campeonato pode ser exibido em uma ou mais categorias; na prática, ao criar o jogo o admin escolhe campeonato e, se quiser, categoria para a home.
- **Admin**: seção Campeonatos (CRUD) + em Jogos dois selects (Campeonato e Categoria).

**Vantagens**: separação clara entre competição e organização da grade. **Desvantagem**: mais um conceito e mais um campo no formulário de jogo.

---

## 4. Recomendações

- **Curto prazo (MVP da área de campeonatos)**: **Opção A** – nova entidade **Championship**, Game com **championshipId** opcional e manutenção do texto **championship** como fallback.
- **Integração**:
  - Admin: novo menu “Campeonatos” (listar, criar, editar, excluir). Em “Jogos” (novo/editar), dropdown de campeonatos ativos; ao salvar, preencher `championshipId` e, por migração, copiar `Championship.name` para `championship` até tudo usar a FK.
  - Exibição (resultados, súmula, cards, /jogos): usar `game.championship?.name ?? game.championship` (ou equivalente) para não quebrar jogos antigos sem championshipId.
  - Home: manter agrupamento por **Category** como está; depois, opcionalmente, faixa “Por campeonato” baseada em Championship.
- **Opção B** só faz sentido se a equipe decidir que “categoria” e “campeonato” são sempre a mesma coisa e que não haverá categorias apenas de exibição (ex.: “Replay de live”).

---

## 5. Pontos de integração no código (para Opção A)

| Área | Arquivo(s) / contexto | Ajuste |
|------|------------------------|--------|
| Schema | `prisma/schema.prisma` | Model `Championship`; em `Game` adicionar `championshipId` (opcional) e relação. |
| Admin – Campeonatos | Novo: `/admin/campeonatos` (lista), `/admin/campeonatos/novo`, `/admin/campeonatos/[id]/editar` | CRUD completo; APIs `GET/POST /api/admin/championships`, `GET/PATCH/DELETE /api/admin/championships/[id]`. |
| Admin – Jogos | `jogos/novo`, `jogos/[id]/editar`, APIs de jogos | Dropdown de campeonatos; ao salvar, preencher `championshipId` e (se desejado) `championship` a partir do nome. |
| Admin – Súmulas | Lista de jogos | Pode continuar exibindo `game.championship` (string ou nome do campeonato). |
| Sidebar admin | `AdminSidebar.tsx` | Item “Campeonatos” (ex.: entre Jogos e Súmula). |
| Home | `page.tsx`, `getGames()` | Opcional: incluir Championship na query; faixa “Por campeonato” pode usar Championship. Por enquanto manter groupByChampionship por Category. |
| Página /jogos | `jogos/page.tsx`, `getFilterOptions()` | Filtro “Campeonato”: buscar de Championship + distinct de `championship` (jogos sem FK). |
| Resultados / detalhe / cards | `ResultadosList`, `MatchSummaryDropdown`, `resultados/page`, `jogo/[slug]` | Exibir `game.championship?.name ?? game.championship`. |
| APIs públicas | `GET /api/games`, `GET /api/resultados/[slug]/sumula`, etc. | Incluir no payload nome do campeonato (relation ou string). |

Nenhuma dessas alterações exige mudar o fluxo de times, súmulas, aprovações ou pagamentos; apenas enriquecer Game com uma FK e padronizar a exibição do nome do campeonato.

---

## 6. Migração de dados

- Jogos já cadastrados têm apenas `championship` (string). Duas abordagens:
  1. **Sem migração automática**: `championshipId` fica null; em todo lugar usar `game.championship?.name ?? game.championship`. Novos jogos passam a usar o dropdown e `championshipId`.
  2. **Migração por similaridade**: script que, para cada valor distinto de `championship`, cria um registro em Championship (name = valor, slug gerado) e atualiza os jogos com esse `championship` para o novo `championshipId`. Depois disso, o dropdown e a exibição usam a FK.

---

## 7. Resumo

- **Hoje**: “Campeonato” é texto livre em cada jogo; agrupamento na home é por **Category**.
- **Possibilidade**: Sim, é viável ter uma área para criar e administrar campeonatos e integrar ao sistema.
- **Recomendação**: Nova entidade **Championship** (Opção A), Game com **championshipId** opcional, manter string **championship** como fallback, nova seção no admin “Campeonatos” e dropdown em Jogos. Categorias continuam para organização da home; exibição de “campeonato” em resultados, súmula e catálogo passa a usar o campeonato vinculado quando existir.
- **Esforço**: schema + migração, CRUD de campeonatos no admin, ajustes em formulário de jogos e em todos os pontos que exibem o nome do campeonato (e, se desejado, filtro em /jogos e faixa na home).

Se quiser, o próximo passo pode ser um desenho de schema (campos exatos de Championship) e uma lista de tarefas por sprint (backend → admin → front público).
