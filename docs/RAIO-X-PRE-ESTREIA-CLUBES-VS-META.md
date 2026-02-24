# Raio-X: Pré-estreia Clubes vs Pré-estreia Meta

Documento minucioso do que existe em cada fluxo, onde estão as misturas e o que precisa ficar separado.

---

## 1. Camada de dados (Prisma)

| Aspecto | Situação |
|--------|----------|
| **Tabela de jogos** | Uma só: `PreSaleGame`. Os dois fluxos usam o mesmo modelo; a distinção é o campo `metaEnabled` (true = Meta, false = Clubes). |
| **Categorias** | `PreSaleCategory` tem `scope` (CLUB \| META). Categorias estão separadas por fluxo. |
| **Slots de clube** | `PreSaleClubSlot` existe só para jogos Clubes (financiamento por clubes). Jogos Meta não têm slots. |

Conclusão: no banco, **jogos estão juntos** na mesma tabela; a separação é lógica (`metaEnabled`). Qualquer lista ou API que não filtre por `metaEnabled` mistura os dois fluxos.

---

## 2. API GET /api/admin/pre-sale-games

- **Comportamento:** `findMany()` **sem** `where` por `metaEnabled`.
- **Retorno:** todos os jogos (Clubes + Meta).
- **Problema:** Quem consome essa API precisa filtrar no cliente (ou a API deveria aceitar query `?scope=CLUB|META` e filtrar no servidor).

---

## 3. Lista Pré-estreia Clubes (`/admin/pre-estreia`)

| Item | Situação |
|------|----------|
| **Fonte de dados** | GET /api/admin/pre-sale-games (todos os jogos). |
| **Filtro no front** | **Nenhum.** `setGames(Array.isArray(data) ? data : [])` — usa a lista inteira. |
| **Efeito** | Jogos **Meta** aparecem na lista de Clubes. |
| **Deletar** | Botão existe; chama DELETE /api/admin/pre-sale-games/[id]. Deleta o jogo no banco (seja Clubes ou Meta). Por isso ao “deletar” na tela Clubes o usuário apagou o jogo Meta. |
| **Ver / Editar** | Links para `/admin/pre-estreia/${g.id}` e `/admin/pre-estreia/${g.id}/editar` (rotas Clubes). |

**Erro crítico:** a lista de Clubes **tem que** filtrar `metaEnabled !== true` (ou `metaEnabled === false`), senão Clubes e Meta ficam misturados e o delete em Clubes afeta jogo Meta.

---

## 4. Lista Pré-estreia Meta (`/admin/pre-estreia-meta`)

| Item | Situação |
|------|----------|
| **Fonte de dados** | Mesmo GET /api/admin/pre-sale-games. |
| **Filtro no front** | `list.filter((g) => g.metaEnabled === true)` — correto, só Meta. |
| **Deletar** | **Não tem** botão Deletar. |
| **Ver / Editar** | Links para `/admin/pre-estreia/${g.id}` e `/admin/pre-estreia/${g.id}/editar` — ou seja, **rotas de Clubes**. Ao clicar, a URL vira `/admin/pre-estreia/...` e o menu lateral destaca “Pré-estreia Clubes”. |

Problemas: (1) Meta não tem como deletar na própria tela; (2) Ver/Editar levam ao fluxo Clubes (mesmo conteúdo, mas menu e “Voltar” errados).

---

## 5. Páginas de detalhe (Ver) e edição (Editar)

| Rota | Existe? | Observação |
|------|---------|------------|
| `/admin/pre-estreia/[id]` (Ver) | Sim | Pensada para Clubes: slots A/B, “Gerar códigos”, “Recalcular status”. Para jogo Meta não faz sentido (não tem slots). |
| `/admin/pre-estreia/[id]/editar` | Sim | Única tela de edição; trata `game.metaEnabled` (mostra campos Meta ou Clubes). “Voltar” e redirect após salvar vão para `/admin/pre-estreia` (Clubes). |
| `/admin/pre-estreia-meta/[id]` (Ver) | **Não** | — |
| `/admin/pre-estreia-meta/[id]/editar` | **Não** | — |

Ou seja: **só existem rotas sob `pre-estreia/`**. Tudo (Clubes e Meta) usa a mesma URL de Ver/Editar, o que mistura os fluxos no menu e na navegação.

---

## 6. Dashboard (`/admin`)

| Item | Situação |
|------|----------|
| **API** | GET /api/admin/dashboard. Pré-estreias: `findMany({ where: { status: ['PRE_SALE','FUNDED'] } })` — **sem** filtro por `metaEnabled`. |
| **Tabela “Pré-estreias em andamento”** | Mostra **todos** (Clubes + Meta). Colunas “Financiado” (funded/2) e “Total” vêm de `clubSlots`; para Meta = 0. |
| **Links** | “Editar” e “Publicar” apontam para `/admin/pre-estreia/${r.id}` e `/admin/pre-estreia/${r.id}/editar` — sempre fluxo Clubes. |

Dashboard também mistura os dois e direciona tudo para o fluxo Clubes.

---

## 7. Criação (Novo jogo)

| Fluxo | Rota | POST | metaEnabled | Redirect após criar |
|-------|------|------|-------------|---------------------|
| Clubes | /admin/pre-estreia/novo | /api/admin/pre-sale-games | false | /admin/pre-estreia/${id} |
| Meta | /admin/pre-estreia-meta/novo | /api/admin/pre-sale-games | true | /admin/pre-estreia-meta |

Categorias: Clubes usa `scope=CLUB`, Meta usa `scope=META`. Criação está separada corretamente.

---

## 8. Categorias

- **Clubes:** `/admin/pre-estreia/categorias` — GET/POST categorias com `scope=CLUB`.
- **Meta:** `/admin/pre-estreia-meta/categorias` — `scope=META`.
- Separado corretamente.

---

## 9. Banner (Hero)

- Páginas novo/editar banner carregam lista de pré-estreias com GET /api/admin/pre-sale-games (todos). Dropdown pode misturar Clubes e Meta; depende se faz sentido filtrar por fluxo (ex.: só Clubes ou só Meta para banner).

---

## 10. Home (público)

- `getPreSaleForClubs()`: `where: { metaEnabled: false }` — só Clubes.
- `getPreSaleWithMeta()`: `where: { metaEnabled: true }` — só Meta.
- Blocos na home usam cada um sua lista. Aqui a separação está correta.

---

## Resumo: onde está a mistura e o que corrigir

1. **Lista Clubes** — Não filtra por `metaEnabled`. Mostra jogos Meta e o delete em Clubes apaga jogo Meta.  
   **Correção:** na lista Clubes, usar só jogos com `metaEnabled !== true` (ou `!g.metaEnabled`).

2. **Lista Meta** — Ver/Editar usam rotas de Clubes; não há rotas próprias Meta nem botão Deletar.  
   **Correção:** (a) filtro na lista Clubes (acima); (b) criar rotas Meta para Ver e Editar (`/admin/pre-estreia-meta/[id]`, `/admin/pre-estreia-meta/[id]/editar`) e apontar os links da lista Meta para elas; (c) adicionar botão Deletar na lista Meta chamando o mesmo DELETE da API.

3. **Dashboard** — Pré-estreias em andamento misturam Clubes e Meta e todos os links vão para Clubes.  
   **Correção (recomendada):** na API do dashboard, filtrar pré-estreias por `metaEnabled: false` para a tabela “Pré-estreias em andamento” (só Clubes), ou exibir duas tabelas (Clubes e Meta) com links para o fluxo correto.

4. **Uma única tabela PreSaleGame** — É uma decisão de modelo: um registro com `metaEnabled` true/false. A separação deve ser **sempre** nas listas, filtros e rotas (Clubes vs Meta), não no banco.

---

## Checklist pós-correção

- [ ] Lista Clubes: exibir apenas jogos com `metaEnabled !== true`.
- [ ] Lista Meta: links Ver/Editar para `/admin/pre-estreia-meta/[id]` e `/admin/pre-estreia-meta/[id]/editar`.
- [ ] Lista Meta: botão Deletar com confirmação e DELETE /api/admin/pre-sale-games/[id].
- [ ] Criar página Ver Meta: `/admin/pre-estreia-meta/[id]` (conteúdo adequado a Meta: times, meta extra, progresso; sem slots de clube).
- [ ] Criar página Editar Meta: `/admin/pre-estreia-meta/[id]/editar` (ou reutilizar componente com “Voltar” e redirect para `/admin/pre-estreia-meta`).
- [ ] Dashboard: filtrar “Pré-estreias em andamento” por `metaEnabled: false` e manter links para `/admin/pre-estreia/...`, ou separar em duas tabelas com links para cada fluxo.
